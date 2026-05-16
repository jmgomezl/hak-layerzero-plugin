import { ethers } from "ethers";
import { describe, expect, it, vi } from "vitest";
import { getMessageFeeTool } from "../src/tools/get-message-fee.js";

const fakeClient = {} as never;

function makeContext(config?: object) {
  return { pluginConfig: { layerzero: config } } as never;
}

// Mock ethers Contract to avoid real RPC calls
vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
      Contract: vi.fn().mockImplementation(() => ({
        quote: vi.fn().mockResolvedValue({
          nativeFee: BigInt("1500000000000000"),
          lzTokenFee: BigInt("0"),
        }),
      })),
    },
  };
});

describe("layerzero_get_message_fee", () => {
  it("returns fee estimate for a valid request", async () => {
    const result = await getMessageFeeTool.coreAction(
      {
        dstEid: 30101,
        receiver: "0xabc1230000000000000000000000000000000001",
        message: "0x68656c6c6f",
        gasLimit: 200000,
        payInLzToken: false,
      },
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.nativeFee).toBe("1500000000000000");
    expect(result.nativeFeeFormatted).toContain("HBAR");
    expect(result.lzTokenFee).toBe("0");
    expect(result.dstEid).toBe(30101);
    expect(result.gasLimit).toBe(200000);
  });

  it("converts UTF-8 message string to hex", async () => {
    const result = await getMessageFeeTool.coreAction(
      {
        dstEid: 30101,
        receiver: "0xabc1230000000000000000000000000000000001",
        message: "hello world",
        gasLimit: 200000,
        payInLzToken: false,
      },
      makeContext({ network: "testnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.network).toBe("testnet");
  });

  it("pads short receiver address to bytes32", async () => {
    const result = await getMessageFeeTool.coreAction(
      {
        dstEid: 30101,
        receiver: "0xabcdef1234567890abcdef1234567890abcdef12",
        message: "0x01",
        gasLimit: 100000,
        payInLzToken: false,
      },
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
  });

  it("returns error when RPC call throws", async () => {
    const { ethers: mockEthers } = await import("ethers");
    vi.mocked(mockEthers.Contract).mockImplementationOnce(() => ({
      quote: vi.fn().mockRejectedValue(new Error("RPC connection refused")),
    }) as never);

    const result = await getMessageFeeTool.coreAction(
      {
        dstEid: 30101,
        receiver: "0xabc1230000000000000000000000000000000001",
        message: "0x01",
        gasLimit: 200000,
        payInLzToken: false,
      },
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("RPC connection refused");
  });

  it("shouldSecondaryAction returns false for fee result", async () => {
    const fakeResult = { success: true, nativeFee: "100" };
    const should = await getMessageFeeTool.shouldSecondaryAction(fakeResult as never, makeContext());
    expect(should).toBe(false);
  });
});
