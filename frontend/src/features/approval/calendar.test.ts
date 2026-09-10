import { expect, it } from "vitest";
import { calendarFile } from "./calendar";
import type { StudyPlan } from "../../api/types";

it("exports approved calendar events with escaped text and stable identifiers", () => {
  const plan = { id: "plan-1", status: "approved", sessions: [{ id: "session-1", course: "Math", title: "Sets, proofs; review", start: "2027-10-07T18:00:00", end: "2027-10-07T19:00:00" }] } as StudyPlan;
  const file = calendarFile(plan);
  expect(file).toContain("DTSTART:20271007T180000");
  expect(file).toContain("Sets\\, proofs\\; review");
  expect(file).toContain("UID:plan-1-session-1@studypilot.local");
  expect(() => calendarFile({ ...plan, status: "waiting_for_approval" })).toThrow("Approve");
});
