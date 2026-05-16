import { BaseTool } from "@hashgraph/hedera-agent-kit";
import type { Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { z } from "zod";
import { KNOWN_DESTINATION_CHAINS } from "../networks.js";
import { readContextConfig, resolveConfig } from "../utils/rpc.js";

const GetSupportedChainsSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe("Optional name filter — returns only chains whose name contains this string (case-insensitive)"),
  network: z
    .enum(["mainnet", "testnet"])
    .optional()
    .describe("Which network to report EIDs for. Defaults to plugin config / env / mainnet."),
});

type GetSupportedChainsInput = z.infer<typeof GetSupportedChainsSchema>;

export interface SupportedChain {
  name: string;
  eid: number;
  network: "mainnet" | "testnet";
}

export interface GetSupportedChainsResult {
  success: true;
  chains: SupportedChain[];
  sourceEid: number;
  sourceNetwork: "mainnet" | "testnet";
  total: number;
}

export interface GetSupportedChainsError {
  success: false;
  error: string;
}

export class GetSupportedChainsTool extends BaseTool<
  GetSupportedChainsInput,
  GetSupportedChainsInput
> {
  method = "layerzero_get_supported_chains";
  name = "LayerZero Get Supported Chains";
  description =
    "Lists all EVM chains reachable from Hedera via LayerZero V2. Returns chain names and their LayerZero endpoint IDs (EIDs). Use this before sending a cross-chain message to find the destination chain's EID.";
  parameters = GetSupportedChainsSchema;

  async normalizeParams(
    params: unknown,
    _context: Context,
    _client: Client
  ): Promise<GetSupportedChainsInput> {
    return GetSupportedChainsSchema.parse(params);
  }

  async coreAction(
    args: GetSupportedChainsInput,
    context: Context,
    _client: Client
  ): Promise<GetSupportedChainsResult | GetSupportedChainsError> {
    try {
      const ctxConfig = readContextConfig(context);
      const config = resolveConfig(ctxConfig);
      const network = args.network ?? config.network;

      let chains: SupportedChain[] = KNOWN_DESTINATION_CHAINS.map((c) => ({
        name: c.name,
        eid: network === "mainnet" ? c.mainnetEid : (c.testnetEid ?? c.mainnetEid),
        network,
      }));

      if (args.filter) {
        const lower = args.filter.toLowerCase();
        chains = chains.filter((c) => c.name.toLowerCase().includes(lower));
      }

      return {
        success: true,
        chains,
        sourceEid: config.endpointId,
        sourceNetwork: config.network,
        total: chains.length,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  override async shouldSecondaryAction(
    coreResult: GetSupportedChainsResult | GetSupportedChainsError
  ): Promise<boolean> {
    return (
      typeof coreResult === "object" && coreResult !== null && "transaction" in coreResult
    );
  }

  async secondaryAction(
    payload: never,
    _client: Client,
    _context: Context
  ): Promise<never> {
    return payload;
  }
}

export const getSupportedChainsTool = new GetSupportedChainsTool();
