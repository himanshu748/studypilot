import { useEffect, useRef, useState } from "react";
import { ConnectionDetails } from "../features/connection/ConnectionDetails";

import { createPlan, decidePlan, getDemoRequest, listPlans, markMissed } from "../api/client";
import type { PlanRequest, StudyPlan } from "../api/types";
import { CalendarChangeSet } from "../features/approval/CalendarChangeSet";
import { ConflictInbox } from "../features/conflicts/ConflictInbox";
import { Landing } from "../features/landing/Landing";
import { ActivityTimeline } from "../features/run/ActivityTimeline";
import { SyllabusMargin } from "../features/syllabus/SyllabusMargin";
import { getWeekSummary, WeekLandscape } from "../features/week/WeekLandscape";
import { ThemeIcon } from "../ui/Icons";
import { applyTheme, getInitialTheme, type Theme } from "../ui/theme";

import { PlanIntake } from "../features/syllabus/PlanIntake";
import { SavedPlans } from "../features/syllabus/SavedPlans";
import { downloadCalendar } from "../features/approval/calendar";

type ViewState = "idle" | "loading" | "ready" | "busy" | "error";
type Surface = "landing" | "demo";
type RetryIntent = { kind: "build"; request: PlanRequest | null } | { kind: "decide"; choice: "approved" | "rejected" } | { kind: "missed"; sessionId: string };

