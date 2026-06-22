import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsNav, NAV_ITEMS } from "../SettingsNav";

describe("SettingsNav", () => {
  it("renderiza as 5 abas", () => {
    render(<SettingsNav active="funcionamento" onSelect={vi.fn()} />);
    expect(NAV_ITEMS).toHaveLength(5);
    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("dispara onSelect ao clicar", () => {
    const onSelect = vi.fn();
    render(<SettingsNav active="funcionamento" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Atendimentos"));
    expect(onSelect).toHaveBeenCalledWith("atendimentos");
  });
});
