import type { Sfx } from '../core/ctx';
import { prefs } from './i18n';

let ac: AudioContext | null = null;
let last = 0;

const SEQ: Record<Sfx, [number, number, number][]> = {
  click: [[880, 0.035, 0.04]],
  buy: [[523, 0.06, 0.1], [784, 0.09, 0.1]],
  goal: [[523, 0.08, 0.12], [659, 0.08, 0.12], [784, 0.16, 0.12]],
  alert: [[330, 0.12, 0.12], [262, 0.18, 0.12]],
  fail: [[300, 0.12, 0.12], [180, 0.25, 0.12]],
};

/** Short WebAudio blips, no audio files. */
export function play(k: Sfx) {
  if (prefs.value.mute) return;
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    ac ??= new (W.AudioContext ?? W.webkitAudioContext!)();
    if (ac.state === 'suspended') void ac.resume();
    const now = performance.now();
    if (k === 'click' && now - last < 70) return;
    last = now;
    let t0 = ac.currentTime;
    for (const [f, d, v] of SEQ[k]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + d + 0.03);
      t0 += d;
    }
  } catch { /* missing audio must not break the game */ }
}
