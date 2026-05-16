import { BaseTool } from "@hashgraph/hedera-agent-kit";
import type { Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { z } from "zod";
import { readContextConfig, resolveConfig } from "../utils/rpc.js";

const GetMessageStatusSchema = z.object({
  srcTxHash: z
    .string()
    .optional()
    .describe("Source transaction hash from the Hedera send transaction"),
  guid: z
    .string()
    .optional()
    .describe("LayerZero message GUID (bytes32 hex) returned by layerzero_send_message"),
});

type GetMessageStatusInput = z.infer<typeof GetMessageStatusSchema>;

export type MessageStatus = "INFLIGHT" | "DELIVERED" | "FAILED" | "UNKNOWN";

export interface LayerZeroMessage {
  guid: string;
  srcTxHash: string;
  dstTxHash?: string;
  srcEid: number;
  dstEid: number;
  status: MessageStatus;
  created?: string;
  updated?: string;
}

export interface GetMessageStatusResult {
  success: true;
  status: MessageStatus;
  message: LayerZeroMessage | null;
  trackingUrl: string;
}

export interface GetMessageStatusError {
  success: false;
  error: string;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // Exponential backoff on rate limit
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr ?? new Error("Max retries exceeded");
}

export class GetMessageStatusTool extends BaseTool<GetMessageStatusInput, GetMessageStatusInput> {
  method = "layerzero_get_message_status";
  name = "LayerZero Get Message Status";
  description =
    "Checks the delivery status of a cross-chain message sent via LayerZero. " +
    "Queries the LayerZero Scan API using the source transaction hash or message GUID. " +
    "Returns INFLIGHT (in transit), DELIVERED (received on destination), FAILED, or UNKNOWN.";
  parameters = GetMessageStatusSchema;

  async normalizeParams(
    params: unknown,
    _context: Context,
    _client: Client
  ): Promise<GetMessageStatusInput> {
    return GetMessageStatusSchema.parse(params);
  }

  async coreAction(
    args: GetMessageStatusInput,
    context: Context,
    _client: Client
  ): Promise<GetMessageStatusResult | GetMessageStatusError> {
    try {
      if (!args.srcTxHash && !args.guid) {
        return { success: false, error: "Either srcTxHash or guid must be provided" };
      }

      const ctxConfig = readContextConfig(context);
      const config = resolveConfig(ctxConfig);
      const baseUrl = config.scanApiUrl;

      let apiUrl: string;
      if (args.guid) {
        apiUrl = `${baseUrl}/messages/${args.guid}`;
      } else {
        apiUrl = `${baseUrl}/messages?srcTxHash=${args.srcTxHash}`;
      }

      const trackingUrl = args.srcTxHash
        ? `https://layerzeroscan.com/tx/${args.srcTxHash}`
        : `https://layerzeroscan.com/`;

      const res = await fetchWithRetry(apiUrl);

      if (res.status === 404) {
        return {
          success: true,
          status: "UNKNOWN",
          message: null,
          trackingUrl,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          error: `LayerZero Scan API returned ${res.status}: ${await res.text()}`,
        };
      }

      // biome-ignore lint/suspicious/noExplicitAny: external API response shape
      const data = (await res.json()) as any;

      // API returns { messages: [...] } for list queries, or a single object for GUID lookup
      // biome-ignore lint/suspicious/noExplicitAny: external API response
      const messages: any[] = Array.isArray(data) ? data : data.messages ?? [data];

      if (messages.length === 0) {
        return { success: true, status: "UNKNOWN", message: null, trackingUrl };
      }

      const msg = messages[0];
      const status: MessageStatus =
        msg.status === "DELIVERED"
          ? "DELIVERED"
          : msg.status === "FAILED"
            ? "FAILED"
            : msg.status === "INFLIGHT"
              ? "INFLIGHT"
              : "UNKNOWN";

      return {
        success: true,
        status,
        message: {
          guid: msg.guid ?? msg.id ?? "",
          srcTxHash: msg.srcTxHash ?? args.srcTxHash ?? "",
          dstTxHash: msg.dstTxHash,
          srcEid: msg.srcEid ?? 0,
          dstEid: msg.dstEid ?? 0,
          status,
          created: msg.created,
          updated: msg.updated,
        },
        trackingUrl,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  override async shouldSecondaryAction(
    coreResult: GetMessageStatusResult | GetMessageStatusError
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

export const getMessageStatusTool = new GetMessageStatusTool();
