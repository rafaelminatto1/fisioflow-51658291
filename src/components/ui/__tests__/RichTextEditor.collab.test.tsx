import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { RichTextEditor } from "../RichTextEditor";

const yProviderCtor = vi.fn();
const idbPersistenceCtor = vi.fn();

vi.mock("y-partyserver/provider", () => ({
  default: class MockYProvider {
    room: string;
    options: unknown;
    constructor(host: string, room: string, doc: unknown, options: unknown) {
      yProviderCtor(host, room, doc, options);
      this.room = room;
      this.options = options;
    }
    destroy() {}
    on() {}
    off() {}
    awareness = { setLocalStateField: vi.fn(), getStates: () => new Map() };
  },
}));

vi.mock("y-indexeddb", () => ({
  IndexeddbPersistence: class MockIndexeddbPersistence {
    constructor(name: string, doc: unknown) {
      idbPersistenceCtor(name, doc);
    }
    destroy() {}
  },
}));

vi.mock("@/lib/auth/neon-token", () => ({
  getNeonAccessToken: vi.fn(async () => "test-jwt-token"),
}));

vi.mock("@/hooks/useExercises", () => ({
  useExercises: () => ({ exercises: [] }),
}));

vi.mock("@/hooks/usePatientEvolution", () => ({
  usePatientGoals: () => ({ data: [] }),
  usePatientPathologies: () => ({ data: [] }),
}));

vi.mock("@/hooks/useSoapRecords", () => ({
  useSoapRecords: () => ({ data: [] }),
}));

describe("RichTextEditor — colaboração via y-partyserver", () => {
  beforeEach(() => {
    yProviderCtor.mockClear();
    idbPersistenceCtor.mockClear();
  });

  it("conecta o provider y-partyserver com o room correto e token JWT nos params", async () => {
    render(
      <RichTextEditor
        value=""
        onValueChange={() => {}}
        collaborationId="sess-1"
      />,
    );

    await waitFor(() => {
      expect(yProviderCtor).toHaveBeenCalledTimes(1);
    });

    const [, room, , options] = yProviderCtor.mock.calls[0];
    expect(room).toBe("sess-1");
    expect(options).toBeDefined();

    const resolvedParams = await (options as { params: () => Promise<Record<string, string>> }).params();
    expect(resolvedParams).toEqual({ token: "test-jwt-token" });
  });

  it("cria persistência offline via y-indexeddb para o mesmo id de colaboração", async () => {
    render(
      <RichTextEditor
        value=""
        onValueChange={() => {}}
        collaborationId="sess-1"
      />,
    );

    await waitFor(() => {
      expect(idbPersistenceCtor).toHaveBeenCalledTimes(1);
    });

    const [name] = idbPersistenceCtor.mock.calls[0];
    expect(name).toBe("sess-1");
  });
});
