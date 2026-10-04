import { logDay } from '@/utils/logDay';
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
