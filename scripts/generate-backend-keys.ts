/**
 * Generate Backend Signer Keys for LINE Token Contract
 * 
 * This script generates an sr25519 keypair for backend withdrawal signing.
 * 
 * Usage: npx ts-node scripts/generate-backend-keys.ts
 * 
 * Output:
 * - seed: 32-byte hex for LINE_BACKEND_SIGNER_SEED env var (KEEP SECRET!)
 * - publicKey: 32-byte hex for reference
 * - publicKeyRustArray: [u8; 32] literal for SetBackendSigner contract call
 */

import { cryptoWaitReady, sr25519PairFromSeed, randomAsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

async function generateBackendKeys() {
    // Wait for WASM crypto to be ready
    await cryptoWaitReady();

    // Generate cryptographically secure 32-byte seed
    const seed = randomAsU8a(32);

    // Derive sr25519 keypair from seed
    const keypair = sr25519PairFromSeed(seed);

    // Format public key as Rust [u8; 32] array literal
    const pubkeyBytes = Array.from(keypair.publicKey);
    const rustArray = `[${pubkeyBytes.join(', ')}]`;

    console.log('\n' + '='.repeat(70));
    console.log('LINE TOKEN BACKEND SIGNER KEYS');
    console.log('='.repeat(70));

    console.log('\n⚠️  KEEP THE SEED SECRET! Never commit it to version control.\n');

    console.log('1. SEED (for LINE_BACKEND_SIGNER_SEED env var):');
    console.log(`   ${u8aToHex(seed)}`);

    console.log('\n2. PUBLIC KEY (hex, for reference):');
    console.log(`   ${u8aToHex(keypair.publicKey)}`);

    console.log('\n3. PUBLIC KEY as [u8; 32] (for SetBackendSigner contract call):');
    console.log(`   ${rustArray}`);

    console.log('\n' + '='.repeat(70));
    console.log('NEXT STEPS:');
    console.log('='.repeat(70));
    console.log('1. Add to .env:');
    console.log(`   LINE_BACKEND_SIGNER_SEED=${u8aToHex(seed)}`);
    console.log('\n2. Call SetBackendSigner on the contract with the [u8; 32] array above');
    console.log('='.repeat(70) + '\n');
}

generateBackendKeys().catch(console.error);
