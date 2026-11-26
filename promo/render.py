"""Renders portal assets with headless Chromium (pip install playwright && playwright install chromium).

    npm run build && npx vite-node promo/snapshots.ts
    python3 promo/render.py            # screenshots + covers into promo/out/
"""
import functools, http.server, json, pathlib, subprocess, sys, threading, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'promo' / 'out'
STATES = ROOT / 'promo' / 'states'


def serve(directory: pathlib.Path) -> str:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    handler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{srv.server_port}'


def open_game(browser, base: str, state: str, lang='en', size=(1600, 900), scale=1.2, patch=None):
    """Opens the real build with a saved state loaded (and optional field overrides), past the title screen."""
    ctx = browser.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=scale)
    save = json.loads((STATES / f'{state}.json').read_text())
    save.update(patch or {})
    save['ts'] = 0  # no offline catch-up
    prefs = json.dumps({'lang': lang, 'mute': True})
    ctx.add_init_script(f"""
      if (!sessionStorage.getItem('seeded')) {{
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('drukarnia-v3', {json.dumps(json.dumps(save))});
        localStorage.setItem('drukarnia-pref', {json.dumps(prefs)});
        localStorage.setItem('drukarnia-notrack', '1');
      }}""")
    page = ctx.new_page()
    page.goto(base + '/index.html')
    page.wait_for_timeout(600)
    page.click('.title-actions .pbtn')
    return ctx, page


def screenshot(browser, base: str, state: str, name: str, click=None, **kw):
    """Captures the game screen for a saved state."""
    ctx, page = open_game(browser, base, state, **kw)
    if click:
        page.click(click)
    page.wait_for_timeout(2500)  # let the printer and room animations settle
    page.screenshot(path=str(OUT / f'{name}.png'))
    ctx.close()


COVERS = ['landscape', 'portrait', 'square', 'poki', 'icon512']


def vite_dev(port=5199):
    """Starts the Vite dev server for promo/covers.html (it imports the game's scene modules)."""
    proc = subprocess.Popen(['npx', 'vite', '--port', str(port), '--strictPort'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            urllib.request.urlopen(f'http://localhost:{port}/promo/covers.html', timeout=1)
            return proc, f'http://localhost:{port}'
        except OSError:
            time.sleep(0.5)
    proc.kill()
    raise RuntimeError('vite dev server did not start')


def cover(browser, base: str, name: str, scale=1.0, out=None):
    page = browser.new_page(viewport={'width': 400, 'height': 400}, device_scale_factor=scale)
    page.goto(f'{base}/promo/covers.html?c={name}')
    page.wait_for_selector('body[data-ready]')
    page.wait_for_timeout(200)
    # Icons keep their transparent rounded corners.
    page.locator('#stage').screenshot(path=str(out or OUT / f'cover-{name}.png'), omit_background=name.startswith('icon'))
    page.close()


def main():
    OUT.mkdir(exist_ok=True)
    game = serve(ROOT / 'dist')
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for state in ['garage', 'workshop', 'factory', 'research', 'space']:
            screenshot(browser, game, state, f'screenshot-{state}')
        screenshot(browser, game, 'factory', 'screenshot-mobile', size=(390, 844), scale=3)
        proc, dev = vite_dev()
        try:
            for name in (sys.argv[1:] or COVERS):
                cover(browser, dev, name)
        finally:
            proc.kill()
        browser.close()
    print('written to', OUT)


if __name__ == '__main__':
    sys.exit(main())
