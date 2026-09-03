import type { StudyPlan } from "../../api/types";
import { CalendarIcon, CheckIcon } from "../../ui/Icons";

interface Props {
  plan: StudyPlan;
  busy: boolean;
  replanned: boolean;
  onDecision: (choice: "approved" | "rejected") => void;
  onMissed: () => void;
}

export function CalendarChangeSet({ plan, busy, replanned, onDecision, onMissed }: Props) {
  if (plan.status === "approved") {
    return (
      <section className="calendar-result" aria-live="polite">
        <CheckIcon />
        <div><h2>{plan.sessions.length} calendar events added</h2><p>The staged sessions are now in the local demo calendar.</p></div>
        <button type="button" onClick={onMissed} disabled={busy}>I missed the first session</button>
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
      <div><span>Review &amp; approve plan</span><h2>Add this week to your calendar?</h2><p>StudyPilot will write exactly {plan.sessions.length} local demo events after approval.</p></div>
      <div className="calendar-actions">
        <button type="button" className="secondary-action" onClick={() => onDecision("rejected")} disabled={busy}>Reject</button>
        <button type="button" className="primary-action" onClick={() => onDecision("approved")} disabled={busy}>Add {plan.sessions.length} sessions to calendar</button>
      </div>
    </section>
  );
}
