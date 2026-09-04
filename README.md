# StudyPilot

StudyPilot turns an overloaded semester syllabus into a realistic weekly study plan. It extracts cited deadlines, protects unavailable time, stages a calendar change set for review and adapts the approved plan when a session is missed.

Built for the **Everyday Agents** track of the Agents for Humans hackathon using the [Strands Agents SDK](https://strandsagents.com/).

![StudyPilot public landing page](docs/screenshots/landing-desktop.png)

## Why it exists

Students rarely need another generic task list. They need help interpreting inconsistent syllabi, resolving competing deadlines and turning the result into a week they can actually follow. StudyPilot keeps the high-consequence boundary explicit: the planning agent may advise, but it cannot write to a calendar until the student approves the exact staged change set.

## What works

- Extracts five assignments from the included syllabus fixture while preserving source references.
- Leaves an ambiguous date unresolved instead of inventing one.
- Prioritizes four confirmed deadlines by due time and grading weight.
- Schedules eight sessions around a protected family commitment.
- Detects the four-deadline cluster and explains the conflict.
- Persists zero calendar events before approval and exactly eight after approval.
- Rebalances a missed session in place without duplicating calendar events.
- Offers fixture mode for a complete, deterministic demo with no AWS account or model spend.
- Offers an opt-in Amazon Bedrock path through a real Strands `Agent` with structured output and read-only tools.

## Architecture

```text
React planning workspace
        |
        v
FastAPI workflow API
        |
        +--> syllabus extraction tool --> cited academic items
        |
        +--> Strands planning agent ----> structured priority advice
        |        (fixture advisor by default; Bedrock is opt-in)
        |
        +--> deterministic scheduler ---> staged study sessions
        |
        +--> exact approval gate -------> SQLite demo calendar
                                             |
                                             +--> in-place missed-session replan
```

The LLM is deliberately not the scheduler or the calendar writer. Strands supplies constrained priority advice. Deterministic code validates dates, enforces availability and protected time and owns the write boundary.

## Run locally

Prerequisites: Python 3.11+, [uv](https://docs.astral.sh/uv/) and Node.js 20+.

```bash
git clone <your-public-repository-url>
cd studypilot

cd backend
uv sync --dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`. The default configuration uses local fixture mode and writes only to an ignored SQLite file.

## Optional Bedrock-backed advice

Copy `.env.example` to `.env`, then configure a Bedrock model that your AWS account can access:

```dotenv
STUDYPILOT_FIXTURE_MODE=false
STUDYPILOT_AWS_REGION=us-east-1
BEDROCK_MODEL_ID=your-model-id
AWS_PROFILE=your-profile
```

`amazon.nova-micro-v1:0` is an on-demand text-model example listed in `us-east-1`; verify access in your own account before enabling live mode. The Bedrock client explicitly caps each response at 512 tokens to bound quota reservation and cost.

AWS usage may incur charges. Fixture mode is the recommended judging and development path. This repository does not claim an Amazon Bedrock AgentCore deployment; the runtime integration is the open-source Strands Agents SDK with an optional Bedrock model provider.

## Verification

```bash
cd backend
uv run pytest -q
uv run ruff check .

cd ../frontend
npm test -- --run
npm run build
```

The decisive API test proves the safety invariant across the whole workflow:

```text
create plan -> 0 calendar events
exact approval -> 8 calendar events
miss first session -> still 8 calendar events, one rescheduled
```

Current automated coverage: 8 backend tests and 8 frontend interaction tests.

Real running-app captures: [desktop landing page](docs/screenshots/landing-desktop.png), [mobile landing page](docs/screenshots/landing-mobile.png), [desktop weekly plan](docs/screenshots/desktop-plan.png), and [mobile weekly plan](docs/screenshots/mobile-plan.png). The landing page was checked at 390, 768, and 1440 pixel widths with no horizontal overflow; the mobile planning capture retains all four cited course sources.

## Repository map

```text
backend/app/agent/       Strands agent and orchestration boundary
backend/app/planning/    deterministic conflict, scheduling and replanning logic
backend/app/storage/     SQLite plan and demo-calendar persistence
backend/app/tools/       cited syllabus extraction
frontend/src/features/  syllabus, weekly plan, conflict and approval surfaces
fixtures/                reproducible overloaded-semester syllabus
docs/design/             original interface concept
docs/screenshots/        verified running-app captures
```

## Safety and privacy

- No calendar write occurs without the exact `write-calendar-events` approval ID.
- Ambiguous dates remain visibly unresolved.
- The seeded demo uses fictional academic data.
- Local database files, environment files and build artifacts are excluded from Git.
- No AWS credentials are stored in the repository.

## Built with Codex

This solo project was designed, implemented and tested with Codex as a development collaborator. Codex helped turn the product concept into constrained agent boundaries, tests, a responsive interface and reproducible documentation; all submission claims remain tied to checked-in code or verified behavior.

## License

Apache-2.0. See `LICENSE`.
