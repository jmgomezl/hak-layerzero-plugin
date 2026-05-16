import { ethers } from "ethers";
import { describe, expect, it, vi } from "vitest";
import { sendMessageTool } from "../src/tools/send-message.js";

const fakeClient = {} as never;

const VALID_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function makeContext(config?: object) {
  return { pluginConfig: { layerzero: config } } as never;
}

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  const mockWallet = {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  };
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
      Wallet: vi.fn().mockImplementation(() => mockWallet),
      Contract: vi.fn().mockImplementation(() => ({
        quote: vi.fn().mockResolvedValue({
          nativeFee: BigInt("2000000000000000"),
          lzTokenFee: BigInt("0"),
        }),
        send: vi.fn().mockResolvedValue({
          hash: "0xdeadbeef",
          wait: vi.fn().mockResolvedValue({
            hash: "0xdeadbeef",
            logs: [],
          }),
        }),
      })),
    },
  };
});

describe("layerzero_send_message", () => {
  it("returns error when no private key configured", async () => {
    const result = await sendMessageTool.coreAction(
      {
        oappAddress: "0x1234567890123456789012345678901234567890",
        dstEid: 30101,
        receiver: "0xabcdef1234567890abcdef1234567890abcdef12",
        message: "0x68656c6c6f",
        gasLimit: 200000,
      },
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("private key");
  });

  it("returns transaction payload when valid config provided", async () => {
    const result = await sendMessageTool.coreAction(
      {
        oappAddress: "0x1234567890123456789012345678901234567890",
        dstEid: 30101,
        receiver: "0xabcdef1234567890abcdef1234567890abcdef12",
        message: "0x68656c6c6f",
        gasLimit: 200000,
      },
      makeContext({ network: "mainnet", privateKey: VALID_PRIVATE_KEY }),
      fakeClient
    );

    expect(result.success).not.toBe(false);
    if ("success" in result && result.success === false) return;
    expect(result).toHaveProperty("transaction");
    expect(result).toHaveProperty("extras");
    const payload = result as { transaction: { oappAddress: string; dstEid: number }; extras: { dstEid: number } };
    expect(payload.transaction.oappAddress).toBe("0x1234567890123456789012345678901234567890");
    expect(payload.transaction.dstEid).toBe(30101);
    expect(payload.extras.dstEid).toBe(30101);
  });

  it("uses provided nativeFee instead of quoting", async () => {
    const result = await sendMessageTool.coreAction(
      {
        oappAddress: "0x1234567890123456789012345678901234567890",
        dstEid: 30101,
        receiver: "0xabcdef1234567890abcdef1234567890abcdef12",
        message: "0x01",
        gasLimit: 200000,
        nativeFee: "9999999",
      },
      makeContext({ network: "mainnet", privateKey: VALID_PRIVATE_KEY }),
      fakeClient
    );

    expect(result.success).not.toBe(false);
    if ("success" in result && result.success === false) return;
    const payload = result as { transaction: { nativeFee: string } };
    expect(payload.transaction.nativeFee).toBe("9999999");
  });

  it("shouldSecondaryAction returns true for payload with transaction", async () => {
    const payload = {
      transaction: { oappAddress: "0x1234", dstEid: 30101, message: "0x01", options: "0x00", nativeFee: "100", signer: {} },
      extras: { dstEid: 30101, receiver: "0xabc", network: "mainnet", sourceEid: 30316, estimatedFeeHbar: "0.001" },
    };
    const should = await sendMessageTool.shouldSecondaryAction(payload as never, makeContext());
    expect(should).toBe(true);
  });

  it("shouldSecondaryAction returns false for error result", async () => {
    const errorResult = { success: false, error: "some error" };
    const should = await sendMessageTool.shouldSecondaryAction(errorResult as never, makeContext());
    expect(should).toBe(false);
  });

  it("secondaryAction sends transaction and returns receipt", async () => {
    const payload = {
      transaction: {
        oappAddress: "0x1234567890123456789012345678901234567890",
        dstEid: 30101,
        message: "0x68656c6c6f",
        options: "0x0003010011010000000000000000000000000000030d40",
        nativeFee: "2000000000000000",
        signer: {} as ethers.Wallet,
      },
      extras: {
        dstEid: 30101,
        receiver: "0xabcdef1234567890abcdef1234567890abcdef12",
        network: "mainnet",
        sourceEid: 30316,
        estimatedFeeHbar: "0.002",
      },
    };

    const result = await sendMessageTool.secondaryAction(payload as never, fakeClient, makeContext());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.txHash).toBe("0xdeadbeef");
    expect(result.dstEid).toBe(30101);
    expect(result.network).toBe("mainnet");
  });
});
