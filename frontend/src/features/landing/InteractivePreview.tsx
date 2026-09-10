import { useLayoutEffect, useRef, useState } from "react";

export function InteractivePreview() {
  const [protectedTuesday, setProtectedTuesday] = useState(false);
  const writing = useRef<HTMLDivElement>(null);
  const previousTop = useRef<number | null>(null);
  const animation = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const card = writing.current;
    if (!card) return;
    animation.current?.cancel();
    const top = card.getBoundingClientRect().top;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (previousTop.current !== null && !reduced && card.animate) {
      animation.current = card.animate(
        [{ transform: `translateY(${previousTop.current - top}px)` }, { transform: "translateY(0)" }],
        { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
    }
    previousTop.current = null;
    return () => animation.current?.cancel();
  }, [protectedTuesday]);

  return (
    <aside className="week-preview interactive-preview" aria-label="Illustrative study plan">
      <div className="preview-caption">Illustrative preview · fictional coursework</div>
      <div className="week-preview-title"><h3>Your study week</h3><span>September 7-10</span></div>
      <div className="week-controls">
        <button type="button" className="preview-toggle" aria-pressed={protectedTuesday}
          onClick={() => {
            previousTop.current = writing.current?.getBoundingClientRect().top ?? null;
            setProtectedTuesday((current) => !current);
          }} aria-controls="sample-week">
          <span className="toggle-track" aria-hidden="true"><span /></span>
          Keep Tuesday evening free
        </button>
      </div>
      <div className="sample-week" id="sample-week">
        {["MON", "TUE", "WED", "THU"].map((day, index) => (
          <span key={day} className="sample-day" style={{ gridRow: index + 1 }}>{day}<b>{String(7 + index).padStart(2, "0")}</b></span>
        ))}
        <div className="preview-session sample-research"><small>18:00-19:30 · Cognitive Science</small><strong>Outline the research brief</strong></div>
        <div ref={writing} className="preview-session writing sample-writing" style={{ gridRow: protectedTuesday ? 4 : 2 }} data-day={protectedTuesday ? "Thursday" : "Tuesday"}>
          <small>18:00-19:00 · Academic Writing</small><strong>Shape the first draft</strong>
          <span className="session-move-label">{protectedTuesday ? "Moved to Thursday" : "Tuesday evening"}</span>
        </div>
        <div className="preview-protected sample-family"><div><strong>Family dinner</strong><small>Wednesday stays protected</small></div></div>
        <div className="sample-free" style={{ gridRow: protectedTuesday ? 2 : 4 }} key={String(protectedTuesday)}>
          <span>{protectedTuesday ? "Tuesday is yours." : "An evening to spare."}</span>
        </div>
      </div>
      <p className="preview-live-note" role="status">{protectedTuesday ? "Writing moved to Thursday. Family dinner stays put." : "Two study sessions. Family dinner stays protected."}</p>
      <details className="preview-source"><summary>Where does the deadline come from?</summary><p>Example syllabus: “Research brief · due Friday at 17:00.” Each task keeps its source text. Unclear dates stay unscheduled until confirmed.</p></details>
      <div className="preview-footnote">Calendar unchanged</div>
    </aside>
  );
}
