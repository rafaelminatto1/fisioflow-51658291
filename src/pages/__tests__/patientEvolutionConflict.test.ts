import { describe, expect, it } from "vitest";
import {
  getEvolutionConflictActorId,
  shouldOpenEvolutionConflictModal,
} from "../patientEvolutionConflict";

describe("patientEvolutionConflict", () => {
  it("prefers last_edited_by over created_by when identifying the actor", () => {
    expect(
      getEvolutionConflictActorId({
        created_by: "creator-1",
        last_edited_by: "editor-2",
      }),
    ).toBe("editor-2");
  });

  it("does not open the modal when the last edit belongs to the current user", () => {
    expect(
      shouldOpenEvolutionConflictModal({
        currentUserId: "therapist-1",
        currentDeviceId: "device-1",
        current: {
          created_by: "therapist-1",
          last_edited_by: "therapist-1",
          last_edited_device_id: "device-1",
        },
      }),
    ).toBe(false);
  });

  it("opens the modal when the same user edited from another device", () => {
    expect(
      shouldOpenEvolutionConflictModal({
        currentUserId: "therapist-1",
        currentDeviceId: "device-1",
        current: {
          created_by: "therapist-1",
          last_edited_by: "therapist-1",
          last_edited_device_id: "device-2",
        },
      }),
    ).toBe(true);
  });

  it("opens the modal when the last edit belongs to another user", () => {
    expect(
      shouldOpenEvolutionConflictModal({
        currentUserId: "therapist-1",
        currentDeviceId: "device-1",
        current: {
          created_by: "therapist-1",
          last_edited_by: "therapist-2",
          last_edited_device_id: "device-2",
        },
      }),
    ).toBe(true);
  });

  it("keeps the old no-modal fallback when the same user has no device metadata yet", () => {
    expect(
      shouldOpenEvolutionConflictModal({
        currentUserId: "therapist-1",
        currentDeviceId: "device-1",
        current: {
          created_by: "therapist-1",
          last_edited_by: "therapist-1",
        },
      }),
    ).toBe(false);
  });
});
