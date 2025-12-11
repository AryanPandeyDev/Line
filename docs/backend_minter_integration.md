# Backend Minter Integration

## Overview

The LINE token contract allows designated minter addresses to mint tokens. The backend server acts as a minter to reward users.

## Mint Flow

```
1. User completes task/reward action
       ↓
2. Backend validates reward server-side
   - Check daily mint caps
   - Verify user eligibility
   - Calculate amount
       ↓
3. Create pending_tx record in database
   - userId, amount, status: 'pending'
       ↓
4. Signing service signs mint transaction
   - Separate process with key access
   - Uses KMS or secure key storage
       ↓
5. Submit transaction to Vara network
       ↓
6. Save txHash to pending_tx
       ↓
7. Background worker confirms transaction
   - Poll for confirmation
   - Update status: 'confirmed' or 'failed'
       ↓
8. Update user's on-chain balance
```

## Required Environment Variables

```env
# Contract address (from deployment)
LINE_TOKEN_CONTRACT_ADDRESS=0x...

# Minter wallet address (added via add_minter after deploy)
MINTER_ADDRESS=0x...

# Reference to minter key (DO NOT store actual key in env)
# Use KMS ARN, Vault path, or secret reference
MINTER_KEY_REFERENCE=aws:kms:alias/line-minter-key

# Vara RPC
VARA_RPC_URL=wss://testnet.vara.network
```

## Server-Side Caps

Implement these in your backend logic:

```typescript
// Example daily mint cap check
const DAILY_MINT_CAP = 10000 * 10**9; // 10,000 LINE (with 9 decimals)

async function canMint(userId: string, amount: number): Promise<boolean> {
  const todayMinted = await getTodayMintedAmount(userId);
  return (todayMinted + amount) <= DAILY_MINT_CAP;
}
```

## Database Schema (example)

```sql
CREATE TABLE pending_mint_tx (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending', -- pending, submitted, confirmed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);
```

## Security Considerations

1. **Never expose minter key** in application code
2. **Use dedicated signing service** or KMS
3. **Implement rate limiting** on mint requests
4. **Validate all amounts server-side**
5. **Monitor for suspicious activity**
