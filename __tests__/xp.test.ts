import { calcLevel, xpForLevel, xpProgress } from '@/lib/xp';

describe('levels', () => {
  it('follows level = floor(sqrt(xp / 100))', () => {
    expect(calcLevel(0)).toBe(0);
    expect(calcLevel(99)).toBe(0);
    expect(calcLevel(100)).toBe(1);
    expect(calcLevel(399)).toBe(1);
    expect(calcLevel(400)).toBe(2);
    expect(calcLevel(12345)).toBe(11);
  });

  it('xpForLevel is the inverse at level boundaries', () => {
    for (let level = 0; level <= 50; level++) {
      expect(calcLevel(xpForLevel(level))).toBe(level);
      if (level > 0) expect(calcLevel(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it('treats negative or invalid XP as 0 instead of NaN', () => {
    for (const bad of [-50, NaN, Infinity, -Infinity]) {
      expect(calcLevel(bad)).toBe(0);
      expect(xpProgress(bad)).toEqual({ level: 0, current: 0, needed: 100, percent: 0 });
    }
  });

  it('reports progress within the current level', () => {
    expect(xpProgress(150)).toEqual({ level: 1, current: 50, needed: 300, percent: 17 });
  });
});
