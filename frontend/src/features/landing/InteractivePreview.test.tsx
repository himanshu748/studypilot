import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InteractivePreview } from "./InteractivePreview";

describe("Interactive study preview", () => {
  it("moves only the writing session and reverses the change", () => {
    render(<InteractivePreview />);
    const toggle = screen.getByRole("button", { name: "Keep Tuesday evening free" });
    const session = screen.getByText("Shape the first draft").closest(".sample-writing");
    expect(session).toHaveAttribute("data-day", "Tuesday");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(session).toHaveAttribute("data-day", "Thursday");
    expect(screen.getByRole("status")).toHaveTextContent("Writing moved to Thursday");
    expect(screen.getByText("Family dinner")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(session).toHaveAttribute("data-day", "Tuesday");
    expect(screen.getByText("Calendar unchanged")).toBeInTheDocument();
  });

  it("keeps the state change without spatial animation under reduced motion", () => {
    const animate = vi.fn();
    const original = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = animate;
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    try {
      render(<InteractivePreview />);
      fireEvent.click(screen.getByRole("button", { name: "Keep Tuesday evening free" }));
      expect(screen.getByText("Moved to Thursday")).toBeInTheDocument();
      expect(animate).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.animate = original;
      vi.unstubAllGlobals();
    }
  });
});
