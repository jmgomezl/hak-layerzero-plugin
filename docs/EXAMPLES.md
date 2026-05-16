# Examples — hak-layerzero-plugin

## 1. Discover Supported Chains

```typescript
// List all chains reachable from Hedera
const result = await agent.executeTool("layerzero_get_supported_chains", {});
// result.chains = [{ name: "Ethereum", eid: 30101, network: "mainnet" }, ...]

// Filter by name
const arb = await agent.executeTool("layerzero_get_supported_chains", {
  filter: "arbitrum",
  network: "mainnet",
});
// arb.chains = [{ name: "Arbitrum One", eid: 30110, network: "mainnet" }]
```

## 2. Estimate Cross-Chain Message Fee

```typescript
const fee = await agent.executeTool("layerzero_get_message_fee", {
  dstEid: 30110,                                          // Arbitrum One mainnet
  receiver: "0xabc1230000000000000000000000000000001234", // your receiver contract
  message: "Hello Arbitrum",                              // plain UTF-8 or 0x hex
  gasLimit: 200000,
});

console.log(fee.nativeFeeFormatted); // e.g. "0.0032 HBAR"
console.log(fee.nativeFee);          // "3200000000000000" (wei string)
```

## 3. Send a Cross-Chain Message

Prerequisites:
- A deployed OApp contract on Hedera with `setPeer()` configured for the destination
- An ECDSA Hedera account with HBAR balance

```typescript
const send = await agent.executeTool("layerzero_send_message", {
  oappAddress: "0xYourOAppOnHedera",
  dstEid: 30110,                                          // Arbitrum One
  receiver: "0xYourReceiverOnArbitrum",
  message: "Hello from Hedera!",
  gasLimit: 200000,
  // nativeFee omitted → quoted automatically
});

console.log(send.txHash);  // Hedera source tx hash
console.log(send.guid);    // LayerZero message GUID (for status tracking)
```

## 4. Track Message Delivery

```typescript
// Poll by source tx hash (most common after layerzero_send_message)
const status = await agent.executeTool("layerzero_get_message_status", {
  srcTxHash: send.txHash,
});

console.log(status.status);       // "INFLIGHT" | "DELIVERED" | "FAILED" | "UNKNOWN"
console.log(status.trackingUrl);  // https://layerzeroscan.com/tx/0x...
```

## 5. Full Cross-Chain Workflow (fee → send → track)

```typescript
const OAPP = "0xYourOAppOnHedera";
const DST_EID = 30101;   // Ethereum mainnet
const RECEIVER = "0xYourReceiverOnEthereum";
const MESSAGE = "Cross-chain ping from Hedera";

// Step 1: estimate fee
const fee = await agent.executeTool("layerzero_get_message_fee", {
  dstEid: DST_EID,
  receiver: RECEIVER,
  message: MESSAGE,
  gasLimit: 200000,
});

console.log(`Fee: ${fee.nativeFeeFormatted}`);

// Step 2: send with quoted fee (avoids second on-chain quote)
const tx = await agent.executeTool("layerzero_send_message", {
  oappAddress: OAPP,
  dstEid: DST_EID,
  receiver: RECEIVER,
  message: MESSAGE,
  gasLimit: 200000,
  nativeFee: fee.nativeFee,  // pass pre-quoted fee to skip re-quoting
});

console.log(`Sent! Tx: ${tx.txHash}`);

// Step 3: poll status (typically 1-5 minutes for delivery)
let status;
do {
  await new Promise((r) => setTimeout(r, 30_000));
  status = await agent.executeTool("layerzero_get_message_status", {
    srcTxHash: tx.txHash,
  });
  console.log(`Status: ${status.status}`);
} while (status.status === "INFLIGHT");

console.log(`Final: ${status.status}`);
console.log(`Track: ${status.trackingUrl}`);
```

## 6. Testnet End-to-End (Hedera Testnet → Avalanche Fuji)

```typescript
import { LAYERZERO_TESTNET } from "hak-layerzero-plugin";

const agent = new HederaAgentKit({
  plugins: [layerzeroPlugin],
  pluginConfig: {
    layerzero: {
      ...LAYERZERO_TESTNET,
      network: "testnet",
      privateKey: process.env.HEDERA_TESTNET_PRIVATE_KEY,
    },
  },
});

const send = await agent.executeTool("layerzero_send_message", {
  oappAddress: "0xYourTestnetOApp",
  dstEid: 40106,           // Avalanche Fuji testnet
  receiver: "0xYourFujiReceiver",
  message: "0x68656c6c6f",  // "hello" in hex
  gasLimit: 150000,
});

// Track on testnet scan
console.log(`https://testnet.layerzeroscan.com/tx/${send.txHash}`);
```

## Notes on Gas Limits

- **200000** — safe default for simple message receipt (`lzReceive` callback with minimal logic)
- **300000–500000** — if your receiver does token operations or storage writes
- **100000** — minimum for a no-op receiver

Underestimating gas causes the message to revert on the destination — it will show as `FAILED` on LayerZero Scan and can be [retried](https://docs.layerzero.network/v2/developers/evm/troubleshooting/debugging-messages).
