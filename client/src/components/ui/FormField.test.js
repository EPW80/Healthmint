// src/components/ui/FormField.test.js
//
// Item 8.1 — tests for the FormField UI primitive. Covers label/id wiring,
// error display, aria-invalid injection, aria-describedby composition,
// required indicator, and hint text rendering.

import React from "react";
import { render, screen } from "@testing-library/react";
import FormField from "./FormField";

// Helper — render with a plain input child
const renderField = (props = {}) => {
  const { id = "test-field", label = "Test Label", ...rest } = props;
  return render(
    <FormField id={id} label={label} {...rest}>
      <input type="text" />
    </FormField>
  );
};

describe("FormField", () => {
  // ── label ─────────────────────────────────────────────────────────────────

  it("renders the label text", () => {
    renderField({ label: "Full Name" });
    expect(screen.getByText("Full Name")).toBeInTheDocument();
  });

  it("associates the label with the input via htmlFor/id", () => {
    renderField({ id: "name", label: "Full Name" });
    const input = screen.getByLabelText("Full Name");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("does not render a label element when label prop is omitted", () => {
    render(
      <FormField id="no-label">
        <input type="text" />
      </FormField>
    );
    expect(screen.queryByRole("label")).not.toBeInTheDocument();
  });

  // ── required indicator ───────────────────────────────────────────────────

  it("shows an asterisk when required is true", () => {
    renderField({ required: true, label: "Name" });
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("hides the asterisk when required is false", () => {
    renderField({ required: false, label: "Name" });
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  // ── error state ──────────────────────────────────────────────────────────

  it("shows error message with role=alert", () => {
    renderField({ error: "This field is required" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This field is required");
  });

  it("does not render an alert when there is no error", () => {
    renderField();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("injects aria-invalid=true on the child input when there is an error", () => {
    renderField({ id: "email", error: "Invalid email" });
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("does not set aria-invalid when there is no error", () => {
    renderField({ id: "email" });
    const input = screen.getByRole("textbox");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  // ── aria-describedby ─────────────────────────────────────────────────────

  it("sets aria-describedby to the error id when there is an error", () => {
    renderField({ id: "email", error: "Required" });
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toContain("email-error");
  });

  it("sets aria-describedby to the hint id when there is a hint", () => {
    renderField({ id: "email", hint: "Enter your email address" });
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toContain("email-hint");
  });

  it("includes both error and hint ids in aria-describedby when both are present", () => {
    renderField({ id: "email", error: "Required", hint: "Use a real email" });
    const input = screen.getByRole("textbox");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("email-error");
    expect(describedBy).toContain("email-hint");
  });

  it("does not set aria-describedby when neither error nor hint is present", () => {
    renderField({ id: "email" });
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toBeFalsy();
  });

  // ── hint text ────────────────────────────────────────────────────────────

  it("renders hint text when provided", () => {
    renderField({ hint: "Optional — we will not share this" });
    expect(screen.getByText("Optional — we will not share this")).toBeInTheDocument();
  });

  it("does not render a hint element when hint is omitted", () => {
    renderField();
    // Hint paragraph has no role — check by absence of the hint ID
    expect(document.getElementById("test-field-hint")).toBeNull();
  });

  // ── id injection into child ──────────────────────────────────────────────

  it("injects the id prop onto the child input when the child has no id", () => {
    renderField({ id: "my-field", label: "Field" });
    const input = screen.getByLabelText("Field");
    expect(input.id).toBe("my-field");
  });

  it("preserves the child's own id when one is already set", () => {
    render(
      <FormField id="wrapper-id" label="Field">
        <input type="text" id="child-id" />
      </FormField>
    );
    // The child already has id="child-id"; FormField should not overwrite it.
    const input = screen.getByRole("textbox");
    expect(input.id).toBe("child-id");
  });
});
