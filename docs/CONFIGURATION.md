# Configuration — hak-layerzero-plugin

## Precedence (highest → lowest)

1. **`pluginConfig.layerzero`** — passed inline when registering the plugin
2. **Environment variables** — `process.env.*`
3. **Network defaults** — automatically applied based on `network` field
4. **Built-in defaults** — `network: "mainnet"`

## Settings Reference

| Config Key | Env Variable | Description | Required | Default |
|---|---|---|---|---|
| `network` | `LAYERZERO_NETWORK` | Hedera network: `"mainnet"` or `"testnet"` | No | `"mainnet"` |
| `endpointAddress` | `LAYERZERO_ENDPOINT_ADDRESS` | LayerZero EndpointV2 EVM address on Hedera | No | network default |
| `endpointId` | — | LayerZero EID of the source (Hedera) — always from network default | No | network default |
| `rpcUrl` | `HEDERA_RPC_URL` | Hedera JSON-RPC relay URL (Hashio) | No | network default |
| `scanApiUrl` | `LAYERZERO_SCAN_API_URL` | LayerZero Scan API base URL | No | `https://scan.layerzero-api.com/v1` |
| `privateKey` | `HEDERA_PRIVATE_KEY` | ECDSA hex private key for signing transactions | For `send_message` | — |

## Network Default Values

| Field | Mainnet | Testnet |
|---|---|---|
| `endpointAddress` | `0x3A73033C0b1407574C76BdBAc67f126f6b4a9AA9` | `0xbD672D1562Dd32C23B563C989d8140122483631d` |
| `endpointId` | `30316` | `40285` |
| `rpcUrl` | `https://mainnet.hashio.io/api` | `https://testnet.hashio.io/api` |

Source: [LayerZero-Labs/lz-address-book](https://github.com/LayerZero-Labs/lz-address-book/blob/main/src/generated/LZAddresses.sol)

## Example Configurations

### Inline plugin config (recommended)

```typescript
import { LAYERZERO_TESTNET } from "hak-layerzero-plugin";

pluginConfig: {
  layerzero: {
    ...LAYERZERO_TESTNET,
    network: "testnet",
    privateKey: process.env.HEDERA_PRIVATE_KEY,
  },
}
```

### Env vars only

```bash
LAYERZERO_NETWORK=mainnet
HEDERA_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

No inline config needed — the plugin reads all values from environment.

### Override a single value

```typescript
pluginConfig: {
  layerzero: {
    network: "mainnet",
    // override only the RPC — all other values come from network defaults
    rpcUrl: "https://my-private-hashio-node.example.com",
  },
}
```

## Private Key Requirement

The `privateKey` is only required for `layerzero_send_message`. Query tools (`get_message_fee`, `get_supported_chains`, `get_message_status`) work without it.

The key **must be ECDSA (secp256k1)**. Hedera native accounts use ED25519 keys by default, which cannot sign EVM transactions. Create an ECDSA account via:
- [Hedera Portal](https://portal.hedera.com)
- Hedera SDK: `PrivateKey.generateECDSA()`

## External References

- [LayerZero V2 Docs](https://docs.layerzero.network/v2)
- [Hedera EVM variant docs](https://docs.layerzero.network/v2/developers/evm/evm-variants/evm-compatible-variants) — includes Hedera-specific notes (decimal mismatch, HSCS)
- [LayerZero endpoint registry](https://docs.layerzero.network/v2/deployments/deployed-contracts)
- [Hedera HSCS docs](https://docs.hedera.com/hedera/core-concepts/smart-contracts)
- [HashScan (Hedera explorer)](https://hashscan.io) — look up EVM addresses for deployed contracts
- [LayerZero Scan](https://layerzeroscan.com) — track cross-chain messages
