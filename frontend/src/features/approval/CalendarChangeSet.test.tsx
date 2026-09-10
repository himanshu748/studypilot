import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { StudyPlan } from "../../api/types";
import { CalendarChangeSet } from "./CalendarChangeSet";

it("requires a specific session and moves the selected session, not the first", () => {
  const onMissed = vi.fn();
  const plan = { id: "plan", status: "approved", sessions: [
    { id: "first", title: "Essay", start: "2027-10-07T18:00" },
    { id: "second", title: "Worksheet", start: "2027-10-08T18:00" },
  ] } as StudyPlan;
  render(<CalendarChangeSet plan={plan} busy={false} replanned={false} onDecision={vi.fn()} onMissed={onMissed} />);
  expect(screen.getByRole("button", { name: "Move selected session" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Missed a study session?"), { target: { value: "second" } });
  fireEvent.click(screen.getByRole("button", { name: "Move selected session" }));
  expect(onMissed).toHaveBeenCalledExactlyOnceWith("second");
});
