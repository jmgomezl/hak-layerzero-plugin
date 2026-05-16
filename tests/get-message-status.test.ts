import { describe, expect, it, vi } from "vitest";
import { getMessageStatusTool } from "../src/tools/get-message-status.js";

const fakeClient = {} as never;

function makeContext(config?: object) {
  return { pluginConfig: { layerzero: config } } as never;
}

function mockFetch(response: { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      json: vi.fn().mockResolvedValue(response.body),
      text: vi.fn().mockResolvedValue(JSON.stringify(response.body)),
    })
  );
}

describe("layerzero_get_message_status", () => {
  it("returns DELIVERED status from scan API", async () => {
    mockFetch({
      status: 200,
      body: {
        messages: [
          {
            guid: "0xabc123",
            srcTxHash: "0xsrchash",
            dstTxHash: "0xdsthash",
            srcEid: 30316,
            dstEid: 30101,
            status: "DELIVERED",
            created: "2024-01-01T00:00:00Z",
            updated: "2024-01-01T00:01:00Z",
          },
        ],
      },
    });

    const result = await getMessageStatusTool.coreAction(
      { srcTxHash: "0xsrchash" },
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.status).toBe("DELIVERED");
    expect(result.message?.srcEid).toBe(30316);
    expect(result.message?.dstEid).toBe(30101);
    expect(result.trackingUrl).toContain("0xsrchash");
  });

  it("returns INFLIGHT status", async () => {
    mockFetch({
      status: 200,
      body: { messages: [{ guid: "0xabc", srcTxHash: "0xtx1", srcEid: 30316, dstEid: 30101, status: "INFLIGHT" }] },
    });

    const result = await getMessageStatusTool.coreAction(
      { srcTxHash: "0xtx1" },
      makeContext(),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.status).toBe("INFLIGHT");
  });

  it("returns FAILED status", async () => {
    mockFetch({
      status: 200,
      body: { messages: [{ guid: "0xabc", srcTxHash: "0xtx2", srcEid: 30316, dstEid: 30101, status: "FAILED" }] },
    });

    const result = await getMessageStatusTool.coreAction(
      { srcTxHash: "0xtx2" },
      makeContext(),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.status).toBe("FAILED");
  });

  it("returns UNKNOWN when API returns 404", async () => {
    mockFetch({ status: 404, body: {} });

    const result = await getMessageStatusTool.coreAction(
      { srcTxHash: "0xnotfound" },
      makeContext(),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.status).toBe("UNKNOWN");
    expect(result.message).toBeNull();
  });

  it("returns UNKNOWN when API returns empty messages array", async () => {
    mockFetch({ status: 200, body: { messages: [] } });

    const result = await getMessageStatusTool.coreAction(
      { guid: "0xsomeguid" },
      makeContext(),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.status).toBe("UNKNOWN");
  });

  it("returns error on API failure (5xx)", async () => {
    mockFetch({ status: 500, body: "Internal Server Error" });

    const result = await getMessageStatusTool.coreAction(
      { srcTxHash: "0xtx3" },
      makeContext(),
      fakeClient
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("500");
  });

  it("accepts guid as lookup key", async () => {
    mockFetch({
      status: 200,
      body: { guid: "0xmyguid", srcTxHash: "0xtx99", srcEid: 30316, dstEid: 30101, status: "DELIVERED" },
    });

    const result = await getMessageStatusTool.coreAction(
      { guid: "0xmyguid" },
      makeContext(),
      fakeClient
    );

    expect(result.success).toBe(true);
  });

  it("shouldSecondaryAction returns false for status result", async () => {
    const fakeResult = { success: true, status: "DELIVERED" };
    const should = await getMessageStatusTool.shouldSecondaryAction(fakeResult as never, makeContext());
    expect(should).toBe(false);
  });
});
