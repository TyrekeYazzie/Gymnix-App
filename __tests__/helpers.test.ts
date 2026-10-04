import { logDay, canLogOnDay, logTimestamp } from '@/utils/logDay';
import { displayName } from '@/lib/friends';

// friends.ts imports the Supabase client, which needs real env vars; these
// tests only touch its pure helpers.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('logDay', () => {
  it('covers the whole local day of an older entry and labels it with the date', () => {
    const day = logDay(new Date(2025, 2, 3, 21, 45).toISOString());
    expect(day.start).toEqual(new Date(2025, 2, 3));
    expect(day.end).toEqual(new Date(2025, 2, 4));
    expect(day.label).toBe('Mar 3');
  });

  it('is labelled Today for today or no entry', () => {
    expect(logDay().label).toBe('Today');
    expect(logDay(new Date().toISOString()).label).toBe('Today');
  });
});

describe('displayName', () => {
  it('prefers the real name, then @username, then the fallback', () => {
    expect(displayName({ full_name: 'Ana', username: 'ana_lifts' })).toBe('Ana');
    expect(displayName({ full_name: null, username: 'ana_lifts' })).toBe('@ana_lifts');
    expect(displayName({ full_name: null, username: null })).toBe('Anonymous');
  });
});

describe('adding logs for past days', () => {
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d; };

  it('allows today and up to 7 days back, not older or future days', () => {
    expect(canLogOnDay(daysAgo(0))).toBe(true);
    expect(canLogOnDay(daysAgo(1))).toBe(true);
    expect(canLogOnDay(daysAgo(7))).toBe(true);
    expect(canLogOnDay(daysAgo(8))).toBe(false);
    expect(canLogOnDay(daysAgo(-1))).toBe(false);
  });

  it('stamps the chosen day at the current time of day, never in the future', () => {
    expect(logTimestamp(null)).toBeUndefined();
    const now = Date.now();
    const yesterday = new Date(logTimestamp(daysAgo(1))!);
    expect(yesterday.toDateString()).toBe(daysAgo(1).toDateString());
    expect(Math.abs(now - 86400000 - yesterday.getTime())).toBeLessThan(2 * 3600000); // DST can shift it an hour
    expect(new Date(logTimestamp(daysAgo(0))!).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
