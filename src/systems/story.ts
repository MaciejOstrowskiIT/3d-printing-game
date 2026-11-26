import { STORY, STORY_MSG } from '../content/story';
import { log, sfx, type Ctx } from '../core/ctx';
import type { GameState } from '../core/state';

/** Story messages (content/story.ts): once a second, the first unseen message whose condition holds becomes the
 *  open message (a card the player dismisses) and goes into the log. One at a time, so they never pile up. */
export function storySystem(s: GameState, dt: number, ctx: Ctx) {
  if (ctx.offline || s.msg) return;
  s.msgT += dt;
  if (s.msgT < 1) return;
  s.msgT = 0;
  const next = STORY.find(m => !s.story.includes(m.id) && m.when(s));
  if (!next) return;
  s.story = [...s.story, next.id];
  s.msg = next.id;
  log(s, ctx, 'msgNew', '=' + next.id);
  ctx.emit({ type: 'story', id: next.id });
  sfx(ctx, 'alert');
}

export function dismissMessage(s: GameState): boolean {
  if (!s.msg) return false;
  s.msg = null;
  return true;
}

export function validStoryState(s: GameState): boolean {
  if (!Array.isArray(s.story) || !s.story.every(id => typeof id === 'string' && STORY_MSG[id])) return false;
  if (new Set(s.story).size !== s.story.length) return false;
  return s.msg === null || (typeof s.msg === 'string' && s.story.includes(s.msg));
}
