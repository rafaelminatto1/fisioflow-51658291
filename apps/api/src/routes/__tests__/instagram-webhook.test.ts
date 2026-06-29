import { afterEach, describe, expect, it, vi } from "vitest";
import { getInstagramSendError, isInstagramOutsideWindowError, sendInstagramMessage } from "../instagram-webhook";

describe("instagram-webhook send helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("sends Instagram images using attachments payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ message_id: "mid_image" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendInstagramMessage(
      { IG_ACCESS_TOKEN: "token" } as any,
      "17841400000000000",
      {
        recipientIgsid: "igsid_123",
        attachmentUrl: "https://cdn.example.com/image.jpg",
        attachmentType: "image",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: { id: "igsid_123" },
      message: {
        attachments: {
          type: "image",
          payload: { url: "https://cdn.example.com/image.jpg" },
        },
      },
    });
  });

  it("sends Instagram files using attachment payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ message_id: "mid_file" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendInstagramMessage(
      { IG_ACCESS_TOKEN: "token" } as any,
      "17841400000000000",
      {
        recipientIgsid: "igsid_123",
        attachmentUrl: "https://cdn.example.com/guide.pdf",
        attachmentType: "file",
      },
      undefined,
      { humanAgentTag: true },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: { id: "igsid_123" },
      message: {
        attachment: {
          type: "file",
          payload: { url: "https://cdn.example.com/guide.pdf" },
        },
      },
      messaging_type: "MESSAGE_TAG",
      tag: "HUMAN_AGENT",
    });
  });
});
