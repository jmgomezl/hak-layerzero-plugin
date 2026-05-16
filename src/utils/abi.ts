/** Minimal ABI fragments for LayerZero EndpointV2 */
export const ENDPOINT_V2_ABI = [
  {
    name: "quote",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "_params",
        type: "tuple",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "receiver", type: "bytes32" },
          { name: "message", type: "bytes" },
          { name: "options", type: "bytes" },
          { name: "payInLzToken", type: "bool" },
        ],
      },
      { name: "_sender", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" },
        ],
      },
    ],
  },
] as const;

/** Minimal ABI for a standard LayerZero OApp send function */
export const OAPP_SEND_ABI = [
  {
    name: "send",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_dstEid", type: "uint32" },
      { name: "_message", type: "bytes" },
      { name: "_options", type: "bytes" },
    ],
    outputs: [
      {
        name: "receipt",
        type: "tuple",
        components: [
          { name: "guid", type: "bytes32" },
          { name: "nonce", type: "uint64" },
          {
            name: "fee",
            type: "tuple",
            components: [
              { name: "nativeFee", type: "uint256" },
              { name: "lzTokenFee", type: "uint256" },
            ],
          },
        ],
      },
    ],
  },
] as const;

/** Converts an EVM address (0x...) to a bytes32 padded value for LayerZero receiver field */
export function addressToBytes32(address: string): string {
  return `0x${address.replace(/^0x/, "").toLowerCase().padStart(64, "0")}`;
}
