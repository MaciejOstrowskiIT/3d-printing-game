"""Preview videos for portals, recorded from the real build in headless Chromium.

CrazyGames: 15-20 s, no sound, no fast-forward, the cover as the opening frame,
landscape 1920x1080 and portrait 1080x1620.

    npm run build && npx vite-node promo/snapshots.ts
    python3 promo/video.py             # -> promo/out/video-landscape.mp4, video-portrait.mp4
"""
import base64, pathlib, re, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from render import OUT, ROOT, cover, open_game, serve, vite_dev  # noqa: E402

COVER_SECONDS = 1.5
FPS = 30


class Recorder:
    """Collects screencast frames (JPEG + timestamp) from Chrome DevTools while the page plays in real time."""

    def __init__(self, page, width: int, height: int, folder: pathlib.Path):
        self.frames: list[tuple[float, pathlib.Path]] = []
        self.folder = folder
        self.cdp = page.context.new_cdp_session(page)
        self.cdp.on('Page.screencastFrame', self._frame)
        self.cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 92, 'maxWidth': width, 'maxHeight': height})

    def _frame(self, ev):
        path = self.folder / f'{len(self.frames):05d}.jpg'
        path.write_bytes(base64.b64decode(ev['data']))
        self.frames.append((ev['metadata']['timestamp'], path))
        try:
            self.cdp.send('Page.screencastFrameAck', {'sessionId': ev['sessionId']})
        except Exception:
            pass  # a late frame can arrive after the page has closed

    def stop(self):
        self.cdp.send('Page.stopScreencast')


def tap(page, selector: str):
    """Clicks only if the element is there and enabled, so a script never stalls on a disabled button."""
    el = page.locator(selector).first
    if el.count() and el.is_visible() and el.is_enabled():
        el.click(timeout=1000)


def buy(page, name: str):
    """Clicks the buy button of a shop item if it is affordable."""
    btn = page.locator('.item', has=page.locator('b', has_text=re.compile(f'^{name}'))).locator('button.buy.ok').first
    if btn.count():
        btn.click()


def play(page, seconds: float, print_btn: str, every=0.18, actions=None):
    """Clicks the print button like a player would, with shop actions at given times (seconds into the clip)."""
    actions = dict(actions or {})
    start = time.monotonic()
    while (t := time.monotonic() - start) < seconds:
        for at in [a for a in actions if a <= t]:
            actions.pop(at)(page)
        tap(page, print_btn)
        page.wait_for_timeout(every * 1000)


def segments(print_btn: str, tab_click=None):
    """Three short clips at real speed: garage, factory floor, asteroid belt."""
    return [
        ('garage', {'zl': 900, 'fil': 4000}, 6.0, lambda p: play(p, 6.0, print_btn, actions={
            1.0: lambda p: buy(p, 'Auto printer'), 2.2: lambda p: buy(p, 'Auto printer'),
            3.4: lambda p: buy(p, 'Auto printer'), 4.6: lambda p: buy(p, 'Auto printer')})),
        ('factory', {'zl': 160000, 'col': 3}, 5.5, lambda p: play(p, 5.5, print_btn, actions={
            1.0: lambda p: tap(p, '.colors button:nth-of-type(3)'), 2.5: lambda p: buy(p, 'Printer farm')})),
        ('space', {}, 4.5, lambda p: play(p, 4.5, '.no-print', actions={
            0.8: lambda p: buy(p, 'Mining drone'), 2.2: lambda p: buy(p, 'Mining drone')})),
    ]


def record(browser, base: str, layout: dict, work: pathlib.Path):
    """Records all segments for one layout; returns [(timestamp, frame)] lists, one per segment."""
    clips = []
    for state, patch, seconds, script in segments(layout['print']):
        ctx, page = open_game(browser, base, state, size=layout['viewport'], scale=layout['scale'], patch=patch)
        page.wait_for_timeout(700)  # title screen fade
        folder = work / f'{layout["name"]}-{state}'
        folder.mkdir()
        rec = Recorder(page, *layout['size'], folder)
        script(page)
        rec.stop()
        ctx.close()
        clips.append((rec.frames, seconds))
    return clips


def encode(cover_png: pathlib.Path, clips, size, out: pathlib.Path, work: pathlib.Path):
    """Cover still, then the gameplay frames with their real durations, joined into one H.264 file.
    The cover is a separate input of the concat filter, so a size or pixel-format change cannot drop it."""
    lines = []
    for frames, seconds in clips:
        if not frames:
            continue
        t0 = frames[0][0]
        frames = [f for f in frames if f[0] < t0 + seconds]  # real time only: trim, never speed up
        for i, (ts, path) in enumerate(frames):
            end = frames[i + 1][0] if i + 1 < len(frames) else t0 + seconds
            lines += [f"file '{path}'", f'duration {max(end - ts, 0.001):.4f}']
    lines.append(lines[-2])  # concat demuxer needs the last file repeated
    listfile = work / f'{out.stem}.txt'
    listfile.write_text('\n'.join(lines) + '\n')
    w, h = size
    fit = f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=#1e2128,fps={FPS},format=yuv420p,setsar=1'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error',
                    '-loop', '1', '-t', str(COVER_SECONDS), '-i', str(cover_png),
                    '-f', 'concat', '-safe', '0', '-i', str(listfile),
                    '-filter_complex', f'[0:v]{fit}[c];[1:v]{fit}[g];[c][g]concat=n=2:v=1:a=0[v]', '-map', '[v]',
                    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart', str(out)], check=True)


LAYOUTS = [
    {'name': 'landscape', 'viewport': (1600, 900), 'scale': 1.2, 'size': (1920, 1080), 'print': '.side .pbtn', 'cover': 'landscape', 'cover_scale': 1.0},
    {'name': 'portrait', 'viewport': (480, 720), 'scale': 2.25, 'size': (1080, 1620), 'print': '.dock .pbtn', 'cover': 'portrait', 'cover_scale': 1.35},
]


def main():
    OUT.mkdir(exist_ok=True)
    game = serve(ROOT / 'dist')
    work = pathlib.Path(tempfile.mkdtemp(prefix='promo-video-'))
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            proc, dev = vite_dev()
            try:
                for lay in LAYOUTS:
                    cover(browser, dev, lay['cover'], scale=lay['cover_scale'], out=work / f'cover-{lay["name"]}.png')
            finally:
                proc.kill()
            for lay in LAYOUTS:
                # Headless screencast frames come at CSS-pixel size unless the device scale is forced at launch.
                rec_browser = p.chromium.launch(args=[f'--force-device-scale-factor={lay["scale"]}'])
                clips = record(rec_browser, game, lay, work)
                rec_browser.close()
                encode(work / f'cover-{lay["name"]}.png', clips, lay['size'], OUT / f'video-{lay["name"]}.mp4', work)
            browser.close()
    finally:
        shutil.rmtree(work, ignore_errors=True)
    print('written to', OUT)


if __name__ == '__main__':
    sys.exit(main())
