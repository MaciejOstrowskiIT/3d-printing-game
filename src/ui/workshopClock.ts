// A saved checkpoint can be advanced offline by time actually measured in this
// document. A fresh server sample supplies the missing interval across restarts.
export class WorkshopClock {
  private anchor: number;
  private sampledAt: number;

  constructor(checkpoint: number, now: number) {
    this.anchor = checkpoint;
    this.sampledAt = now;
  }

  checkpoint(now: number) {
    return this.anchor ? Math.max(0, this.anchor + now - this.sampledAt) : 0;
  }

  synchronize(serverTime: number, now: number) {
    const accounted = this.checkpoint(now);
    this.anchor = Math.max(accounted, serverTime);
    this.sampledAt = now;
    return accounted ? Math.max(0, serverTime - accounted) / 1000 : 0;
  }
}

/** Ask the host serving the game. A local HTML file stays fully playable. */
export async function serverTime(): Promise<number | null> {
  const url = new URL(location.href);
  if (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return null;
  url.hash = '';
  try {
    url.searchParams.set('_clock', crypto.randomUUID());
    const response = await fetch(url, {
      method: 'HEAD', mode: 'same-origin', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    const timestamp = Date.parse(response.headers.get('Date') ?? '');
    return response.ok && timestamp > 0 && !Number(response.headers.get('Age')) ? timestamp : null;
  } catch {
    return null;
  }
}
