import { DayOfWeek } from '@/types';

// JS Date#getDay() is 0 = Sunday
const DAY_KEYS: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const getTodayKey = (): DayOfWeek => DAY_KEYS[new Date().getDay()];

// Tolerates legacy single-string values saved before a day could hold multiple categories.
export const toDayCategories = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
};
