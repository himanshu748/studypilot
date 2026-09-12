import { expect, it } from "vitest";
import { availableMinutes, deadlineBudgets, durationLabel } from "./timeBudget";

it("counts overlapping protection only once and merges overlapping availability for the estimate", () => {
  const windows = [{ start: "2027-10-07T18:00", end: "2027-10-07T20:00" }, { start: "2027-10-07T19:00", end: "2027-10-07T21:00" }];
  const blocked = [{ start: "2027-10-07T18:00", end: "2027-10-07T19:00", label: "Dinner" }, { start: "2027-10-07T18:30", end: "2027-10-07T19:30", label: "Travel" }];
  expect(availableMinutes(windows, blocked)).toBe(90);
  expect(durationLabel(90)).toBe("1h 30m");
});

it("ignores incomplete windows without displaying NaN", () => {
  expect(availableMinutes([{ start: "", end: "" }], [])).toBe(0);
});

it("does not use tomorrow's hours for today's deadline and counts earlier tasks cumulatively", () => {
  const tasks = [
    { course: "Math", title: "Worksheet", due: "2027-10-07T20:00", effort: 90 },
    { course: "Math", title: "Worksheet", due: "2027-10-08T20:00", effort: 60 },
    { course: "History", title: "Unknown date", due: "", effort: 600 },
  ];
  const windows = [{ start: "2027-10-07T19:00", end: "2027-10-07T21:00" }, { start: "2027-10-08T17:00", end: "2027-10-08T20:00" }];
  const budgets = deadlineBudgets(tasks, windows, []);
  expect(budgets).toMatchObject([{ needed: 90, available: 60, shortfall: 30 }, { needed: 150, available: 300, shortfall: 0 }]);
});

it("groups simultaneous deadlines without clearing a shared time deficit", () => {
  const tasks = ["Essay", "Quiz"].map(title => ({ course: "History", title, due: "2027-10-07T20:00", effort: 60 }));
  expect(deadlineBudgets(tasks, [{ start: "2027-10-07T18:00", end: "2027-10-07T20:00" }], [{ start: "2027-10-07T19:00", end: "2027-10-07T19:30", label: "Dinner" }]))
    .toMatchObject([{ titles: ["Essay", "Quiz"], needed: 120, available: 90, shortfall: 30 }]);
});

it("uses local calendar hours rather than elapsed DST time", () => {
  expect(availableMinutes([{ start: "2027-03-14T01:00", end: "2027-03-14T04:00" }], [])).toBe(180);
});
