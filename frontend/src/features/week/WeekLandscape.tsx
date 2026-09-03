import { useMemo, useState } from "react";

import type { StudySession } from "../../api/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DATE_KEYS = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"];

function time(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function WeekLandscape({ sessions }: { sessions: StudySession[] }) {
  const [selectedDay, setSelectedDay] = useState(DATE_KEYS[0]);
  const byDay = useMemo(
    () => Object.fromEntries(DATE_KEYS.map((day) => [day, sessions.filter((session) => session.start.startsWith(day))])),
    [sessions],
  );
  return (
    <section className="week-landscape" aria-label="Weekly study plan">
      <header>
        <div><span>Week 37</span><h2>September 7–12, 2026</h2></div>
        <strong>{sessions.length} sessions staged</strong>
      </header>
      <label className="day-selector">
        <span>Study day</span>
        <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
          {DATE_KEYS.map((day, index) => <option value={day} key={day}>{DAY_LABELS[index]} · Sep {7 + index}</option>)}
        </select>
      </label>
      <div className="week-grid">
        {DATE_KEYS.map((day, index) => (
          <section className={`day-column ${selectedDay === day ? "active" : ""}`} key={day}>
            <header><strong>{DAY_LABELS[index]}</strong><span>Sep {7 + index}</span></header>
            <div className="day-rule" aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="session-stack">
              {byDay[day].map((session, sessionIndex) => (
                <article className={`session-block course-${(index + sessionIndex) % 4} ${session.status}`} key={session.id}>
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
