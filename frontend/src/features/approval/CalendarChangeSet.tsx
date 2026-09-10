import { useState } from "react";
import type { StudyPlan } from "../../api/types";
import { CalendarIcon, CheckIcon } from "../../ui/Icons";

interface Props {
  plan: StudyPlan;
  busy: boolean;
  replanned: boolean;
  onDecision: (choice: "approved" | "rejected") => void;
  onMissed: (sessionId: string) => void;
}

export function CalendarChangeSet({ plan, busy, replanned, onDecision, onMissed }: Props) {
  const [selectedSession, setSelectedSession] = useState("");
  const target = plan.sessions.find(session => session.id === selectedSession);
  if (plan.status === "approved") {
    return (
      <section className="calendar-result" aria-live="polite">
        <CheckIcon />
        <div><h2>{plan.sessions.length} calendar events added</h2><p>Saved to the local calendar. Use Download calendar to import the sessions into your calendar app.</p></div>
        <div className="missed-session-control"><label htmlFor="missed-session">Missed a study session?</label><select id="missed-session" value={selectedSession} onChange={event => setSelectedSession(event.target.value)} disabled={busy}><option value="">Choose the session to move</option>{[...plan.sessions].sort((a, b) => a.start.localeCompare(b.start)).map(session => <option key={session.id} value={session.id}>{new Date(session.start).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {session.title}</option>)}</select>
        {target && <p>Move <strong>{target.title}</strong> to the next available time before its deadline. Other sessions stay in place.</p>}
        <button type="button" onClick={() => target && onMissed(target.id)} disabled={busy || !target}>{busy ? "Finding another time…" : "Move selected session"}</button></div>
        {replanned && <strong className="replan-note">1 session rebalanced</strong>}
      </section>
    );
  }
  if (plan.status === "rejected") {
    return <section className="calendar-result rejected"><h2>Plan rejected</h2><p>No calendar events were written.</p></section>;
  }
  return (
    <section className="calendar-gate">
      <CalendarIcon />
      <div><span>Review &amp; approve plan</span><h2>Add this week to your calendar?</h2><p>StudyPilot will save {plan.sessions.length} local calendar events after approval. Each plan adds separate events; existing calendar events are not replaced. No external calendar is connected.</p></div>
      <div className="calendar-actions">
        <button type="button" className="secondary-action" onClick={() => onDecision("rejected")} disabled={busy}>Reject</button>
        <button type="button" className="primary-action" onClick={() => onDecision("approved")} disabled={busy || plan.sessions.length === 0}>{busy ? "Saving decision…" : `Add ${plan.sessions.length} sessions to calendar`}</button>
      </div>
    </section>
  );
}
