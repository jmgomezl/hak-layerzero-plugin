import { BaseTool } from "@hashgraph/hedera-agent-kit";
import type { Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { ethers } from "ethers";
import { z } from "zod";
import { ENDPOINT_V2_ABI, addressToBytes32 } from "../utils/abi.js";
import { buildOptions } from "../utils/options.js";
import { getProvider, readContextConfig, resolveConfig } from "../utils/rpc.js";

const GetMessageFeeSchema = z.object({
  dstEid: z
    .number()
    .int()
    .positive()
    .describe("LayerZero endpoint ID of the destination chain (e.g. 30101 for Ethereum mainnet)"),
  receiver: z
    .string()
    .describe("Receiver address on the destination chain — EVM 0x address or bytes32 hex"),
  message: z
    .string()
    .describe("Message payload as a hex string (e.g. '0x68656c6c6f') or UTF-8 string"),
  gasLimit: z
    .number()
    .int()
    .positive()
    .default(200000)
    .describe("Gas limit for execution on the destination chain. Default: 200000"),
  payInLzToken: z
    .boolean()
    .default(false)
    .describe("Whether to pay the LayerZero fee in ZRO token instead of native gas. Default: false"),
});

type GetMessageFeeInput = z.infer<typeof GetMessageFeeSchema>;

export interface GetMessageFeeResult {
  success: true;
  nativeFee: string;
  nativeFeeFormatted: string;
  lzTokenFee: string;
  dstEid: number;
  sourceEid: number;
  network: string;
  gasLimit: number;
}

export interface GetMessageFeeError {
  success: false;
  error: string;
}

export class GetMessageFeeTool extends BaseTool<GetMessageFeeInput, GetMessageFeeInput> {
  method = "layerzero_get_message_fee";
  name = "LayerZero Get Message Fee";
  description =
    "Estimates the native token fee (in HBAR wei) required to send a cross-chain message from Hedera to a destination chain via LayerZero. Makes a free on-chain view call to EndpointV2.quote(). Always call this before layerzero_send_message to get the required fee.";
  parameters = GetMessageFeeSchema;

  async normalizeParams(
    params: unknown,
    _context: Context,
    _client: Client
  ): Promise<GetMessageFeeInput> {
    return GetMessageFeeSchema.parse(params);
  }

  async coreAction(
    args: GetMessageFeeInput,
    context: Context,
    _client: Client
  ): Promise<GetMessageFeeResult | GetMessageFeeError> {
    try {
      const ctxConfig = readContextConfig(context);
      const config = resolveConfig(ctxConfig);

      const provider = getProvider(config.rpcUrl);
      const endpoint = new ethers.Contract(config.endpointAddress, ENDPOINT_V2_ABI, provider);

      const receiver = args.receiver.startsWith("0x") && args.receiver.length === 66
        ? args.receiver
        : addressToBytes32(args.receiver);

      const message = args.message.startsWith("0x")
        ? args.message
        : ethers.hexlify(ethers.toUtf8Bytes(args.message));

      const options = buildOptions({ gasLimit: BigInt(args.gasLimit) });

      const messagingParams = {
        dstEid: args.dstEid,
        receiver,
        message,
        options,
        payInLzToken: args.payInLzToken,
      };

      const fee = await endpoint.quote(messagingParams, config.endpointAddress);
      const nativeFee: bigint = fee.nativeFee;
      const lzTokenFee: bigint = fee.lzTokenFee;

      return {
        success: true,
        nativeFee: nativeFee.toString(),
        nativeFeeFormatted: `${ethers.formatEther(nativeFee)} HBAR`,
        lzTokenFee: lzTokenFee.toString(),
        dstEid: args.dstEid,
        sourceEid: config.endpointId,
        network: config.network,
        gasLimit: args.gasLimit,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  override async shouldSecondaryAction(
    coreResult: GetMessageFeeResult | GetMessageFeeError
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

export const getMessageFeeTool = new GetMessageFeeTool();
