export { layerzeroPlugin } from "./plugin.js";
export { layerzeroPlugin as default } from "./plugin.js";

export const layerzeroPluginToolNames = {
  LAYERZERO_GET_SUPPORTED_CHAINS: "layerzero_get_supported_chains",
  LAYERZERO_GET_MESSAGE_FEE: "layerzero_get_message_fee",
  LAYERZERO_SEND_MESSAGE: "layerzero_send_message",
  LAYERZERO_GET_MESSAGE_STATUS: "layerzero_get_message_status",
} as const;

export {
  LAYERZERO_MAINNET,
  LAYERZERO_TESTNET,
  NETWORK_DEFAULTS,
  KNOWN_DESTINATION_CHAINS,
  readNetwork,
} from "./networks.js";
export type { LayerZeroNetworkDefaults, LayerZeroConfig } from "./networks.js";

export { getSupportedChainsTool } from "./tools/get-supported-chains.js";
export { getMessageFeeTool } from "./tools/get-message-fee.js";
export { sendMessageTool } from "./tools/send-message.js";
export { getMessageStatusTool } from "./tools/get-message-status.js";

export type {
  SupportedChain,
  GetSupportedChainsResult,
  GetSupportedChainsError,
} from "./tools/get-supported-chains.js";
export type {
  GetMessageFeeResult,
  GetMessageFeeError,
} from "./tools/get-message-fee.js";
export type {
  SendMessageResult,
  SendMessageError,
  SendMessagePayload,
} from "./tools/send-message.js";
export type {
  GetMessageStatusResult,
  GetMessageStatusError,
  LayerZeroMessage,
  MessageStatus,
} from "./tools/get-message-status.js";
