import { QUOTES, Quote } from '@/constants/quotes';

// QUOTES is grouped by author in the source file for readability/maintenance,
// which means walking it in order would show the same philosopher for weeks
// at a time. Shuffle it once, deterministically (fixed seed — not
// Math.random, so the order is identical on every device and every app
// restart), so consecutive days land on different traditions.
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  // Small mulberry32 PRNG — deterministic, good enough for a display shuffle.
  let s = seed;
  const next = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SHUFFLE_SEED = 20260101; // arbitrary fixed seed — never change, or everyone's "today" jumps around
const SHUFFLED_QUOTES = seededShuffle(QUOTES, SHUFFLE_SEED);

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diffMs = date.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // 1-indexed: Jan 1 = day 1
}

// Same quote for every user on a given calendar date (day-of-year indexed,
// not per-user), the way any "quote of the day" feature works. With 365
// entries this repeats only on a leap year's Dec 31st — not worth
// special-casing.
export function getQuoteOfDay(date: Date = new Date()): Quote {
  const index = (dayOfYear(date) - 1) % SHUFFLED_QUOTES.length;
  return SHUFFLED_QUOTES[index];
}
