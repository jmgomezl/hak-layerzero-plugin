export interface LayerZeroNetworkDefaults {
  /** LayerZero EndpointV2 EVM address on Hedera */
  endpointAddress: string;
  /** LayerZero endpoint ID (EID) for this Hedera network */
  endpointId: number;
  /** Hedera JSON-RPC relay URL (Hashio) */
  rpcUrl: string;
  /** LayerZero Scan API base URL */
  scanApiUrl: string;
}

export interface LayerZeroConfig {
  network?: "mainnet" | "testnet";
  endpointAddress?: string;
  endpointId?: number;
  rpcUrl?: string;
  scanApiUrl?: string;
  /** ECDSA private key (hex) for signing transactions — required for send operations */
  privateKey?: string;
}

// Source: https://github.com/LayerZero-Labs/lz-address-book/blob/main/src/generated/LZAddresses.sol
export const LAYERZERO_MAINNET: LayerZeroNetworkDefaults = {
  endpointAddress: "0x3A73033C0b1407574C76BdBAc67f126f6b4a9AA9",
  endpointId: 30316,
  rpcUrl: "https://mainnet.hashio.io/api",
  scanApiUrl: "https://scan.layerzero-api.com/v1",
};

export const LAYERZERO_TESTNET: LayerZeroNetworkDefaults = {
  endpointAddress: "0xbD672D1562Dd32C23B563C989d8140122483631d",
  endpointId: 40285,
  rpcUrl: "https://testnet.hashio.io/api",
  scanApiUrl: "https://scan.layerzero-api.com/v1",
};

export const NETWORK_DEFAULTS: Record<"mainnet" | "testnet", LayerZeroNetworkDefaults> = {
  mainnet: LAYERZERO_MAINNET,
  testnet: LAYERZERO_TESTNET,
};

/** Well-known destination chain EIDs reachable from Hedera via LayerZero V2. */
export const KNOWN_DESTINATION_CHAINS = [
  { name: "Ethereum", mainnetEid: 30101, testnetEid: 40161 },
  { name: "BNB Chain", mainnetEid: 30102, testnetEid: 40102 },
  { name: "Avalanche", mainnetEid: 30106, testnetEid: 40106 },
  { name: "Polygon", mainnetEid: 30109, testnetEid: 40109 },
  { name: "Arbitrum One", mainnetEid: 30110, testnetEid: 40231 },
  { name: "Optimism", mainnetEid: 30111, testnetEid: 40232 },
  { name: "Base", mainnetEid: 30184, testnetEid: 40245 },
  { name: "Linea", mainnetEid: 30183, testnetEid: null },
  { name: "zkSync", mainnetEid: 30165, testnetEid: 40305 },
  { name: "Scroll", mainnetEid: 30214, testnetEid: 40170 },
  { name: "Mantle", mainnetEid: 30181, testnetEid: 40246 },
  { name: "Fantom", mainnetEid: 30112, testnetEid: 40112 },
  { name: "Celo", mainnetEid: 30125, testnetEid: 40125 },
  { name: "Moonbeam", mainnetEid: 30126, testnetEid: 40126 },
  { name: "Gnosis", mainnetEid: 30145, testnetEid: 40145 },
] as const;

export function readNetwork(value: string | undefined): "mainnet" | "testnet" | undefined {
  if (value === "mainnet" || value === "testnet") return value;
  return undefined;
}
