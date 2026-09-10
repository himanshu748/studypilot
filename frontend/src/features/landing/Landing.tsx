import { InteractivePreview } from "./InteractivePreview";

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <main id="main" className="landing">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h2 id="hero-title">Your week, within reach.</h2>
          <p className="hero-lede">Plan coursework around your deadlines, available hours and the time you want to keep free.</p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={onStart}>Open planner</button>
            <a className="ghost-action" href="#how-it-works">How it works</a>
          </div>
        </div>
        <InteractivePreview />
      </section>
      <section className="landing-workflow" aria-labelledby="how-it-works">
        <div className="workflow-intro">
          <h2 id="how-it-works">A full week doesn't need a full calendar.</h2>
          <p>Bring the work you need to do. Keep the things you don't want to miss.</p>
        </div>
        <div className="workflow-content">
          <article><h3>Add your coursework</h3><p>Enter each task, its deadline and the study time it needs. Keep all your courses in one place.</p></article>
          <article><h3>Make room for life</h3><p>Choose your study windows. Protect dinner, work or an evening off. Sessions fit around the time you set.</p></article>
          <article><h3>Review your week</h3><p>Check the proposed sessions before you approve them. If life changes, revise your inputs and create a separate plan.</p></article>
        </div>
      </section>
      <section className="landing-control" aria-labelledby="architecture-title">
        <div className="control-copy"><h2 id="architecture-title">You get the final say.</h2><p>Nothing goes into your local calendar until you approve it. Download your approved plan as a calendar file when you're ready.</p></div>
        <div className="control-actions"><span>Review the sessions</span><span>Approve your plan</span><span>Download your calendar</span></div>
      </section>
      <section className="landing-questions" aria-labelledby="trust-title">
        <h2 id="trust-title">Before you start.</h2>
        <div className="question-list">
          <details><summary>Can I use my own coursework?</summary><p>Yes. Enter course names, tasks, deadlines and effort in the planner. Sample coursework is also available if you'd like to try the workflow first.</p></details>
          <details><summary>What if my deadlines don't fit?</summary><p>The planner checks the available time before each deadline. If the work cannot fit, adjust your study windows or coursework and try again.</p></details>
          <details><summary>Does this connect to my calendar?</summary><p>Not automatically. Approved events are saved in the app's local calendar. You can download an ICS file and import it into your calendar yourself.</p></details>
          <details><summary>Where are my plans saved?</summary><p>On the machine running StudyPilot. Reopen them from Saved plans. There is no cloud account or cross-device sync in this version.</p></details>
        </div>
      </section>
      <section className="landing-close" aria-labelledby="close-title"><h2 id="close-title">Make a little room.</h2><button type="button" className="primary-action" onClick={onStart}>Open planner</button></section>
      <footer className="landing-footer"><a className="footer-mark" href="#main"><img src="/favicon.svg" alt="" width="32" height="32" /><span>StudyPilot</span></a><p>Coursework, with room for everything else.</p></footer>
    </main>
  );
}
