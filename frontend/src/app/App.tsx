import { useEffect, useState } from "react";

import { createPlan, decidePlan, getDemoRequest, markMissed } from "../api/client";
import type { StudyPlan } from "../api/types";
import { CalendarChangeSet } from "../features/approval/CalendarChangeSet";
import { ConflictInbox } from "../features/conflicts/ConflictInbox";
import { ActivityTimeline } from "../features/run/ActivityTimeline";
import { SyllabusMargin } from "../features/syllabus/SyllabusMargin";
import { getWeekSummary, WeekLandscape } from "../features/week/WeekLandscape";
import { BookIcon, SparkIcon, ThemeIcon } from "../ui/Icons";
import { applyTheme, getInitialTheme, type Theme } from "../ui/theme";

type ViewState = "idle" | "loading" | "ready" | "busy" | "error";
type RetryIntent = { kind: "build" } | { kind: "decide"; choice: "approved" | "rejected" } | { kind: "missed" };

export function App() {
  const [state, setState] = useState<ViewState>("idle");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState("");
  const [replanned, setReplanned] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [retryIntent, setRetryIntent] = useState<RetryIntent | null>(null);
  const week = getWeekSummary(plan?.sessions || []);

  useEffect(() => applyTheme(theme), [theme]);

  async function buildWeek() {
    setState("loading");
    setError("");
    try {
      const request = await getDemoRequest();
      setPlan(await createPlan(request));
      setRetryIntent(null);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The week could not be built");
      setRetryIntent({ kind: "build" });
      setState("error");
    }
  }

  async function decide(choice: "approved" | "rejected") {
    if (!plan) return;
    setState("busy");
    setError("");
    try {
      setPlan(await decidePlan(plan, choice));
      setRetryIntent(null);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The calendar decision failed");
      setRetryIntent({ kind: "decide", choice });
      setState("error");
    }
  }

  async function missed() {
    if (!plan?.sessions[0]) return;
    setState("busy");
    setError("");
    try {
      setPlan(await markMissed(plan, plan.sessions[0].id));
      setReplanned(true);
      setRetryIntent(null);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The missed session could not be moved");
      setRetryIntent({ kind: "missed" });
      setState("error");
    }
  }

  function toggleTheme() {
    setTheme((current) => current === "light" ? "dark" : "light");
  }

  function retry() {
    if (retryIntent?.kind === "decide") void decide(retryIntent.choice);
    else if (retryIntent?.kind === "missed") void missed();
    else void buildWeek();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#main"><BookIcon /><h1>StudyPilot</h1></a>
        <div className="week-heading"><span>{week.label}</span><strong>{week.range}</strong></div>
        <span className="local-badge">
          {plan?.status === "approved"
            ? `Local demo · ${plan.sessions.length} calendar events synced`
            : "Local demo · no calendar writes yet"}
        </span>
        <button type="button" className="theme-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}><ThemeIcon /></button>
      </header>

      {error && <div className="error-banner" role="alert"><span><strong>Planning stopped.</strong> {error}</span><button type="button" onClick={retry}>Retry {retryIntent?.kind === "decide" ? "decision" : retryIntent?.kind === "missed" ? "replanning" : "build"}</button></div>}

      {state === "loading" ? (
        <main id="main" className="loading-workspace" aria-live="polite" aria-busy="true">
          <h2>Reading the syllabus and balancing the week</h2><p>Confirmed dates stay cited. Protected time stays blocked.</p>
          <div className="paper-skeleton" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        </main>
      ) : !plan ? (
        <main id="main" className="intake-workspace">
          <section className="intake-copy"><SparkIcon /><span>Academic planning agent</span><h2>Turn a long syllabus into a realistic week.</h2><p>StudyPilot extracts cited deadlines, respects your protected time and stages calendar changes for review.</p></section>
          <section className="demo-config" aria-labelledby="demo-config-title">
            <span className="demo-label" id="demo-config-title">Demo configuration</span>
            <dl><div><dt>Syllabus scenario</dt><dd>Seeded overloaded semester</dd></div><div><dt>Weekly availability</dt><dd>Mon–Sat · 15 available hours</dd></div></dl>
            <ul><li>5 extracted items</li><li>1 ambiguous date held for confirmation</li><li>Family dinner protected</li></ul>
            <button type="button" className="primary-action" onClick={() => void buildWeek()}><SparkIcon />Build this week</button>
          </section>
        </main>
      ) : (
        <main id="main" className="planning-workspace">
          <SyllabusMargin items={plan.items} />
          <section className="schedule-surface">
            <WeekLandscape sessions={plan.sessions} />
            <ActivityTimeline events={plan.events} />
          </section>
          <aside className="decision-edge">
            <ConflictInbox conflicts={plan.conflicts} />
            <CalendarChangeSet plan={plan} busy={state === "busy"} replanned={replanned} onDecision={decide} onMissed={missed} />
          </aside>
        </main>
      )}
    </div>
  );
}
