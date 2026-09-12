import type { PlanRequest } from "../../api/types";

// Match the scheduler's wall-clock calendar times, including across DST changes.
function calendarTime(value: string): number {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) ? Date.parse(`${value}Z`) : NaN;
}

export function availableMinutes(windows: PlanRequest["availability"], protectedTime: PlanRequest["protected"], before?: string): number {
  const deadline = before ? calendarTime(before) : Infinity;
  const segments = windows.flatMap(window => {
    const start = calendarTime(window.start);
    const end = Math.min(calendarTime(window.end), deadline);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    return [[start, end]];
  }).sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [];
  for (const [start, end] of segments) {
    const previous = merged[merged.length - 1];
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else merged.push([start, end]);
  }
  let available = merged;
  for (const blocked of protectedTime) {
    const start = calendarTime(blocked.start);
    const end = calendarTime(blocked.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    available = available.flatMap(([from, until]) => {
      if (end <= from || start >= until) return [[from, until]];
      return [[from, Math.max(from, start)], [Math.min(until, end), until]].filter(([a, b]) => b > a);
    });
  }
  return Math.floor(available.reduce((total, [start, end]) => total + end - start, 0) / 60_000);
}

export function deadlineBudgets(
  tasks: { due: string; effort: number; title: string; course: string }[],
  windows: PlanRequest["availability"],
  protectedTime: PlanRequest["protected"],
) {
  const confirmed = tasks.filter(task => task.course.trim() && task.title.trim() &&
    Number.isFinite(calendarTime(task.due)) && Number.isFinite(task.effort) && task.effort > 0)
    .sort((a, b) => calendarTime(a.due) - calendarTime(b.due));
  let needed = 0;
  return [...new Set(confirmed.map(task => task.due))].map(due => {
    const dueTasks = confirmed.filter(task => task.due === due);
    needed += dueTasks.reduce((sum, task) => sum + task.effort, 0);
    const available = availableMinutes(windows, protectedTime, due);
    return { due, titles: dueTasks.map(task => task.title), needed, available,
      shortfall: Math.max(0, needed - available) };
  });
}

export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours}h` : "", remainder || !hours ? `${remainder}m` : ""].filter(Boolean).join(" ");
}
