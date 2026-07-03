import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MeasurementInput } from "@/components/fit/measurement-input";

// Inseam range from PRD §5: 600-1000 mm.
const base = {
  id: "inseam",
  label: "Inseam",
  unit: "cm" as const,
  minMm: 600,
  maxMm: 1000,
  recheckHint: "The book should be snug against your saddle area.",
};

describe("MeasurementInput", () => {
  it("stores an in-range value as mm on blur (ok state)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MeasurementInput {...base} onChange={onChange} />);

    const input = screen.getByRole("textbox", { name: /inseam/i });
    await user.type(input, "82");
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith({
      mm: 820,
      status: "ok",
      caution: false,
    });
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("parses comma decimals and fractional inches", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <MeasurementInput {...base} onChange={onChange} />,
    );

    const input = screen.getByRole("textbox", { name: /inseam/i });
    await user.type(input, "82,5");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({
      mm: 825,
      status: "ok",
      caution: false,
    });

    // Explicit inches override the cm display unit.
    rerender(<MeasurementInput {...base} onChange={onChange} />);
    await user.clear(input);
    await user.type(input, "28 1/2 in");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({
      mm: 724,
      status: "ok",
      caution: false,
    });
  });

  it("challenges an out-of-range value, then confirms it as unusual", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MeasurementInput {...base} onChange={onChange} />);

    const input = screen.getByRole("textbox", { name: /inseam/i });
    await user.type(input, "120"); // 1200 mm, above 1000
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent(/unusually large/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onChange).toHaveBeenLastCalledWith({
      mm: 1200,
      status: "challenge",
      caution: false,
    });

    await user.click(screen.getByRole("button", { name: /yes, that's right/i }));
    expect(onChange).toHaveBeenLastCalledWith({
      mm: 1200,
      status: "confirmed",
      caution: true,
    });
  });

  it("shows an unparseable message and stores no value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MeasurementInput {...base} onChange={onChange} />);

    const input = screen.getByRole("textbox", { name: /inseam/i });
    await user.type(input, "abc");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent(/could not read that/i);
    expect(onChange).toHaveBeenLastCalledWith({
      mm: null,
      status: "unparseable",
      caution: false,
    });
  });

  it("starts in the confirmed-unusual state for an out-of-range initial value", () => {
    render(
      <MeasurementInput
        {...base}
        valueMm={1200}
        defaultConfirmed
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/flagged as unusual/i),
    ).toBeInTheDocument();
  });

  it("steppers adjust the stored value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MeasurementInput {...base} valueMm={820} stepMm={5} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: /increase inseam/i }));
    expect(onChange).toHaveBeenLastCalledWith({
      mm: 825,
      status: "ok",
      caution: false,
    });
  });
});
