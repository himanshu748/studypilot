import { useState } from "react";
import type { StudyPlan } from "../../api/types";
import { getWeekSummary } from "../week/WeekLandscape";

function creationLabel(plan: StudyPlan): string {
  const value = plan.events[0]?.created_at;
  if (!value || Number.isNaN(new Date(value).getTime())) return `Plan ${plan.id.slice(-8)}`;
  return `Created ${new Date(value).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
}

export function SavedPlans({ plans, onOpen, onClose }: { plans: StudyPlan[]; onOpen: (plan: StudyPlan) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const matching = plans.filter(plan => (status === "all" || plan.status === status) &&
    plan.items.some(item => `${item.course} ${item.title}`.toLowerCase().includes(query.trim().toLowerCase())));
  return <section className="saved-records" aria-labelledby="saved-title">
    <header><div><h2 id="saved-title">Your saved plans</h2><p>Reopen a plan to review sessions, make a calendar decision or revise its inputs as a separate copy.</p></div><button type="button" onClick={onClose}>Close saved plans</button></header>
    {plans.length ? <><div className="saved-filters"><label>Search coursework<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Course or task name" /></label><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All plans</option><option value="waiting_for_approval">Needs review</option><option value="approved">In local calendar</option><option value="rejected">Rejected</option></select></label></div>
      <p className="result-count" role="status">{matching.length} of {plans.length} recent plans</p>
      <ul>{matching.map(plan => <li key={plan.id}><button type="button" onClick={() => onOpen(plan)}><strong>{[...new Set(plan.items.map(item => item.course))].join(" · ") || "Study plan"}</strong><span>{getWeekSummary(plan.sessions).range} · {plan.sessions.length} sessions<br />{creationLabel(plan)}</span><small>{plan.status === "waiting_for_approval" ? "Needs review" : plan.status === "approved" ? "In local calendar" : "Rejected"}</small></button></li>)}</ul>
      {!matching.length && <p>No plans match these filters. Try another course or choose All plans.</p>}</> : <p>No saved plans yet. Create your first plan below.</p>}
  </section>;
}
