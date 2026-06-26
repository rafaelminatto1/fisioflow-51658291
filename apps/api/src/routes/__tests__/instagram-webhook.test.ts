import { describe, expect, it } from "vitest";
import { getInstagramSendError, isInstagramOutsideWindowError } from "../instagram-webhook";

describe("instagram-webhook send helpers", () => {
  it("detects outside-window errors by official subcode", () => {
    expect(
      isInstagramOutsideWindowError({
        message: "(#10) This message was sent outside the allowed window.",
        error_subcode: 2534022,
      }),
    ).toBe(true);
  });

  it("detects outside-window errors by message fallback", () => {
    expect(isInstagramOutsideWindowError("This message is sent outside of allowed window.")).toBe(true);
  });

  it("extracts nested Instagram API errors", () => {
    expect(
      getInstagramSendError({
        error: {
          message: "(#10) This message was sent outside the allowed window.",
          code: 10,
        },
      }),
    ).toEqual({
      message: "(#10) This message was sent outside the allowed window.",
      code: 10,
    });
  });
});
