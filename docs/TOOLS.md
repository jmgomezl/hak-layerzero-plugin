# Tool Reference — hak-layerzero-plugin

This document describes each tool exposed by `hak-layerzero-plugin` in detail.

---

## `layerzero_get_supported_chains`

**Type:** Query (no transaction, no gas)

Lists all EVM chains reachable from Hedera via LayerZero V2, with their LayerZero endpoint IDs (EIDs). Use this before sending a message to find the destination chain's EID.

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `filter` | `string` | No | — | Name filter — returns only chains whose name contains this string (case-insensitive) |
| `network` | `"mainnet" \| "testnet"` | No | plugin config | Which network's EIDs to return |

### Return Shape

```typescript
{
  success: true,
  chains: Array<{ name: string; eid: number; network: "mainnet" | "testnet" }>,
  sourceEid: number,       // Hedera's EID (30316 mainnet / 40285 testnet)
  sourceNetwork: string,
  total: number,
}
// or on error:
{ success: false, error: string }
```

### Example Prompts

- *"What chains can I reach from Hedera via LayerZero?"*
- *"Show me LayerZero testnet chains containing 'arb'"*
- *"List all supported cross-chain destinations"*

### Error Behavior

Returns `{ success: false, error: "..." }` — never throws.

---

## `layerzero_get_message_fee`

**Type:** Query (free on-chain view call via `EndpointV2.quote()`)

Estimates the native HBAR fee required to send a cross-chain message from Hedera to a destination chain. Always call this before `layerzero_send_message` to obtain the required fee.

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `dstEid` | `number` | **Yes** | — | LayerZero EID of the destination chain (e.g. `30101` for Ethereum mainnet) |
| `receiver` | `string` | **Yes** | — | Receiver address on the destination chain (EVM `0x` address) |
| `message` | `string` | **Yes** | — | Message payload — hex string (e.g. `0x68656c6c6f`) or plain UTF-8 |
| `gasLimit` | `number` | No | `200000` | Gas limit for execution on the destination chain |
| `payInLzToken` | `boolean` | No | `false` | Pay fee in ZRO token instead of native HBAR |

### Return Shape

```typescript
{
  success: true,
  nativeFee: string,           // fee in wei (18 decimals), as string
  nativeFeeFormatted: string,  // human-readable, e.g. "0.002 HBAR"
  lzTokenFee: string,          // ZRO fee (usually "0")
  dstEid: number,
  sourceEid: number,
  network: string,
  gasLimit: number,
}
// or on error:
{ success: false, error: string }
```

### Example Prompts

- *"How much HBAR does it cost to send a message to Ethereum via LayerZero?"*
- *"Get the LayerZero fee to message Arbitrum One (EID 30110) with 300000 gas"*
- *"Estimate cross-chain message fee from Hedera to Base"*

### Error Behavior

Returns `{ success: false, error: "..." }` on RPC failure. Never throws.

---

## `layerzero_send_message`

**Type:** Transaction (calls your OApp contract's `send()`, costs HBAR)

Sends a cross-chain message from your deployed OApp contract on Hedera to a destination chain via LayerZero V2. Automatically quotes the fee if `nativeFee` is not provided.

> **OApp required:** LayerZero messages must originate from a deployed OApp smart contract (not a plain wallet). Your OApp must have `setPeer()` configured for the destination chain.

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `oappAddress` | `string` | **Yes** | — | EVM address (`0x...`) of your deployed OApp contract on Hedera |
| `dstEid` | `number` | **Yes** | — | LayerZero EID of the destination chain |
| `receiver` | `string` | **Yes** | — | Receiver address on the destination chain |
| `message` | `string` | **Yes** | — | Message payload — hex string or plain UTF-8 |
| `gasLimit` | `number` | No | `200000` | Gas limit for execution on the destination chain |
| `nativeFee` | `string` | No | auto-quoted | Native fee in wei. If omitted, quoted automatically before sending. |

### Return Shape

```typescript
{
  success: true,
  txHash: string,              // Hedera source transaction hash
  guid?: string,               // LayerZero message GUID (if parseable from logs)
  nonce?: number,
  nativeFeeUsed: string,       // actual fee paid in wei
  nativeFeeUsedFormatted: string,
  dstEid: number,
  sourceEid: number,
  network: string,
  receiver: string,
}
// or on error:
{ success: false, error: string }
```

### Example Prompts

- *"Send 'Hello Ethereum' to 0xABC...123 on Ethereum (EID 30101) from my OApp at 0xDEF...456"*
- *"Bridge a message to Arbitrum using my LayerZero OApp. OApp address: 0x..., destination: 0x..., gas: 250000"*

### Error Behavior

- Missing private key → `{ success: false, error: "No private key configured..." }`
- RPC/contract failure → `{ success: false, error: "..." }`
- Never throws.

---

## `layerzero_get_message_status`

**Type:** Query (calls LayerZero Scan REST API — no gas)

Checks the delivery status of a cross-chain message sent via LayerZero. Provide either the source transaction hash (from `layerzero_send_message`) or the message GUID.

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `srcTxHash` | `string` | One of these | — | Source transaction hash from the Hedera send transaction |
| `guid` | `string` | One of these | — | LayerZero message GUID (bytes32 hex) |

### Return Shape

```typescript
{
  success: true,
  status: "INFLIGHT" | "DELIVERED" | "FAILED" | "UNKNOWN",
  message: {
    guid: string,
    srcTxHash: string,
    dstTxHash?: string,    // populated once delivered
    srcEid: number,
    dstEid: number,
    status: MessageStatus,
    created?: string,
    updated?: string,
  } | null,
  trackingUrl: string,     // https://layerzeroscan.com/tx/{txHash}
}
// or on error:
{ success: false, error: string }
```

### Status Values

| Status | Meaning |
|---|---|
| `INFLIGHT` | Message is in transit — DVNs are verifying |
| `DELIVERED` | Message was received and executed on destination |
| `FAILED` | Verification or execution failed |
| `UNKNOWN` | Not found in LayerZero Scan (may be too recent or invalid hash) |

### Example Prompts

- *"What's the status of my LayerZero message with tx hash 0xdeadbeef...?"*
- *"Check if my cross-chain message was delivered. GUID: 0xabc123..."*
- *"Has my Hedera → Ethereum message been received?"*

### Error Behavior

- API 404 → `{ success: true, status: "UNKNOWN", message: null }`
- API 5xx → `{ success: false, error: "LayerZero Scan API returned 500: ..." }`
- Rate limit (429) → retried with exponential backoff (up to 3 attempts)
