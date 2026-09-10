import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("retries a failed history request without creating a record", async () => {
  window.location.hash = "";
  const fetcher = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("{}", { status: 503 }))
    .mockResolvedValueOnce(new Response("[]", { status: 200 }));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Saved plans" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry request" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(fetcher.mock.calls.map(call => [call[0], call[1]?.method || "GET"]))
    .toEqual([["/api/plans", "GET"], ["/api/plans", "GET"]]);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Retry request" })).not.toBeInTheDocument());
});
