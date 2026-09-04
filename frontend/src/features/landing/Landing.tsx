import { AlertIcon, BookIcon, CalendarIcon, CheckIcon, SparkIcon } from "../../ui/Icons";

const STEPS = [
  {
    title: "Read the syllabus, keep the citation",
    body: "A typed extraction tool reads the source material and records the line each deadline came from. An ambiguous date is held for confirmation instead of being guessed.",
  },
  {
    title: "Ask the agent for priority, not for the schedule",
    body: "A Strands agent returns constrained, structured advice about what matters most. It never writes a date, a session or a calendar entry.",
  },
  {
    title: "Schedule deterministically",
    body: "Ordinary application code places sessions inside your stated availability and around protected time. The same input produces the same week every run.",
  },
  {
    title: "Stop at the approval gate",
    body: "The staged change set is shown in full and nothing is written until you approve that exact set. Rejecting writes nothing at all.",
  },
];

const BOUNDARIES = [
  "No calendar write happens without the exact write-calendar-events approval ID.",
  "Ambiguous dates stay visibly unresolved rather than being invented.",
  "The seeded demo uses fictional academic data and a local SQLite file.",
  "Fixture mode is the default, so the demo runs with no AWS account and no model spend.",
  "Environment files, local databases and build artifacts are excluded from Git.",
];

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <main id="main" className="landing">
      <section className="landing-hero" aria-labelledby="hero-title">
        <p className="hero-eyebrow"><SparkIcon />Everyday Agents · Agents for Humans</p>
        <h2 id="hero-title">The syllabus is not the problem. The week is.</h2>
        <p className="hero-lede">
          Four courses, five deadlines and one protected evening do not resolve themselves into a
          plan. StudyPilot reads the source material, keeps every date tied to the line it came
          from, and stages a week you can actually follow. It stops before it touches your calendar.
        </p>
        <p className="hero-actions">
          <button type="button" className="primary-action" onClick={onStart}>
            <CalendarIcon />Try the demo
          </button>
          <a className="ghost-action" href="#how-it-works">Read how it works</a>
        </p>
        <p className="hero-note">
          Runs locally in fixture mode by default. No AWS account, no model spend and no external
          calls are needed to see the whole workflow.
        </p>
      </section>

      <section className="landing-problem" aria-labelledby="problem-title">
        <h2 id="problem-title" className="section-heading"><span>01</span>What actually goes wrong</h2>
        <div className="problem-columns">
          <article>
            <h3>Deadlines hide in prose</h3>
            <p>
              Syllabi bury dates in paragraphs, tables and footnotes, written four different ways.
              Transcribing them by hand is where the first mistake enters.
            </p>
          </article>
          <article>
            <h3>Clusters are invisible until they hurt</h3>
            <p>
              Four deadlines inside forty-eight hours looks fine on four separate pages. It only
              becomes a problem once the week has already started.
            </p>
          </article>
          <article>
            <h3>Planners ignore the hours you do not have</h3>
            <p>
              A plan that schedules over a standing family commitment is not a plan. Protected time
              has to be an input, not an apology.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-steps" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="section-heading"><span>02</span>How the agent works</h2>
        <p className="section-lede">
          The model is deliberately not the scheduler and not the calendar writer. It contributes
          judgement about priority. Deterministic code owns every date and the write boundary.
        </p>
        <ol className="step-list">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="step-mark" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-architecture" aria-labelledby="architecture-title">
        <h2 id="architecture-title" className="section-heading"><span>03</span>What it is built on</h2>
        <div className="architecture-body">
          <div className="architecture-prose">
            <p>
              StudyPilot is a FastAPI service and a React workspace. The planning agent is built with
              the open-source <strong>Strands Agents SDK</strong>, which supplies structured output and
              read-only tools.
            </p>
            <p>
              The default path is fixture mode: a deterministic local advisor, no network access and
              no credentials. An <strong>Amazon Bedrock</strong> model provider is available as an
              opt-in, configured through environment variables in your own AWS account, with each
              response capped at 512 tokens to bound cost.
            </p>
            <p className="architecture-caveat">
              <AlertIcon />
              <span>
                This repository is a local application. It does not claim an Amazon Bedrock AgentCore
                deployment, and nothing is hosted or called on your behalf.
              </span>
            </p>
          </div>
          <div className="architecture-stack" aria-label="Request path">
            <ol>
              <li><strong>React workspace</strong><span>syllabus, week, conflicts, approval</span></li>
              <li><strong>FastAPI workflow API</strong><span>one ordered plan lifecycle</span></li>
              <li><strong>Extraction tool</strong><span>cited academic items</span></li>
              <li><strong>Strands agent</strong><span>constrained priority advice</span></li>
              <li><strong>Deterministic scheduler</strong><span>staged study sessions</span></li>
              <li><strong>Approval gate</strong><span>SQLite demo calendar</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="landing-trust" aria-labelledby="trust-title">
        <h2 id="trust-title" className="section-heading"><span>04</span>Trust and safety boundaries</h2>
        <ul className="boundary-list">
          {BOUNDARIES.map((item) => (
            <li key={item}><CheckIcon /><span>{item}</span></li>
          ))}
        </ul>
      </section>

      <section className="landing-close" aria-labelledby="close-title">
        <h2 id="close-title">See the whole loop in about a minute.</h2>
        <p>
          Build the seeded overloaded semester, read the cited deadlines, watch the conflict surface
          and approve or reject the exact change set.
        </p>
        <button type="button" className="primary-action" onClick={onStart}>
          <CalendarIcon />Try the demo
        </button>
      </section>

      <footer className="landing-footer">
        <p className="footer-mark"><BookIcon /><span>StudyPilot</span></p>
        <p className="footer-meta">
          Built for the Everyday Agents track of the Agents for Humans hackathon. Apache-2.0 licensed.
          Fictional academic data throughout.
        </p>
      </footer>
    </main>
  );
}
