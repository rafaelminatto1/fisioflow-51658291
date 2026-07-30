import { describe, expect, it } from "vitest";
import { isNoteIndexable, noteIndexFilename } from "../notesIndexing";

const baseNote = {
  classification: "team",
  sensitivity: "internal",
  patient_id: null,
  deleted_at: null,
};

describe("notes semantic indexing policy", () => {
  it("indexes only non-clinical internal notes without a patient", () => {
    expect(isNoteIndexable(baseNote)).toBe(true);
  });

  it.each([
    [{ ...baseNote, classification: "clinical" }, "clinical classification"],
    [{ ...baseNote, sensitivity: "restricted" }, "restricted sensitivity"],
    [{ ...baseNote, patient_id: "11111111-1111-4111-8111-111111111111" }, "patient context"],
    [{ ...baseNote, deleted_at: new Date() }, "soft-deleted note"],
  ])("excludes %s", (note, _reason) => {
    expect(isNoteIndexable(note)).toBe(false);
  });

  it("uses a deterministic private index filename", () => {
    expect(noteIndexFilename("11111111-1111-4111-8111-111111111111"))
      .toBe("notes/11111111-1111-4111-8111-111111111111.md");
  });
});