export function App() {
  const [surface, setSurface] = useState<Surface>(window.location.hash === "#overview" ? "landing" : "demo");
  const [state, setState] = useState<ViewState>("idle");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState("");
  const [utilityError, setUtilityError] = useState<{ message: string; retry: () => void } | null>(null);
  const [replanned, setReplanned] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [submitted, setSubmitted] = useState<PlanRequest | null>(null);
  const [saved, setSaved] = useState<StudyPlan[] | null>(null);
  const [retryIntent, setRetryIntent] = useState<RetryIntent | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [revisionSource, setRevisionSource] = useState<{ plan: StudyPlan; replanned: boolean } | null>(null);
  const [revising, setRevising] = useState(false);
  const [intakeVersion, setIntakeVersion] = useState(0);
  const inFlight = useRef(false);
  const historyRequest = useRef(0);
  const week = getWeekSummary(plan?.sessions || []);

  useEffect(() => applyTheme(theme), [theme]);

  async function buildWeek(custom?: PlanRequest | null) {
    if (inFlight.current) return;
    inFlight.current = true;
    historyRequest.current += 1;
    setSaved(null);
    if (custom) setSubmitted(custom);
    setState("loading");
    setError("");
    let request = custom === null ? null : custom || submitted;
    try {
      request = request || await getDemoRequest();
      setPlan(await createPlan(request));
      setSubmitted(request);
      setRevising(false);
      setReplanned(false);
      setSaved(null);
      setRetryIntent(null);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The week could not be built");
      setRetryIntent({ kind: "build", request });
      setState("error");
    } finally { inFlight.current = false; }
  }

  async function decide(choice: "approved" | "rejected") {
    if (!plan || inFlight.current) return;
    inFlight.current = true;
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
    } finally { inFlight.current = false; }
  }

  async function missed(sessionId: string) {
    if (!plan?.sessions.some(session => session.id === sessionId) || inFlight.current) return;
    inFlight.current = true;
    setState("busy");
    setError("");
    try {
      setPlan(await markMissed(plan, sessionId));
      setReplanned(true);
      setRetryIntent(null);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The missed session could not be moved");
      setRetryIntent({ kind: "missed", sessionId });
      setState("error");
    } finally { inFlight.current = false; }
  }

  function toggleTheme() {
    setTheme((current) => current === "light" ? "dark" : "light");
  }

  function openPlan(item: StudyPlan) {
    if (inFlight.current) return;
    setPlan(item);
    setSubmitted(item.request);
    setSaved(null);
    setError("");
    setRetryIntent(null);
    setReplanned(false);
    setRevisionSource(null);
    setRevising(false);
    setState("ready");
  }

  function reviseInputs() {
    if (!plan || inFlight.current) return;
    historyRequest.current += 1;
    setSaved(null);
    setRevisionSource({ plan, replanned });
    setSubmitted(plan.request);
    setRevising(true);
    setError("");
    setRetryIntent(null);
    setState("ready");
  }

  function cancelRevision() {
    if (!revisionSource || inFlight.current) return;
    const original = revisionSource;
    openPlan(original.plan);
    setReplanned(original.replanned);
  }

  function newPlan() {
    if (inFlight.current) return;
    historyRequest.current += 1;
    setPlan(null);
    setSubmitted(null);
    setError("");
    setRetryIntent(null);
    setReplanned(false);
    setSaved(null);
    setRevisionSource(null);
    setRevising(false);
    setIntakeVersion(version => version + 1);
    setState("idle");
  }

  async function loadSaved() {
    if (historyLoading || inFlight.current) return;
    setHistoryLoading(true);
    const requestId = ++historyRequest.current;
    setUtilityError(null);
    try { const plans = await listPlans(); if (requestId === historyRequest.current) setSaved(plans); }
    catch { if (requestId === historyRequest.current) setUtilityError({ message: "Saved plans unavailable.", retry: () => void loadSaved() }); }
    finally { setHistoryLoading(false); }
  }
  function retry() {
    if (retryIntent?.kind === "decide") void decide(retryIntent.choice);
    else if (retryIntent?.kind === "missed") void missed(retryIntent.sessionId);
    else void buildWeek(retryIntent?.kind === "build" ? retryIntent.request : undefined);
  }

  if (surface === "landing") {
    return (
      <div className="app-shell landing-shell">
        <header className="topbar landing-topbar">
          <a className="wordmark" href="#main"><img src="/favicon.svg" alt="" width="36" height="36" /><h1>StudyPilot</h1></a>
          <nav className="landing-nav" aria-label="Section navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#architecture-title">Your calendar</a>
            <a href="#trust-title">Questions</a>
          </nav>
          <button type="button" className="nav-action" onClick={() => setSurface("demo")}>Open planner</button>
          <button type="button" className="theme-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}><ThemeIcon /></button>
        </header>
        <Landing onStart={() => setSurface("demo")} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#main"><img src="/favicon.svg" alt="" width="36" height="36" /><h1>StudyPilot</h1></a>
        <div className="week-heading"><span>{week.label}</span><strong>{week.range}</strong></div>
        <span className="local-badge">
          {plan?.status === "approved"
            ? `This plan · ${plan.sessions.length} local calendar events`
            : "This plan · no calendar writes yet"}
        </span>
        <button type="button" className="nav-action subtle" disabled={revising || state === "loading"} onClick={() => setSurface("landing")}>Back to overview</button>
        <button type="button" className="theme-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}><ThemeIcon /></button>
      </header>

      <div className="workspace-tools"><span>{revising ? "Editing a separate copy" : "Personal planner"}</span><button type="button" disabled={revising || state === "busy" || state === "loading"} onClick={newPlan}>New plan</button><button type="button" disabled={revising || historyLoading || state === "busy" || state === "loading"} onClick={loadSaved}>{historyLoading ? "Loading saved plans…" : "Saved plans"}</button>{plan && !revising && <button type="button" disabled={state === "busy" || state === "loading"} onClick={reviseInputs}>Revise inputs</button>}{plan?.status === "approved" && !revising && <button type="button" onClick={() => downloadCalendar(plan)}>Download calendar</button>}</div>
      <ConnectionDetails />
      {utilityError && <div className="error-banner" role="alert"><span>{utilityError.message}</span><button type="button" onClick={utilityError.retry}>Retry request</button><button type="button" onClick={() => setUtilityError(null)}>Dismiss</button></div>}
      {saved && <SavedPlans plans={saved} onClose={() => setSaved(null)} onOpen={openPlan} />}
      {error && <div className="error-banner" role="alert"><span><strong>{revising ? "Revision not created. Your inputs are kept below." : "Planning stopped."}</strong> {error}</span>{revising && retryIntent?.kind === "build" ? <button type="submit" form="planner-form">Retry revised plan</button> : <button type="button" onClick={retry}>Retry {retryIntent?.kind === "decide" ? "decision" : retryIntent?.kind === "missed" ? "replanning" : "build"}</button>}</div>}
      {revisionSource && !revising && plan && <section className="revision-notice" aria-label="Revised plan"><strong>Separate plan copy</strong><p>{plan.status === "approved" ? "This copy added separate local calendar events. Your original plan and its calendar events remain unchanged." : "Your original plan and local calendar remain unchanged. Approving this copy adds separate events; it does not replace existing events or update an external calendar."}</p><button type="button" disabled={state === "busy" || state === "loading"} onClick={() => openPlan(revisionSource.plan)}>Open original plan</button></section>}

      {state === "loading" ? (
        <main id="main" className="loading-workspace" aria-live="polite" aria-busy="true">
          <h2>Reading the syllabus and balancing the week</h2><p>Confirmed dates stay cited. Protected time stays blocked.</p>
          <div className="paper-skeleton" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        </main>
      ) : !plan || revising ? (
        <PlanIntake key={`${intakeVersion}-${revisionSource?.plan.id || "new"}`} initial={submitted} onBuild={request => void buildWeek(request)} onSample={() => { setSubmitted(null); void buildWeek(null); }} onCancel={revising ? cancelRevision : undefined} />
      ) : (
        <main id="main" className="planning-workspace">
          <SyllabusMargin items={plan.items} />
          <section className="schedule-surface">
            <WeekLandscape sessions={plan.sessions} />
          </section>
          <aside className="decision-edge">
            <ConflictInbox conflicts={plan.conflicts} />
            <CalendarChangeSet key={plan.id} plan={plan} busy={state === "busy"} replanned={replanned} onDecision={decide} onMissed={missed} />
          </aside>
          <details className="plan-activity">
            <summary>Plan activity <span>{plan.events.length} recorded steps</span></summary>
            <ActivityTimeline events={plan.events} />
          </details>
        </main>
      )}
    </div>
  );
}
