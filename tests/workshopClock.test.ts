import { describe, expect, it } from 'vitest';
import { WorkshopClock } from '../src/ui/workshopClock';

describe('offline time accounting', () => {
  const epoch = 1_800_000_000_000;
  it('establishes a baseline for new and legacy saves without awarding elapsed phone time', () => {
    const clock = new WorkshopClock(0, 100);
    expect(clock.checkpoint(1100)).toBe(0);
    expect(clock.synchronize(epoch, 1100)).toBe(0);
    expect(clock.checkpoint(2100)).toBe(epoch + 1000);
  });

  it('credits only the server interval missed across offline sessions', () => {
    const first = new WorkshopClock(epoch, 0);
    const second = new WorkshopClock(first.checkpoint(2000), 0);
    expect(second.synchronize(epoch + 120_000, 3000)).toBe(115);
    expect(second.synchronize(epoch + 120_000, 3000)).toBe(0);
    expect(second.checkpoint(3100)).toBe(epoch + 120_100);
  });

  it('keeps a high-water mark for stale responses and saves at the last simulated tick', () => {
    const clock = new WorkshopClock(epoch, 0);
    expect(clock.synchronize(epoch - 30_000, 5000)).toBe(0);
    expect(clock.checkpoint(4800)).toBe(epoch + 4800);
    expect(clock.synchronize(epoch + 7000, 7000)).toBe(0);
  });
});
