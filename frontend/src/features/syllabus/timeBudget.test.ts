import { expect, it } from "vitest";
import { availableMinutes, durationLabel } from "./timeBudget";

it("counts overlapping protection only once and merges overlapping availability for the estimate", () => {
  const windows = [{ start: "2027-10-07T18:00", end: "2027-10-07T20:00" }, { start: "2027-10-07T19:00", end: "2027-10-07T21:00" }];
  const blocked = [{ start: "2027-10-07T18:00", end: "2027-10-07T19:00", label: "Dinner" }, { start: "2027-10-07T18:30", end: "2027-10-07T19:30", label: "Travel" }];
  expect(availableMinutes(windows, blocked)).toBe(90);
  expect(durationLabel(90)).toBe("1h 30m");
});

it("ignores incomplete windows without displaying NaN", () => {
  expect(availableMinutes([{ start: "", end: "" }], [])).toBe(0);
});
