import { afterEach, expect, it, vi } from "vitest";
import { createPlan, markMissed } from "./client";
import type { PlanRequest, StudyPlan } from "./types";

afterEach(() => vi.restoreAllMocks());

it("turns field validation details into a readable error", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: [{ loc: ["body", "availability", 0, "end"], msg: "End must be after start" }] }), { status: 422 }));
  await expect(createPlan({} as PlanRequest)).rejects.toThrow("availability · 0 · end: End must be after start");
});

it("sends the original selected time so retried missed requests are idempotent", async () => {
  const plan = { id: "plan", sessions: [{ id: "second", start: "2027-10-08T18:00:00" }] } as StudyPlan;
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(plan)));
  await markMissed(plan, "second");
  expect(fetcher).toHaveBeenCalledWith("/api/plans/plan/sessions/second/missed?expected_start=2027-10-08T18%3A00%3A00", { method: "POST" });
});
