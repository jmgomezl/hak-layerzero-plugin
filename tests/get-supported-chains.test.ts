import { describe, expect, it } from "vitest";
import { KNOWN_DESTINATION_CHAINS, LAYERZERO_MAINNET, LAYERZERO_TESTNET } from "../src/networks.js";
import { getSupportedChainsTool } from "../src/tools/get-supported-chains.js";

const fakeClient = {} as never;

function makeContext(config?: object) {
  return { pluginConfig: { layerzero: config } } as never;
}

describe("layerzero_get_supported_chains", () => {
  it("returns all chains for mainnet by default", async () => {
    const result = await getSupportedChainsTool.coreAction(
      {},
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.sourceEid).toBe(LAYERZERO_MAINNET.endpointId);
    expect(result.total).toBe(KNOWN_DESTINATION_CHAINS.length);
    expect(result.chains.length).toBe(KNOWN_DESTINATION_CHAINS.length);
    expect(result.chains[0]).toMatchObject({ name: expect.any(String), eid: expect.any(Number), network: "mainnet" });
  });

  it("returns testnet EIDs when network=testnet", async () => {
    const result = await getSupportedChainsTool.coreAction(
      { network: "testnet" },
      makeContext(),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.chains[0].network).toBe("testnet");
    const eth = result.chains.find((c) => c.name === "Ethereum");
    expect(eth?.eid).toBe(40161);
  });

  it("filters chains by name (case-insensitive)", async () => {
    const result = await getSupportedChainsTool.coreAction(
      { filter: "arb" },
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.chains.length).toBe(1);
    expect(result.chains[0].name).toBe("Arbitrum One");
    expect(result.chains[0].eid).toBe(30110);
  });

  it("returns empty array for non-matching filter", async () => {
    const result = await getSupportedChainsTool.coreAction(
      { filter: "zzznomatch" },
      makeContext({ network: "mainnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.chains).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("uses testnet sourceEid when config network is testnet", async () => {
    const result = await getSupportedChainsTool.coreAction(
      {},
      makeContext({ network: "testnet" }),
      fakeClient
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.sourceEid).toBe(LAYERZERO_TESTNET.endpointId);
  });

  it("shouldSecondaryAction returns false for query result", async () => {
    const result = await getSupportedChainsTool.coreAction({}, makeContext(), fakeClient);
    const should = await getSupportedChainsTool.shouldSecondaryAction(result as never, makeContext());
    expect(should).toBe(false);
  });
});
