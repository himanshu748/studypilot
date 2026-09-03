# Verification record

Verified locally in fixture mode on 2026-09-03.

## Automated checks

- Backend: 8 tests passed.
- Backend lint: Ruff passed.
- Frontend: 5 interaction tests passed.
- Production frontend build: passed.

The frontend coverage includes demo intake, dates derived from returned sessions, approval, missed-session replanning, and action-specific retries.

## Live workflow

1. Built the seeded overloaded-semester plan.
2. Observed eight staged sessions and zero calendar writes before approval.
3. Approved the exact eight-session change set.
4. Observed the UI report `8 calendar events added` and the persisted event count remain eight.
5. Marked the first session missed.
6. Observed `1 session rebalanced`, a `Rescheduled` session and no duplicate calendar entries.

## UI checks

The files in `docs/screenshots/` were captured from the running Vite application connected to its local FastAPI service. Desktop and 390 px mobile captures show the populated weekly plan. All four cited course sources remain present on mobile; responsive styling does not remove evidence.

Earlier responsive checks covered 360, 768, 1024 and 1440 pixel widths with no horizontal overflow. The narrow layout displays one day at a time with accessible day controls.

The original live test revealed and fixed a multi-request SQLite connection issue. `SQLiteStore` owns one thread-safe connection for its application lifetime, and the complete approval workflow was rerun successfully afterward.
