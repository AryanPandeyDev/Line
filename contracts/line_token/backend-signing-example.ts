/**
 * LINE Token Backend Signing Example
 * 
 * This example shows how to sign withdrawal authorizations from your backend
 * that users can submit to the LINE token contract.
 * 
 * REQUIREMENTS:
 * npm install @polkadot/util-crypto @polkadot/util
 */

import { sr25519Sign, sr25519PairFromSeed, blake2AsU8a, randomAsU8a } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex, stringToU8a, u8aConcat, bnToU8a } from '@polkadot/util';
import { BN } from '@polkadot/util';

// === CONFIGURATION ===
// Your backend's sr25519 secret seed (32 bytes) - KEEP THIS SECRET!
// Generate with: randomAsU8a(32)
const BACKEND_SECRET_SEED = hexToU8a('0x...your_secret_seed_here...');

// Domain separator (must match contract)
const WITHDRAWAL_DOMAIN = stringToU8a('LINE_WITHDRAW_V1');

// Note: @polkadot/util-crypto sr25519Sign uses 'substrate' as signing context internally
// The contract also uses 'substrate' context, so they match automatically

// === TYPES ===
interface WithdrawalAuth {
    amount: string;          // Amount with decimals (e.g., "1000000000" for 1 LINE with 9 decimals)
    withdrawalId: string;    // Unique 32-byte hex ID
    expiry: number;          // Unix timestamp in milliseconds
    signature: string;       // 64-byte hex signature
}

// === FUNCTIONS ===

/**
 * Generate backend keypair from secret seed
 */
export function getBackendKeypair() {
    return sr25519PairFromSeed(BACKEND_SECRET_SEED);
}

/**
 * Get backend public key (to register in contract via set_backend_signer)
 */
export function getBackendPublicKey(): string {
    const keypair = getBackendKeypair();
    return u8aToHex(keypair.publicKey);
}

/**
 * Generate a unique withdrawal ID
 */
export function generateWithdrawalId(): string {
    return u8aToHex(randomAsU8a(32));
}

/**
 * Create withdrawal payload exactly as the contract expects
 */
function createWithdrawalPayload(
    userAddress: string,    // ActorId as 0x-prefixed hex (64 chars)
    amount: BN,             // Amount as big number
    withdrawalId: Uint8Array,
    expiry: number          // Timestamp in ms
): Uint8Array {
    // 1. Domain separator (variable length)
    const domain = WITHDRAWAL_DOMAIN;

    // 2. User address (32 bytes)
    const addressBytes = hexToU8a(userAddress);

    // 3. Amount as big-endian 32 bytes
    const amountBytes = bnToU8a(amount, { bitLength: 256, isLe: false });

    // 4. Withdrawal ID (32 bytes)
    // Already Uint8Array

    // 5. Expiry as big-endian 8 bytes
    const expiryBN = new BN(expiry);
    const expiryBytes = bnToU8a(expiryBN, { bitLength: 64, isLe: false });

    return u8aConcat(domain, addressBytes, amountBytes, withdrawalId, expiryBytes);
}

/**
 * Sign a withdrawal authorization
 * 
 * @param userAddress - User's wallet address (ActorId)
 * @param amount - Amount to withdraw (as string with decimals)
 * @param withdrawalId - Unique 32-byte hex ID
 * @param expiryMs - When this authorization expires (Unix ms)
 * @returns Signature as hex string
 */
export function signWithdrawal(
    userAddress: string,
    amount: string,
    withdrawalId: string,
    expiryMs: number
): string {
    const keypair = getBackendKeypair();

    // Create payload
    const payload = createWithdrawalPayload(
        userAddress,
        new BN(amount),
        hexToU8a(withdrawalId),
        expiryMs
    );

    // Hash payload using blake2b-256 (matches contract's Blake2b<U32>)
    const payloadHash = blake2AsU8a(payload, 256);

    // Sign the hash with sr25519
    // Note: @polkadot/util-crypto sr25519Sign wraps the message with signing context internally
    // The contract uses signing_context(b"LINE_TOKEN") - ensure both use same context
    // For now, we sign the raw hash and contract verifies with context
    const signature = sr25519Sign(payloadHash, keypair);

    return u8aToHex(signature);
}

/**
 * Create a complete withdrawal authorization
 * 
 * @param userAddress - User's wallet address
 * @param amountHuman - Human-readable amount (e.g., "100" for 100 LINE)
 * @param decimals - Token decimals (default 9)
 * @param expiryMinutes - How long until expiry (default 15 min)
 */
export function createWithdrawalAuth(
    userAddress: string,
    amountHuman: string,
    decimals: number = 9,
    expiryMinutes: number = 15
): WithdrawalAuth {
    // Convert human amount to raw
    const multiplier = new BN(10).pow(new BN(decimals));
    const amountBN = new BN(amountHuman).mul(multiplier);
    const amount = amountBN.toString();

    // Generate unique ID
    const withdrawalId = generateWithdrawalId();

    // Set expiry
    const expiry = Date.now() + (expiryMinutes * 60 * 1000);

    // Sign
    const signature = signWithdrawal(userAddress, amount, withdrawalId, expiry);

    return {
        amount,
        withdrawalId,
        expiry,
        signature
    };
}

// === EXAMPLE USAGE ===

/*
// 1. First, register your backend public key in the contract (one-time setup):
const backendPubkey = getBackendPublicKey();
console.log('Register this in contract via set_backend_signer():', backendPubkey);

// 2. When a user requests a withdrawal:
const userAddress = '0x1234...'; // User's 64-char hex address
const auth = createWithdrawalAuth(userAddress, '100', 9, 15);

console.log('Send to user:', {
  amount: auth.amount,
  withdrawalId: auth.withdrawalId,
  expiry: auth.expiry,
  signature: auth.signature
});

// 3. User submits to contract:
// contract.withdraw(auth.amount, auth.withdrawalId, auth.expiry, auth.signature)

// 4. Listen for WithdrawalExecuted event and deduct from DB balance
*/

// === API ENDPOINT EXAMPLE ===

/*
// POST /api/withdrawals/authorize
export async function authorizeWithdrawal(req: Request) {
  const { userId, amount } = await req.json();
  
  // 1. Get user's wallet address from DB
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.walletAddress) {
    return Response.json({ error: 'No wallet connected' }, { status: 400 });
  }
  
  // 2. Check DB balance
  if (user.tokenBalance < parseFloat(amount)) {
    return Response.json({ error: 'Insufficient balance' }, { status: 400 });
  }
  
  // 3. Create authorization
  const auth = createWithdrawalAuth(user.walletAddress, amount);
  
  // 4. Save pending withdrawal to DB (for reconciliation)
  await db.pendingWithdrawal.create({
    data: {
      userId,
      amount: auth.amount,
      withdrawalId: auth.withdrawalId,
      expiry: new Date(auth.expiry),
      status: 'PENDING'
    }
  });
  
  // 5. Return authorization to user
  return Response.json(auth);
}
*/
