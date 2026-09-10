import type { PlanRequest } from "../../api/types";

export function availableMinutes(windows: PlanRequest["availability"], protectedTime: PlanRequest["protected"]): number {
  const segments = windows.flatMap(window => {
    const start = new Date(window.start).getTime();
    const end = new Date(window.end).getTime();
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
    const start = new Date(blocked.start).getTime();
    const end = new Date(blocked.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    available = available.flatMap(([from, until]) => {
      if (end <= from || start >= until) return [[from, until]];
      return [[from, Math.max(from, start)], [Math.min(until, end), until]].filter(([a, b]) => b > a);
    });
  }
  return Math.floor(available.reduce((total, [start, end]) => total + end - start, 0) / 60_000);
}

export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours}h` : "", remainder || !hours ? `${remainder}m` : ""].filter(Boolean).join(" ");
}
