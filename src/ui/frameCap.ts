/** Frame cap shared by the scene and the counters. Every changed frame makes the browser restyle, lay out and repaint
 *  the page, so the decorative animations draw at most ANIM_FPS times a second, and all on the same time slots: their
 *  updates land in the same display frames instead of each adding frames of its own. */
export const ANIM_FPS = 20;

const SLOT_MS = 1000 / ANIM_FPS;

/** Returns a gate for a requestAnimationFrame loop: true when `now` starts a new slot since the last true. */
export function frameGate(): (now: number) => boolean {
  let last = -1;
  return now => {
    const slot = Math.floor(now / SLOT_MS);
    if (slot === last) return false;
    last = slot;
    return true;
  };
}
