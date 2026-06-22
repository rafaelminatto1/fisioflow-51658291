import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useRegisterTabHandle } from "../useRegisterTabHandle";
import type { TabSaveHandle } from "../types";

// Regressão: o handle de save não pode re-registrar a cada render (loop infinito
// quando o shell faz setState em registerHandle). save/discard mudam de
// identidade todo render; o efeito só deve disparar quando primitivos mudam.
function Harness({ register }: { register: (h: TabSaveHandle | null) => void }) {
  const [, force] = useState(0);
  // save com nova identidade a cada render (simula dependência de mutation)
  const save = () => {};
  const discard = () => {};
  useRegisterTabHandle(register, {
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    save,
    discard,
  });
  return (
    <button type="button" onClick={() => force((n) => n + 1)}>
      rerender
    </button>
  );
}

describe("useRegisterTabHandle", () => {
  it("não re-registra o handle quando só a identidade de save/discard muda", () => {
    const register = vi.fn();
    const { getByRole } = render(<Harness register={register} />);
    expect(register).toHaveBeenCalledTimes(1);
    // força vários re-renders; primitivos inalterados → sem novos registros
    act(() => getByRole("button").click());
    act(() => getByRole("button").click());
    act(() => getByRole("button").click());
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("expõe save/discard sempre apontando para a closure mais recente", () => {
    const calls: string[] = [];
    let registered: TabSaveHandle | null = null;
    function H() {
      const [n, setN] = useState(0);
      useRegisterTabHandle(
        (h) => {
          if (h) registered = h;
        },
        {
          isDirty: false,
          isSaving: false,
          lastSavedAt: null,
          save: () => calls.push(`save-${n}`),
          discard: () => {},
        },
      );
      return (
        <button type="button" onClick={() => setN((v) => v + 1)}>
          inc
        </button>
      );
    }
    const { getByRole } = render(<H />);
    act(() => getByRole("button").click());
    registered!.save();
    expect(calls).toEqual(["save-1"]);
  });
});
