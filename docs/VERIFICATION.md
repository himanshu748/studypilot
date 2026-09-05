# Verification record

Verified locally in fixture mode on 2026-09-05. Earlier responsive captures are dated separately below.

## Automated checks

- Backend: 18 tests passed (rechecked 2026-09-05).
- Backend lint: Ruff passed.
- Frontend: 8 interaction tests passed.
- Production frontend build: passed.

The frontend coverage includes the landing-to-demo path, demo intake, dates derived from returned sessions, approval, missed-session replanning, and action-specific retries.

## Live workflow

The 2026-09-05 backend pass adds real Strands fixture tool dispatch, AgentCore request validation, runtime-session cleanup, and a full offline runtime advisory check. ARM64 direct-code packaging succeeded. AWS rejected deployment with S3 `NotSignedUp`; a minimal Nova check returned a daily-token `ThrottlingException`. No successful cloud inference or runtime deployment is claimed. See [qualification record](QUALIFICATION.md).

## Local fixture workflow

1. Built the seeded overloaded-semester plan.
2. Observed eight staged sessions and zero calendar writes before approval.
3. Approved the exact eight-session change set.
4. Observed the UI report `8 calendar events added` and the persisted event count remain eight.
5. Browser verification exposed a replan that moved the first session past its assignment deadline. The replanner now requires a confirmed deadline and refuses a move that finishes after it.
6. Regression tests verify successful replanning of a shorter session, unchanged event IDs/counts, and a conflict response with no plan or calendar changes when no pre-deadline slot exists.

The one-command demo serves the built UI and API together on localhost. It forces scripted fixture mode and uses disposable local storage, including when the checkout directory is renamed.

After the deadline fix, a fresh browser run approved eight events and displayed the pre-deadline availability conflict when the first session was marked missed. The schedule remained unchanged. Browser console inspection returned no warnings or errors for this run.

## UI checks

The files in `docs/screenshots/` were captured from the running Vite application. The public landing page was captured at 1440 px and 390 px with one page-level heading, no browser console errors, and no horizontal overflow. The populated planning-workspace captures use the local FastAPI fixture service. All four cited course sources remain present on mobile; responsive styling does not remove evidence.

Earlier responsive checks covered 360, 768, 1024 and 1440 pixel widths with no horizontal overflow. The narrow layout displays one day at a time with accessible day controls.

The original live test revealed and fixed a multi-request SQLite connection issue. `SQLiteStore` owns one thread-safe connection for its application lifetime, and the complete approval workflow was rerun successfully afterward.
