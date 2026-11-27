/** Throttled screen-reader announcements. The game can log several lines a second; a polite live region that changed
 *  on every one would talk without a pause. This batches what arrives: the first message goes out at once, the ones
 *  after it wait until `interval` ms have passed since the last announcement and then go out together (only the newest
 *  `max`, older ones are dropped: the log itself still lists them). Pure timer logic, no DOM. */
export interface Announcer { push(text: string): void; dispose(): void }

export function createAnnouncer(say: (text: string) => void, { interval = 4000, max = 2, now = () => Date.now() } = {}): Announcer {
  let queue: string[] = [];
  let last = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    if (!queue.length) return;
    last = now();
    say(queue.slice(-max).join(' '));
    queue = [];
  };
  return {
    push(text) {
      if (!text) return;
      queue.push(text);
      if (timer !== undefined) return;
      const wait = last + interval - now();
      if (wait <= 0) flush();
      else timer = setTimeout(flush, wait);
    },
    dispose() { clearTimeout(timer); timer = undefined; queue = []; },
  };
}
