import { getMessageFeeTool } from "./tools/get-message-fee.js";
import { getMessageStatusTool } from "./tools/get-message-status.js";
import { getSupportedChainsTool } from "./tools/get-supported-chains.js";
import { sendMessageTool } from "./tools/send-message.js";

export const layerzeroPlugin = {
  name: "hak-layerzero-plugin",
  version: "1.0.0",
  tools: [getSupportedChainsTool, getMessageFeeTool, sendMessageTool, getMessageStatusTool],
};
