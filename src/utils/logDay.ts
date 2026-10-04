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
