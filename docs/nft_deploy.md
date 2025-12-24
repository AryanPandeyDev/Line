# NFT Contract Deployment Guide

This guide covers deploying the NFT contract to Vara testnet using the IDEA portal.

## Prerequisites

1. Built NFT contract (run `./scripts/build_nft.sh`)
2. Vara testnet tokens for gas
3. SubWallet extension with testnet account

## Build Outputs

After building, you'll have:
- `build/nft/nft.opt.wasm` - Optimized WASM binary
- `build/nft/nft.idl` - Interface definition

## Deployment Steps

### 1. Open IDEA Portal

Navigate to [https://idea.gear-tech.io/programs](https://idea.gear-tech.io/programs)

### 2. Connect Wallet

1. Click "Connect" in top right
2. Select SubWallet
3. Approve connection
4. Ensure you're on Vara Testnet

### 3. Upload Program

1. Click "Upload Program"
2. Select `build/nft/nft.opt.wasm`
3. Upload the metadata file `build/nft/nft.idl`

### 4. Initialize Program

Constructor: `New`

Parameters:
```json
{
  "initial_admins": null
}
```

Or with marketplace address as initial admin:
```json
{
  "initial_admins": ["0x<marketplace_actor_id>"]
}
```

### 5. Set Gas Limit

Recommended: `50,000,000,000` (50 billion)

### 6. Submit Transaction

1. Click "Submit"
2. Approve in SubWallet
3. Wait for confirmation

### 7. Save Program ID

After successful deployment, copy and save the Program ID (e.g., `0x1234...`)

## Post-Deployment Setup

### Add Marketplace as Admin

If you didn't add marketplace at deploy time:

1. Go to your program in IDEA
2. Call `AddAdmin` with marketplace address
3. Confirm transaction

### Mint Initial NFTs

1. Call `Mint` with parameters:
   - `to`: Marketplace address
   - `token_id`: Unique number (e.g., 1, 2, 3...)
   - `metadata_uri`: IPFS URI (e.g., `ipfs://Qm...`)

## Verification Checklist

- [ ] Program deployed successfully
- [ ] Deployer is admin (`IsAdmin` returns true)
- [ ] Marketplace added as admin
- [ ] Test mint works
- [ ] `OwnerOf` returns correct owner
- [ ] `TokenUri` returns correct metadata

## Environment Variables

Add to your `.env`:
```
NEXT_PUBLIC_NFT_PROGRAM_ID=0x<your_program_id>
```

## Troubleshooting

### "Not admin" error
- Ensure caller is in admins list
- Use `Admins` query to check current admins

### "Token ID already exists"
- Each token_id must be unique
- Use `TotalSupply` to see how many exist

### Transaction fails
- Increase gas limit
- Ensure sufficient testnet tokens
