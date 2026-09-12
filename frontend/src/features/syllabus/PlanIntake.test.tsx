import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PlanIntake } from "./PlanIntake";

it("submits the user's coursework and availability, not a fixture", () => {
  const onBuild = vi.fn();
  render(<PlanIntake onBuild={onBuild} onSample={vi.fn()} />);
  for (const [label, value] of [["Course", "Statistics"], ["Task", "Regression worksheet"], ["Deadline", "2027-10-09T17:00"], ["Available from", "2027-10-07T18:00"], ["Available until", "2027-10-07T20:00"]]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Create study plan" }));
  expect(onBuild).toHaveBeenCalledWith(expect.objectContaining({ syllabus: expect.stringContaining("Regression worksheet"), availability: [{ start: "2027-10-07T18:00", end: "2027-10-07T20:00" }] }));
});

it("submits repeated course and task titles as separate dated occurrences", () => {
  const onBuild = vi.fn();
  render(<PlanIntake onBuild={onBuild} onSample={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Add coursework" }));
  for (let index = 0; index < 2; index++) {
    fireEvent.change(screen.getAllByLabelText("Course", { exact: true })[index], { target: { value: "Statistics" } });
    fireEvent.change(screen.getAllByLabelText("Task", { exact: true })[index], { target: { value: "Weekly worksheet" } });
    fireEvent.change(screen.getAllByLabelText("Deadline", { exact: true })[index], { target: { value: index === 0 ? "2027-10-09T17:00" : "2027-10-16T17:00" } });
  }
  fireEvent.change(screen.getByLabelText("Available from"), { target: { value: "2027-10-07T18:00" } });
  fireEvent.change(screen.getByLabelText("Available until"), { target: { value: "2027-10-07T20:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Create study plan" }));
  expect(onBuild).toHaveBeenCalledTimes(1);
  expect(onBuild).toHaveBeenCalledWith({
    syllabus: "## Statistics\n- Weekly worksheet | due 2027-10-09T17:00 | effort 60m | weight 0%\n## Statistics\n- Weekly worksheet | due 2027-10-16T17:00 | effort 60m | weight 0%",
    availability: [{ start: "2027-10-07T18:00", end: "2027-10-07T20:00" }],
    protected: [],
  });
});

const unresolvedRequest = {
  syllabus: "## Cognitive Science 201\n- Reading response | due TBA after seminar | effort 60m | weight 5%",
  availability: [{ start: "2026-09-07T18:00", end: "2026-09-07T20:00" }],
  protected: [],
};

it("explains a pre-deadline gap and stops the AI request until hours are corrected", () => {
  const onBuild = vi.fn();
  render(<PlanIntake initial={{ syllabus: "## History\n- Essay | due 2027-10-07T18:00 | effort 90m | weight 10%", availability: [{ start: "2027-10-07T19:00", end: "2027-10-07T22:00" }], protected: [] }} onBuild={onBuild} onSample={vi.fn()} />);
  expect(screen.getByText("1h 30m short before this deadline")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create study plan" }));
  expect(onBuild).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("No AI request was sent");
  fireEvent.change(screen.getByLabelText("Available from"), { target: { value: "2027-10-07T16:00" } });
  expect(screen.getByText("Time budget fits")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create study plan" }));
  expect(onBuild).toHaveBeenCalledOnce();
});

it("preserves an unresolved saved deadline and task without putting text into a date input", () => {
  const onBuild = vi.fn();
  render(<PlanIntake initial={unresolvedRequest} onBuild={onBuild} onSample={vi.fn()} onCancel={vi.fn()} />);
  const deadline = screen.getByLabelText("Deadline", { exact: true });
  expect(deadline).toHaveValue("");
  expect(deadline).not.toBeRequired();
  expect(screen.getByText(/Saved deadline: TBA after seminar/)).toBeInTheDocument();
  expect(screen.getByText("1 task needs a confirmed date and will stay unscheduled.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create revised plan" }));
  expect(onBuild).toHaveBeenCalledWith(unresolvedRequest);
});

it("replaces unresolved text only when the student supplies a confirmed date", () => {
  const onBuild = vi.fn();
  render(<PlanIntake initial={unresolvedRequest} onBuild={onBuild} onSample={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Deadline", { exact: true }), { target: { value: "2026-09-11T17:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Create revised plan" }));
  expect(onBuild.mock.calls[0][0].syllabus).toBe("## Cognitive Science 201\n- Reading response | due 2026-09-11T17:00 | effort 60m | weight 5%");
  expect(unresolvedRequest.syllabus).toContain("TBA after seminar");
});

it("keeps the saved deadline when a newly entered confirmation is cleared", () => {
  const onBuild = vi.fn();
  render(<PlanIntake initial={unresolvedRequest} onBuild={onBuild} onSample={vi.fn()} onCancel={vi.fn()} />);
  const deadline = screen.getByLabelText("Deadline", { exact: true });
  fireEvent.change(deadline, { target: { value: "2026-09-11T17:00" } });
  fireEvent.change(deadline, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Create revised plan" }));
  expect(onBuild).toHaveBeenCalledWith(unresolvedRequest);
});
