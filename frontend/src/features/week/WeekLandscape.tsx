import { useEffect, useMemo, useState } from "react";

import type { StudySession } from "../../api/types";

function time(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

export function getWeekDays(sessions: StudySession[]) {
  const keys = [...new Set(sessions.map((session) => session.start.slice(0, 10)))].sort();
  if (keys.length < 2) return keys;
  const start = dateFromKey(keys[0]);
  const end = dateFromKey(keys[keys.length - 1]);
  const days: string[] = [];
  for (let cursor = start; cursor <= end && days.length < 14; cursor = new Date(cursor.getTime() + 86_400_000)) {
    days.push(cursor.toISOString().slice(0, 10));
  }
  return [...new Set([...days, ...keys])].sort();
}

function isoWeek(date: Date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

export function getWeekSummary(sessions: StudySession[]) {
  const days = getWeekDays(sessions);
  if (!days.length) return { label: "Plan preview", range: "No sessions staged" };
  const start = dateFromKey(days[0]);
  const end = dateFromKey(days[days.length - 1]);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const month = new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" }).format(start);
  const range = sameMonth
    ? `${month} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`
    : `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(start)}–${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(end)}`;
  return { label: `Week ${isoWeek(start)}`, range };
}

export function WeekLandscape({ sessions }: { sessions: StudySession[] }) {
  const days = useMemo(() => getWeekDays(sessions), [sessions]);
  const summary = useMemo(() => getWeekSummary(sessions), [sessions]);
  const [selectedDay, setSelectedDay] = useState(days[0] || "");
  useEffect(() => {
    if (!days.includes(selectedDay)) setSelectedDay(days[0] || "");
  }, [days, selectedDay]);
  const courses = useMemo(() => [...new Set(sessions.map((session) => session.course))].sort(), [sessions]);
  const byDay = useMemo(
    () => Object.fromEntries(days.map((day) => [day, sessions.filter((session) => session.start.startsWith(day))])),
    [days, sessions],
  );
  if (!days.length) return <section className="week-landscape empty-week"><h2>No sessions staged</h2><p>Adjust the source material or availability, then rebuild the plan.</p></section>;
  return (
    <section className="week-landscape" aria-label="Weekly study plan">
      <header>
        <div><span>{summary.label}</span><h2>{summary.range}</h2></div>
        <strong>{sessions.length} sessions staged</strong>
      </header>
      <label className="day-selector">
        <span>Study day</span>
        <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
          {days.map((day) => <option value={day} key={day}>{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(dateFromKey(day))}</option>)}
        </select>
      </label>
      <div className="week-grid">
        {days.map((day) => (
          <section className={`day-column ${selectedDay === day ? "active" : ""}`} key={day}>
            <header><strong>{new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(dateFromKey(day))}</strong><span>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(dateFromKey(day))}</span></header>
            <div className="day-rule" aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="session-stack">
              {byDay[day].map((session) => (
                <article className={`session-block course-${courses.indexOf(session.course) % 4} ${session.status}`} key={session.id}>
                  <time>{time(session.start)}–{time(session.end)}</time>
                  <strong>{session.course}</strong>
                  <span>{session.title}</span>
                  {session.status === "rescheduled" && <small>Rescheduled</small>}
                </article>
              ))}
              {byDay[day].length === 0 && <p className="open-time">Protected or open time</p>}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
