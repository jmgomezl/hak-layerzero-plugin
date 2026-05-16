import { ethers } from "ethers";
import type { LayerZeroConfig } from "../networks.js";
import { NETWORK_DEFAULTS, readNetwork } from "../networks.js";

/**
 * Resolves the effective LayerZero config by merging (highest to lowest priority):
 *   ctxConfig > env vars > network defaults
 */
export function resolveConfig(ctxConfig: LayerZeroConfig | undefined): Required<LayerZeroConfig> {
  const network =
    ctxConfig?.network ?? readNetwork(process.env.LAYERZERO_NETWORK) ?? "mainnet";
  const defaults = NETWORK_DEFAULTS[network];

  return {
    network,
    endpointAddress:
      ctxConfig?.endpointAddress ??
      process.env.LAYERZERO_ENDPOINT_ADDRESS ??
      defaults.endpointAddress,
    endpointId: ctxConfig?.endpointId ?? defaults.endpointId,
    rpcUrl: ctxConfig?.rpcUrl ?? process.env.HEDERA_RPC_URL ?? defaults.rpcUrl,
    scanApiUrl:
      ctxConfig?.scanApiUrl ??
      process.env.LAYERZERO_SCAN_API_URL ??
      defaults.scanApiUrl,
    privateKey: ctxConfig?.privateKey ?? process.env.HEDERA_PRIVATE_KEY ?? "",
  };
}

/** Returns a read-only JSON-RPC provider connected to the Hedera Hashio relay. */
export function getProvider(rpcUrl: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl);
}

/** Returns a signer from an ECDSA private key connected to the given provider. */
export function getSigner(privateKey: string, provider: ethers.JsonRpcProvider): ethers.Wallet {
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  return new ethers.Wallet(key, provider);
}

/**
 * Reads context.config?.layerzero or context.pluginConfig?.layerzero.
 * Returns undefined if neither is present.
 */
// biome-ignore lint/suspicious/noExplicitAny: HAK context type is not exposed publicly
export function readContextConfig(context: any): LayerZeroConfig | undefined {
  return context?.config?.layerzero ?? context?.pluginConfig?.layerzero ?? undefined;
}
