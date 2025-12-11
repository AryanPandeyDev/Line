# LINE Token Deployment Guide (Vara Network)

This guide covers deploying and managing the LINE token on Vara Network.

## Prerequisites

1. **Rust toolchain** with `wasm32v1-none` target:
   ```bash
   rustup target add wasm32v1-none
   ```

2. **Polkadot.js wallet extension** (for IDEA Portal)
   - Install from: https://polkadot.js.org/extension/
   
3. **VARA testnet tokens** for gas fees
   - Get from Discord faucet: https://discord.gg/x8ZeSy6S6K

## Build

```bash
./scripts/build_contracts.sh
```

This creates `build/line_token/line_token.wasm` (~61KB optimized).

## Deploy via IDEA Portal (Recommended)

1. Go to **https://idea.gear-tech.io/**

2. **Switch to Vara Testnet** (dropdown in top-right)

3. **Connect your wallet** (Polkadot.js extension)

4. Click **"Upload Program"**

5. **Select file**: `build/line_token/line_token.wasm`

6. **Set init payload** (JSON):
   ```json
   {"name":"LINE","symbol":"LINE","decimals":9}
   ```

7. Click **"Upload Program"** and sign transaction

8. **Save the Program ID** after deployment

## Post-Deployment

### 1. Save Program ID

Add to your `.env`:
```
LINE_TOKEN_PROGRAM_ID=0x...your_program_id...
```

### 2. Add Backend as Minter

Via IDEA Portal:
1. Go to your program
2. Click **"Send Message"**
3. Service: `Line`
4. Method: `AddMinter`
5. Payload:
   ```json
   {"minter":"0x...backend_wallet_address..."}
   ```

### 3. Verify Minter Added

Read the program state:
1. Click **"Read State"**
2. Method: `Minters`
3. Verify your backend address is listed

## Contract API

### Messages (Write)

| Method | Description | Params |
|--------|-------------|--------|
| `Mint` | Mint tokens (minter only) | `to: ActorId, value: U256` |
| `Transfer` | Transfer tokens | `to: ActorId, value: U256` |
| `AddMinter` | Add minter (admin only) | `minter: ActorId` |
| `RemoveMinter` | Remove minter (admin only) | `minter: ActorId` |

### Queries (Read)

| Method | Description | Returns |
|--------|-------------|---------|
| `BalanceOf` | Get balance | `U256` |
| `TotalSupply` | Total minted | `U256` |
| `IsMinter` | Check if minter | `bool` |
| `Minters` | List all minters | `Vec<ActorId>` |
| `Name` | Token name | `String` |
| `Symbol` | Token symbol | `String` |
| `Decimals` | Token decimals | `u8` |

## Security Notes

> [!CAUTION]
> - **NEVER** commit private keys or seed phrases
> - Deploy to **TESTNET ONLY** until audited
> - Only add trusted addresses as minters
> - Backend minter key should be stored in secure KMS

## Troubleshooting

### Build fails with `wasm32v1-none` not found
```bash
rustup target add wasm32v1-none
```

### wasm-opt warning
Optional optimization. Install with:
```bash
cargo install wasm-opt
# or
npm install -g wasm-opt
```

### Transaction fails on IDEA Portal
- Ensure you have enough VARA for gas
- Check the payload format is valid JSON
- Verify you're on the correct network (testnet)
