import { useState } from "react";
import type { PlanRequest } from "../../api/types";
import { availableMinutes, durationLabel } from "./timeBudget";

type Task = { course: string; title: string; due: string; unresolvedDue?: string; effort: number; weight: number };
type Window = { start: string; end: string; label?: string };
const blankTask = (): Task => ({ course: "", title: "", due: "", effort: 60, weight: 0 });

// Only put valid local dates into a native date input. Keep other source text
// separately so an unresolved deadline survives reopening and resubmission.
function deadlineInputValue(value: string): string {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!parts) return "";
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = parts;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day) ||
    Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return "";
  return `${year}-${month}-${day}T${hour}:${minute}${parts[6] ? `:${second}` : ""}`;
}

export function PlanIntake({ onBuild, onSample, initial, onCancel }: { onBuild: (request: PlanRequest) => void; onSample: () => void; initial?: PlanRequest | null; onCancel?: () => void }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    let course = ""; const restored: Task[] = [];
    for (const rawLine of initial?.syllabus.split("\n") || []) {
      const line = rawLine.trim();
      if (line.startsWith("## ")) course = line.slice(3);
      const match = line.match(/^- (.+) \| due (.+) \| effort (\d+)m \| weight (\d+)%$/);
      if (match) {
        const due = deadlineInputValue(match[2].trim());
        restored.push({ course, title: match[1], due, unresolvedDue: due ? undefined : match[2], effort: Number(match[3]), weight: Number(match[4]) });
      }
    }
    return restored.length ? restored : [blankTask()];
  });
  const [windows, setWindows] = useState<Window[]>(initial?.availability || [{ start: "", end: "" }]);
  const [protectedTime, setProtectedTime] = useState<Window[]>(initial?.protected || []);
  const [error, setError] = useState("");
  const requestedMinutes = tasks.reduce((total, task) => total + task.effort, 0);
  const usableMinutes = availableMinutes(windows, protectedTime.map(w => ({ ...w, label: w.label || "Protected time" })));
  const readyTasks = tasks.filter(task => task.course.trim() && task.title.trim() && task.due).length;
  const unresolvedTasks = tasks.filter(task => !task.due && task.unresolvedDue).length;
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const allWindows = [...windows, ...protectedTime];
    if (allWindows.some(w => !w.start || !w.end || w.end <= w.start)) { setError("Each time window must end after it starts."); return; }
    const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start));
    if (sorted.some((w, i) => i > 0 && w.start < sorted[i - 1].end)) { setError("Available time windows overlap. Combine them before planning."); return; }
    if (tasks.some(t => /[\r\n|]/.test(t.title + t.course))) { setError("Course and task names cannot contain line breaks or the | character."); return; }
    setError("");
    onBuild({ syllabus: tasks.map(t => `## ${t.course.trim()}\n- ${t.title.trim()} | due ${t.due || t.unresolvedDue} | effort ${t.effort}m | weight ${t.weight}%`).join("\n"), availability: windows, protected: protectedTime.map(w => ({ ...w, label: w.label || "Protected time" })) });
  }
  return <main id="main" className="product-intake">
    <div className="product-intro"><h2>{onCancel ? "Revise your planning inputs." : "Make room for the work that matters."}</h2><p>{onCancel ? "Update coursework, available hours or protected time to create a separate proposal. Your original plan and local calendar remain unchanged." : "Your deadlines, your available hours, your time to protect. Build a realistic week, then decide what belongs in your calendar."}</p>{onCancel && <p>Approving the revised copy adds separate local calendar events. It does not replace existing events or update an external calendar.</p>}</div>
    <div className="intake-layout">
    <form id="planner-form" onSubmit={submit} className="product-form">
      <section id="coursework"><h3>Your coursework</h3><p>Copy confirmed details from your syllabus. All times use your local calendar time.</p><details className="input-guidance"><summary>Working with repeated tasks or unknown dates</summary><p>Repeated titles are kept as separate tasks. Saved tasks with unknown dates stay unscheduled until you enter a confirmed date.</p></details>
        {tasks.map((task, i) => <fieldset key={i} className="task-inputs"><legend>Coursework {i + 1}</legend>
          <label>Course<input required maxLength={120} value={task.course} onChange={e => setTasks(tasks.map((t, n) => n === i ? { ...t, course: e.target.value } : t))} /></label>
          <label>Task<input required maxLength={180} value={task.title} onChange={e => setTasks(tasks.map((t, n) => n === i ? { ...t, title: e.target.value } : t))} /></label>
          <label>Deadline<input type="datetime-local" aria-label="Deadline" aria-describedby={task.unresolvedDue ? `deadline-note-${i}` : undefined} required={!task.unresolvedDue} value={task.due} onChange={e => setTasks(tasks.map((t, n) => n === i ? { ...t, due: e.target.value } : t))} />{task.unresolvedDue && <small id={`deadline-note-${i}`} className="deadline-note">Saved deadline: {task.unresolvedDue}. Leave blank to keep it unresolved, or enter a confirmed date.</small>}</label>
          <label>Study minutes<input type="number" min={30} max={1200} step={30} required value={task.effort} onChange={e => setTasks(tasks.map((t, n) => n === i ? { ...t, effort: Number(e.target.value) } : t))} /></label>
          <label>Grade weight (%)<input type="number" min={0} max={100} required value={task.weight} onChange={e => setTasks(tasks.map((t, n) => n === i ? { ...t, weight: Number(e.target.value) } : t))} /></label>
          {tasks.length > 1 && <button type="button" onClick={() => setTasks(tasks.filter((_, n) => n !== i))}>Remove task {i + 1}</button>}
        </fieldset>)}
        <button type="button" disabled={tasks.length >= 20} onClick={() => setTasks([...tasks, blankTask()])}>Add coursework</button>
      </section>
      <section id="availability"><h3>Time you can use</h3><p>Choose specific study windows. The planner will not schedule outside them.</p>
        {windows.map((w, i) => <fieldset className="time-inputs" key={i}><legend>Available window {i + 1}</legend>
          <label>Available from<input type="datetime-local" required value={w.start} onChange={e => setWindows(windows.map((v, n) => n === i ? { ...v, start: e.target.value } : v))} /></label>
          <label>Available until<input type="datetime-local" required value={w.end} onChange={e => setWindows(windows.map((v, n) => n === i ? { ...v, end: e.target.value } : v))} /></label>
          {windows.length > 1 && <button type="button" onClick={() => setWindows(windows.filter((_, n) => n !== i))}>Remove window {i + 1}</button>}
        </fieldset>)}
        <button type="button" disabled={windows.length >= 40} onClick={() => setWindows([...windows, { start: "", end: "" }])}>Add available time</button>
      </section>
      <section id="protected-time"><h3>Time to protect</h3><p>Optional. Keep meals, work or other commitments out of the plan.</p>
        {protectedTime.map((w, i) => <fieldset className="time-inputs protected-inputs" key={i}><legend>Protected window {i + 1}</legend>
          <label>Commitment<input required maxLength={120} value={w.label || ""} onChange={e => setProtectedTime(protectedTime.map((v, n) => n === i ? { ...v, label: e.target.value } : v))} /></label>
          <label>Protected from<input type="datetime-local" required value={w.start} onChange={e => setProtectedTime(protectedTime.map((v, n) => n === i ? { ...v, start: e.target.value } : v))} /></label>
          <label>Protected until<input type="datetime-local" required value={w.end} onChange={e => setProtectedTime(protectedTime.map((v, n) => n === i ? { ...v, end: e.target.value } : v))} /></label>
          <button type="button" onClick={() => setProtectedTime(protectedTime.filter((_, n) => n !== i))}>Remove protection {i + 1}</button>
        </fieldset>)}
        <button type="button" disabled={protectedTime.length >= 40} onClick={() => setProtectedTime([...protectedTime, { start: "", end: "", label: "" }])}>Protect time</button>
      </section>
      {error && <p role="alert">{error}</p>}
      <div className="product-submit"><button className="primary-action" type="submit">{onCancel ? "Create revised plan" : "Create study plan"}</button>{onCancel && <button type="button" onClick={onCancel}>Cancel revision</button>}<span>Review first. Calendar changes require your approval.</span></div>
    </form>
    <aside className="intake-budget" aria-label="Planning summary">
      <h3>Your time budget</h3>
      <dl><div><dt>Coursework ready</dt><dd>{readyTasks} of {tasks.length}</dd></div><div><dt>Study time needed</dt><dd>{durationLabel(requestedMinutes)}</dd></div><div><dt>Available after protection</dt><dd>{durationLabel(usableMinutes)}</dd></div></dl>
      <p className={usableMinutes && usableMinutes < requestedMinutes ? "budget-warning" : "budget-hint"}>{!usableMinutes ? "Add your available hours to see how the week fits." : usableMinutes < requestedMinutes ? `You need ${durationLabel(requestedMinutes - usableMinutes)} more available time for this coursework.` : `${durationLabel(usableMinutes - requestedMinutes)} left for breathing room.`}</p>
      <p className="budget-note">An overall estimate. Each session still needs to fit before its own deadline.</p>
      {unresolvedTasks > 0 && <p className="budget-warning">{unresolvedTasks} {unresolvedTasks === 1 ? "task needs" : "tasks need"} a confirmed date and will stay unscheduled.</p>}
      <nav aria-label="Planning sections"><a href="#coursework">Coursework</a><a href="#availability">Available hours</a><a href="#protected-time">Protected time</a></nav>
      <div className="local-processing-note"><strong>Local planning workspace</strong><p>Rules-based scheduling and local storage. No external calendar connection.</p></div>
    </aside>
    </div>
    {!onCancel && <details className="product-sample"><summary>Explore with sample coursework</summary><p>Seeded overloaded semester. Fictional coursework and availability.</p><button type="button" onClick={onSample}>Build this week</button></details>}
  </main>;
}
