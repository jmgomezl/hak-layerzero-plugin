# hak-layerzero-plugin

A [Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit-js) plugin that enables AI agents to send cross-chain messages and query fees between Hedera and 150+ EVM chains via [LayerZero V2](https://layerzero.network/).

## Overview

[LayerZero](https://layerzero.network/) is a battle-tested omnichain interoperability protocol active on 150+ chains, including Hedera mainnet (since October 2024). This plugin fills the cross-chain gap in the Hedera DeFi agent stack — alongside [hak-saucerswap-plugin](https://www.npmjs.com/package/hak-saucerswap-plugin) (DEX), [hak-stader-plugin](https://www.npmjs.com/package/hak-stader-plugin) (liquid staking), and [hak-pyth-plugin](https://www.npmjs.com/package/hak-pyth-plugin) (price feeds).

## Installation

```bash
npm install hak-layerzero-plugin
```

## Quick Start

```typescript
import HederaAgentKit from "@hashgraph/hedera-agent-kit";
import layerzeroPlugin, { LAYERZERO_TESTNET } from "hak-layerzero-plugin";

const agent = new HederaAgentKit({
  // ... your HAK config
  plugins: [layerzeroPlugin],
  pluginConfig: {
    layerzero: {
      ...LAYERZERO_TESTNET,           // spreads endpointAddress, endpointId, rpcUrl, scanApiUrl
      network: "testnet",
      privateKey: process.env.HEDERA_PRIVATE_KEY,
    },
  },
});
```

**Mainnet:**
```typescript
import { LAYERZERO_MAINNET } from "hak-layerzero-plugin";

pluginConfig: {
  layerzero: {
    ...LAYERZERO_MAINNET,
    network: "mainnet",
    privateKey: process.env.HEDERA_PRIVATE_KEY,
  },
}
```

**Using only environment variables (no inline config):**
```bash
LAYERZERO_NETWORK=testnet
HEDERA_PRIVATE_KEY=0xYOUR_ECDSA_KEY
```
Network defaults are applied automatically.

> **Important:** Your Hedera account must use an **ECDSA (secp256k1)** key. Native ED25519 keys cannot sign EVM transactions. See [Hedera docs](https://docs.hedera.com/hedera/core-concepts/smart-contracts) for details.

## Available Tools

| Tool | Type | Description |
|---|---|---|
| `layerzero_get_supported_chains` | Query | Lists all EVM chains reachable from Hedera via LayerZero with their EIDs |
| `layerzero_get_message_fee` | Query | Estimates the native fee to send a cross-chain message |
| `layerzero_send_message` | Transaction | Sends a message from your OApp contract on Hedera to a destination chain |
| `layerzero_get_message_status` | Query | Checks delivery status (INFLIGHT / DELIVERED / FAILED) by tx hash or GUID |

See [docs/TOOLS.md](docs/TOOLS.md) for full parameter reference and example prompts.

## Example Agent Prompts

```
"What chains can I reach from Hedera via LayerZero?"

"How much would it cost to send a message from Hedera to Arbitrum (EID 30110)?"

"Send the message 'Hello Arbitrum' to address 0xABC...123 on Arbitrum One from
 my OApp at 0xDEF...456. Use gas limit 200000."

"Check the status of my LayerZero message with tx hash 0xdeadbeef..."
```

## Network Defaults

| | Mainnet | Testnet |
|---|---|---|
| Hedera Chain ID | 295 | 296 |
| LayerZero EID | **30316** | **40285** |
| EndpointV2 Address | `0x3A73033C0b1407574C76BdBAc67f126f6b4a9AA9` | `0xbD672D1562Dd32C23B563C989d8140122483631d` |
| JSON-RPC (Hashio) | `https://mainnet.hashio.io/api` | `https://testnet.hashio.io/api` |

Source: [LayerZero address book](https://github.com/LayerZero-Labs/lz-address-book)

## Supported Destination Chains (sample)

| Chain | Mainnet EID | Testnet EID |
|---|---|---|
| Ethereum | 30101 | 40161 (Sepolia) |
| BNB Chain | 30102 | 40102 |
| Avalanche | 30106 | 40106 (Fuji) |
| Polygon | 30109 | 40109 |
| Arbitrum One | 30110 | 40231 |
| Optimism | 30111 | 40232 |
| Base | 30184 | 40245 |
| Linea | 30183 | — |
| zkSync | 30165 | 40305 |
| Scroll | 30214 | 40170 |

Full list: use `layerzero_get_supported_chains` or see [LayerZero docs](https://docs.layerzero.network/v2/deployments/deployed-contracts).

## OApp Requirement

LayerZero messages must originate from a deployed **OApp (Omnichain Application)** smart contract. There is no universal relay. Your OApp must:

1. Be deployed on Hedera using the [OApp standard](https://docs.layerzero.network/v2/developers/evm/oapp/overview)
2. Have `setPeer()` configured pointing to the receiver contract on the destination chain
3. Have DVN and executor options configured

Supply your OApp's EVM address as the `oappAddress` parameter to `layerzero_send_message`.

For a quickstart OApp, see the [Hedera × LayerZero example](https://github.com/ed-marquez/hedera-example-layer-zero-bridging-oapp).

## Configuration

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for all settings, environment variables, and precedence rules.

## License

MIT — [Juanma Gomez](https://github.com/jmgomezl)
