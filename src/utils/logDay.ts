// The day a log sheet's progress card covers: the entry's own day when an
// older log is opened from the Calendar, otherwise today (device time).
export function logDay(createdAt?: string | null): { start: Date; end: Date; label: string } {
  const start = createdAt ? new Date(createdAt) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const isToday = start.toDateString() === new Date().toDateString();
  const label = isToday ? 'Today' : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { start, end, label };
}

// How far back the Calendar lets you add a log. The database enforces the
// same window (supabase/migrations/20261004010000_log_date_window.sql).
export const MAX_BACKDATE_DAYS = 7;

/** Whether a new log can be added on this day: today or up to 7 days back. */
export function canLogOnDay(day: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - MAX_BACKDATE_DAYS);
  return start >= earliest && start <= today;
}

/**
 * created_at for a log added on a chosen day: that day at the current time
 * of day, and never later than now. Undefined (the database uses now) when
 * no day was chosen.
 */
export function logTimestamp(day?: Date | null): string | undefined {
  if (!day) return undefined;
  const now = new Date();
  const at = new Date(day);
  at.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return (at > now ? now : at).toISOString();
}
