import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsSaveBar } from "../SettingsSaveBar";

describe("SettingsSaveBar", () => {
  it("não renderiza quando handle é null", () => {
    const { container } = render(<SettingsSaveBar handle={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("não renderiza quando não há alterações", () => {
    const { container } = render(
      <SettingsSaveBar handle={{ isDirty: false, isSaving: false, lastSavedAt: null, save: vi.fn(), discard: vi.fn() }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("mostra ações e dispara save/discard quando dirty", () => {
    const save = vi.fn();
    const discard = vi.fn();
    render(
      <SettingsSaveBar handle={{ isDirty: true, isSaving: false, lastSavedAt: null, save, discard }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    fireEvent.click(screen.getByRole("button", { name: /descartar/i }));
    expect(save).toHaveBeenCalledOnce();
    expect(discard).toHaveBeenCalledOnce();
  });

  it("desabilita salvar enquanto isSaving", () => {
    render(
      <SettingsSaveBar handle={{ isDirty: true, isSaving: true, lastSavedAt: null, save: vi.fn(), discard: vi.fn() }} />,
    );
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });
});
