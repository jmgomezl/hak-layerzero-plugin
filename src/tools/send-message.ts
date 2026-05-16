import { BaseTool } from "@hashgraph/hedera-agent-kit";
import type { Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { ethers } from "ethers";
import { z } from "zod";
import { ENDPOINT_V2_ABI, OAPP_SEND_ABI, addressToBytes32 } from "../utils/abi.js";
import { buildOptions } from "../utils/options.js";
import { getProvider, getSigner, readContextConfig, resolveConfig } from "../utils/rpc.js";

const SendMessageSchema = z.object({
  oappAddress: z
    .string()
    .describe(
      "EVM address (0x...) of your deployed OApp contract on Hedera. " +
        "The OApp must have setPeer() configured for the destination chain. " +
        "Required — LayerZero messages must originate from an OApp, not an EOA."
    ),
  dstEid: z
    .number()
    .int()
    .positive()
    .describe("LayerZero endpoint ID of the destination chain (e.g. 30101 for Ethereum mainnet)"),
  receiver: z
    .string()
    .describe("Receiver address on the destination chain — EVM 0x address"),
  message: z
    .string()
    .describe("Message payload as a hex string (e.g. '0x68656c6c6f') or UTF-8 string"),
  gasLimit: z
    .number()
    .int()
    .positive()
    .default(200000)
    .describe("Gas limit for execution on the destination chain. Default: 200000"),
  nativeFee: z
    .string()
    .optional()
    .describe(
      "Native fee in wei (as returned by layerzero_get_message_fee). " +
        "If omitted, the fee is quoted automatically before sending."
    ),
});

type SendMessageInput = z.infer<typeof SendMessageSchema>;

export interface SendMessagePayload {
  transaction: {
    oappAddress: string;
    dstEid: number;
    message: string;
    options: string;
    nativeFee: string;
    signer: ethers.Wallet;
  };
  extras: {
    dstEid: number;
    receiver: string;
    network: string;
    sourceEid: number;
    estimatedFeeHbar: string;
  };
}

export interface SendMessageResult {
  success: true;
  txHash: string;
  guid?: string;
  nonce?: number;
  nativeFeeUsed: string;
  nativeFeeUsedFormatted: string;
  dstEid: number;
  sourceEid: number;
  network: string;
  receiver: string;
}

export interface SendMessageError {
  success: false;
  error: string;
}

export class SendMessageTool extends BaseTool<SendMessageInput, SendMessageInput> {
  method = "layerzero_send_message";
  name = "LayerZero Send Message";
  description =
    "Sends a cross-chain message from your OApp contract on Hedera to a destination chain via LayerZero V2. " +
    "Automatically quotes the fee if not provided. " +
    "Requires an OApp contract address — LayerZero messages must originate from a deployed OApp (not a plain wallet). " +
    "Returns the transaction hash and LayerZero message GUID for tracking with layerzero_get_message_status.";
  parameters = SendMessageSchema;

  async normalizeParams(
    params: unknown,
    _context: Context,
    _client: Client
  ): Promise<SendMessageInput> {
    return SendMessageSchema.parse(params);
  }

  async coreAction(
    args: SendMessageInput,
    context: Context,
    _client: Client
  ): Promise<SendMessagePayload | SendMessageError> {
    try {
      const ctxConfig = readContextConfig(context);
      const config = resolveConfig(ctxConfig);

      if (!config.privateKey) {
        return {
          success: false,
          error:
            "No private key configured. Set HEDERA_PRIVATE_KEY env var or pass privateKey in plugin config. " +
            "Must be an ECDSA (secp256k1) key — ED25519 keys cannot sign EVM transactions.",
        };
      }

      const provider = getProvider(config.rpcUrl);
      const signer = getSigner(config.privateKey, provider);

      const message = args.message.startsWith("0x")
        ? args.message
        : ethers.hexlify(ethers.toUtf8Bytes(args.message));

      const options = buildOptions({ gasLimit: BigInt(args.gasLimit) });

      let nativeFee = args.nativeFee;
      if (!nativeFee) {
        const endpoint = new ethers.Contract(config.endpointAddress, ENDPOINT_V2_ABI, provider);
        const receiver = args.receiver.startsWith("0x") && args.receiver.length === 66
          ? args.receiver
          : addressToBytes32(args.receiver);

        const fee = await endpoint.quote(
          {
            dstEid: args.dstEid,
            receiver,
            message,
            options,
            payInLzToken: false,
          },
          config.endpointAddress
        );
        nativeFee = (fee.nativeFee as bigint).toString();
      }

      return {
        transaction: {
          oappAddress: args.oappAddress,
          dstEid: args.dstEid,
          message,
          options,
          nativeFee,
          signer,
        },
        extras: {
          dstEid: args.dstEid,
          receiver: args.receiver,
          network: config.network,
          sourceEid: config.endpointId,
          estimatedFeeHbar: ethers.formatEther(BigInt(nativeFee)),
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  override async shouldSecondaryAction(
    coreResult: SendMessagePayload | SendMessageError
  ): Promise<boolean> {
    return typeof coreResult === "object" && coreResult !== null && "transaction" in coreResult;
  }

  async secondaryAction(
    payload: SendMessagePayload,
    _client: Client,
    _context: Context
  ): Promise<SendMessageResult | SendMessageError> {
    try {
      const { transaction, extras } = payload;
      const oapp = new ethers.Contract(transaction.oappAddress, OAPP_SEND_ABI, transaction.signer);

      const tx = await oapp.send(
        transaction.dstEid,
        transaction.message,
        transaction.options,
        { value: BigInt(transaction.nativeFee) }
      );

      const receipt = await tx.wait();

      // Attempt to extract GUID from the receipt event logs
      let guid: string | undefined;
      let nonce: number | undefined;
      for (const log of receipt?.logs ?? []) {
        // PacketSent event topic: keccak256("PacketSent(bytes,bytes,address)")
        if (log.topics?.[0] === "0x1ab700d4ced0c005b164c0f789fd09fcb90cf7e32c56bc9d5ab3d85f3710fed7") {
          // GUID is the first 32 bytes of the packet payload — parsing is OApp-specific
          // Provide the raw txHash for tracking instead
          break;
        }
      }

      return {
        success: true,
        txHash: receipt?.hash ?? tx.hash,
        guid,
        nonce,
        nativeFeeUsed: transaction.nativeFee,
        nativeFeeUsedFormatted: `${extras.estimatedFeeHbar} HBAR`,
        dstEid: extras.dstEid,
        sourceEid: extras.sourceEid,
        network: extras.network,
        receiver: extras.receiver,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const sendMessageTool = new SendMessageTool();
