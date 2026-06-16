import { beforeEach, describe, expect, it } from "vitest";
import { getOrCreateEvolutionDeviceId } from "../evolutionDeviceId";

describe("getOrCreateEvolutionDeviceId", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates and persists a device id", () => {
    const first = getOrCreateEvolutionDeviceId();
    const second = getOrCreateEvolutionDeviceId();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(window.localStorage.getItem("fisioflow:evolution-device-id")).toBe(first);
  });
});
