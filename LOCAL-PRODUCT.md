# Local product workflow

Verified 2026-09-07. This increment accepts your own inputs; sample scenarios remain optional. It is local-only, not a public multi-user release or a verified live AgentCore deployment.

## Start

Use the existing repository setup instructions to install dependencies. From the repository root, start the API in one terminal:

```sh
cd backend
STUDYPILOT_FIXTURE_MODE=true .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```sh
cd frontend
npm run dev -- --config vite.config.ts --host 127.0.0.1 --port 5178 --strictPort
```

Open http://127.0.0.1:5178/. The frontend proxies /api to port 8000. The overview is available through Back to overview or /#overview.

## What works and what is limited

Enter coursework, deadlines, effort and study windows, then create a plan. Review and approve it before downloading the calendar. Saved plans reopen from SQLite.

The input form takes confirmed task details, not arbitrary PDFs or natural-language syllabus uploads. Dates use local calendar time. Calendar export is an ICS download, not Google/Outlook synchronization.

Verified: a custom Statistics task produced a session, was approved, downloaded as ICS and reopened after a page reload. Backend: 24 tests; frontend: 15 tests; production build passed.

## Cost and data boundary

The commands above force local scripted model behavior. No AWS inference or deployment was started for these checks. The authorized ceiling is $50 in covered AWS credits and $0 from the bank; credit eligibility and billing safeguards have not been verified here. Do not switch off fixture mode or deploy based on this local validation.

Desktop light and mobile dark input screens were captured under .impeccable/review/. Browser downloads are under output/playwright/. No changes from this increment have been pushed to GitHub.
