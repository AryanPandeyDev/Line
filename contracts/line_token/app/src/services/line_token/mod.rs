//! LINE Token Service - Fungible token with minter access control
//!
//! Implements VFT (Vara Fungible Token) standard with:
//! - Mintable by authorized minters only
//! - Transferable between accounts
//! - Admin can add/remove minters
//! - Backend-authorized withdrawals (users pay gas, backend signs)

#![allow(static_mut_refs)]

use sails_rs::{
    collections::{HashMap, HashSet},
    gstd::{msg, service},
    prelude::*,
};
use gstd::exec;
use blake2::{Blake2b, Digest};
use blake2::digest::consts::U32;
use schnorrkel::{PublicKey, Signature, signing_context};

mod funcs;

/// Domain separator for withdrawal signatures
const WITHDRAWAL_DOMAIN: &[u8] = b"LINE_WITHDRAW_V1";

/// Signing context for schnorrkel (must match @polkadot/util-crypto)
/// polkadot/util-crypto uses 'substrate' as the default signing context
const SIGNING_CTX: &[u8] = b"substrate";

/// Storage for LINE token
#[derive(Default)]
pub struct Storage {
    /// Token balances
    pub balances: HashMap<ActorId, U256>,
    /// Token metadata
    pub meta: Metadata,
    /// Total supply
    pub total_supply: U256,
    /// Authorized minters
    pub minters: HashSet<ActorId>,
    /// Admins (can add/remove minters)
    pub admins: HashSet<ActorId>,
    
    // === Withdrawal feature fields ===
    /// Backend signer public key (sr25519, 32 bytes)
    pub backend_signer_pubkey: Option<[u8; 32]>,
    /// Used withdrawal IDs to prevent replay attacks
    pub used_withdrawals: HashSet<[u8; 32]>,
    /// Emergency pause for withdrawals
    pub withdrawals_paused: bool,
    /// Maximum withdrawal amount per transaction (safety cap)
    pub max_withdrawal_per_tx: Option<U256>,
    
    // === Allowance feature fields (ERC20-style) ===
    /// Allowances: (owner, spender) -> approved amount
    pub allowances: HashMap<(ActorId, ActorId), U256>,
}

/// Token metadata
#[derive(Default)]
pub struct Metadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
}

static mut STORAGE: Option<Storage> = None;

impl Storage {
    pub fn get_mut() -> &'static mut Self {
        unsafe { STORAGE.as_mut().expect("Storage is not initialized") }
    }
    pub fn get() -> &'static Self {
        unsafe { STORAGE.as_ref().expect("Storage is not initialized") }
    }
}

/// Events emitted by the token
#[event]
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum Event {
    /// Tokens transferred
    Transfer {
        from: ActorId,
        to: ActorId,
        value: U256,
    },
    /// Tokens minted
    Minted {
        to: ActorId,
        value: U256,
    },
    /// Minter role granted
    MinterAdded {
        minter: ActorId,
    },
    /// Minter role revoked
    MinterRemoved {
        minter: ActorId,
    },
    /// Tokens withdrawn via backend authorization
    WithdrawalExecuted {
        to: ActorId,
        amount: U256,
        withdrawal_id: [u8; 32],
    },
    /// Backend signer public key updated
    BackendSignerUpdated {
        signer_pubkey: [u8; 32],
    },
    /// Withdrawals paused
    WithdrawalsPaused {},
    /// Withdrawals unpaused
    WithdrawalsUnpaused {},
    /// Approval for spending tokens (ERC20-style)
    Approval {
        owner: ActorId,
        spender: ActorId,
        value: U256,
    },
}

/// LINE Token Service
#[derive(Clone)]
pub struct LineTokenService;

impl LineTokenService {
    pub fn new() -> Self {
        Self
    }

    /// Initialize the token with metadata
    pub fn init(name: String, symbol: String, decimals: u8) -> Self {
        let admin = msg::source();
        unsafe {
            STORAGE = Some(Storage {
                meta: Metadata {
                    name,
                    symbol,
                    decimals,
                },
                admins: [admin].into(),
                minters: [admin].into(), // Deployer is initial minter
                ..Default::default()
            });
        }
        Self
    }
}

#[service(events = Event)]
impl LineTokenService {
    /// Mint tokens to an account (only minters)
    #[export]
    pub fn mint(&mut self, to: ActorId, value: U256) -> bool {
        let storage = Storage::get();
        if !storage.minters.contains(&msg::source()) {
            panic!("Not allowed to mint: caller is not a minter")
        }

        let storage = Storage::get_mut();
        let mutated = funcs::mint(&mut storage.balances, &mut storage.total_supply, to, value);

        if mutated {
            self.emit_event(Event::Minted { to, value })
                .expect("Notification Error");
        }
        mutated
    }

    /// Transfer tokens to another account
    #[export]
    pub fn transfer(&mut self, to: ActorId, value: U256) -> bool {
        let from = msg::source();
        let storage = Storage::get_mut();
        let mutated = funcs::transfer(&mut storage.balances, from, to, value);

        if mutated {
            self.emit_event(Event::Transfer { from, to, value })
                .expect("Notification Error");
        }
        mutated
    }

    /// Add a minter (only admin)
    #[export]
    pub fn add_minter(&mut self, minter: ActorId) {
        self.ensure_admin();
        Storage::get_mut().minters.insert(minter);
        self.emit_event(Event::MinterAdded { minter })
            .expect("Notification Error");
    }

    /// Remove a minter (only admin)
    #[export]
    pub fn remove_minter(&mut self, minter: ActorId) {
        self.ensure_admin();
        Storage::get_mut().minters.remove(&minter);
        self.emit_event(Event::MinterRemoved { minter })
            .expect("Notification Error");
    }

    /// Check if an account is a minter
    #[export]
    pub fn is_minter(&self, account: ActorId) -> bool {
        Storage::get().minters.contains(&account)
    }

    /// Get the balance of an account
    #[export]
    pub fn balance_of(&self, account: ActorId) -> U256 {
        funcs::balance_of(&Storage::get().balances, account)
    }

    /// Get total supply
    #[export]
    pub fn total_supply(&self) -> U256 {
        Storage::get().total_supply
    }

    /// Get token name
    #[export]
    pub fn name(&self) -> &'static str {
        &Storage::get().meta.name
    }

    /// Get token symbol
    #[export]
    pub fn symbol(&self) -> &'static str {
        &Storage::get().meta.symbol
    }

    /// Get token decimals
    #[export]
    pub fn decimals(&self) -> u8 {
        Storage::get().meta.decimals
    }

    /// Get all minters
    #[export]
    pub fn minters(&self) -> Vec<ActorId> {
        Storage::get().minters.iter().cloned().collect()
    }

    /// Get all admins
    #[export]
    pub fn admins(&self) -> Vec<ActorId> {
        Storage::get().admins.iter().cloned().collect()
    }

    // =========================================================================
    // ALLOWANCE FEATURE - ERC20-style approve/transferFrom for marketplace
    // =========================================================================

    /// Approve a spender to spend tokens on behalf of the caller
    /// Similar to ERC20 approve - overwrites any existing allowance
    #[export]
    pub fn approve(&mut self, spender: ActorId, value: U256) -> bool {
        let owner = msg::source();
        let storage = Storage::get_mut();
        
        // Store allowance (overwrites if exists)
        storage.allowances.insert((owner, spender), value);
        
        self.emit_event(Event::Approval { owner, spender, value })
            .expect("Notification Error");
        
        true
    }

    /// Get the allowance for a spender to spend from an owner
    /// Returns 0 if no allowance exists
    #[export]
    pub fn allowance(&self, owner: ActorId, spender: ActorId) -> U256 {
        Storage::get()
            .allowances
            .get(&(owner, spender))
            .cloned()
            .unwrap_or_default()
    }

    /// Transfer tokens from one account to another using allowance
    /// Similar to ERC20 transferFrom - caller must have sufficient allowance
    #[export]
    pub fn transfer_from(&mut self, from: ActorId, to: ActorId, value: U256) -> bool {
        let caller = msg::source();
        let storage = Storage::get_mut();
        
        // Get current allowance
        let current_allowance = storage
            .allowances
            .get(&(from, caller))
            .cloned()
            .unwrap_or_default();
        
        // Check allowance
        if current_allowance < value {
            panic!("Insufficient allowance");
        }
        
        // Decrease allowance FIRST (before transfer for reentrancy safety)
        let new_allowance = current_allowance - value;
        if new_allowance.is_zero() {
            storage.allowances.remove(&(from, caller));
        } else {
            storage.allowances.insert((from, caller), new_allowance);
        }
        
        // Perform transfer using existing logic
        let mutated = funcs::transfer(&mut storage.balances, from, to, value);
        
        if mutated {
            self.emit_event(Event::Transfer { from, to, value })
                .expect("Notification Error");
        }
        
        mutated
    }

    // =========================================================================
    // WITHDRAWAL FEATURE - Backend-authorized, user-paid withdrawals
    // =========================================================================

    /// Withdraw tokens with backend authorization (user pays gas)
    /// 
    /// # Arguments
    /// * `amount` - Amount of LINE tokens to withdraw (with decimals)
    /// * `withdrawal_id` - Unique 32-byte ID for this withdrawal (prevents replay)
    /// * `expiry` - Timestamp (ms) after which this withdrawal is invalid
    /// * `signature` - 64-byte sr25519 signature from backend
    #[export]
    pub fn withdraw(
        &mut self,
        amount: U256,
        withdrawal_id: [u8; 32],
        expiry: u64,
        signature: Vec<u8>,
    ) -> bool {
        let storage = Storage::get();
        
        // 1. Check withdrawals not paused
        if storage.withdrawals_paused {
            panic!("Withdrawals are paused");
        }

        // 2. Check expiry
        let current_time = exec::block_timestamp();
        if current_time > expiry {
            panic!("Withdrawal expired");
        }

        // 3. Check withdrawal_id not used
        if storage.used_withdrawals.contains(&withdrawal_id) {
            panic!("Withdrawal already used");
        }

        // 4. Get backend signer
        let signer_pubkey = storage.backend_signer_pubkey
            .expect("Backend signer not configured");

        // 5. Check max withdrawal limit if set
        if let Some(max) = storage.max_withdrawal_per_tx {
            if amount > max {
                panic!("Amount exceeds maximum withdrawal limit");
            }
        }

        // 6. Reconstruct and hash payload
        let caller = msg::source();
        let payload_hash = compute_withdrawal_hash(caller, amount, withdrawal_id, expiry);

        // 7. Verify sr25519 signature
        verify_sr25519_signature(&payload_hash, &signature, &signer_pubkey);

        // 8. Mark withdrawal_id as used (BEFORE minting to prevent reentrancy)
        let storage = Storage::get_mut();
        storage.used_withdrawals.insert(withdrawal_id);

        // 9. Mint tokens to caller
        funcs::mint(&mut storage.balances, &mut storage.total_supply, caller, amount);

        // 10. Emit event
        self.emit_event(Event::WithdrawalExecuted {
            to: caller,
            amount,
            withdrawal_id,
        }).expect("Notification Error");

        true
    }

    /// Set backend signer public key (admin only)
    #[export]
    pub fn set_backend_signer(&mut self, signer_pubkey: [u8; 32]) {
        self.ensure_admin();
        Storage::get_mut().backend_signer_pubkey = Some(signer_pubkey);
        self.emit_event(Event::BackendSignerUpdated { signer_pubkey })
            .expect("Notification Error");
    }

    /// Pause withdrawals (admin only, emergency stop)
    #[export]
    pub fn pause_withdrawals(&mut self) {
        self.ensure_admin();
        Storage::get_mut().withdrawals_paused = true;
        self.emit_event(Event::WithdrawalsPaused {})
            .expect("Notification Error");
    }

    /// Unpause withdrawals (admin only)
    #[export]
    pub fn unpause_withdrawals(&mut self) {
        self.ensure_admin();
        Storage::get_mut().withdrawals_paused = false;
        self.emit_event(Event::WithdrawalsUnpaused {})
            .expect("Notification Error");
    }

    /// Set maximum withdrawal per transaction (admin only)
    #[export]
    pub fn set_max_withdrawal(&mut self, max_amount: Option<U256>) {
        self.ensure_admin();
        Storage::get_mut().max_withdrawal_per_tx = max_amount;
    }

    /// Check if a withdrawal_id has been used
    #[export]
    pub fn is_withdrawal_used(&self, withdrawal_id: [u8; 32]) -> bool {
        Storage::get().used_withdrawals.contains(&withdrawal_id)
    }

    /// Get backend signer public key
    #[export]
    pub fn backend_signer(&self) -> Option<[u8; 32]> {
        Storage::get().backend_signer_pubkey
    }

    /// Check if withdrawals are paused
    #[export]
    pub fn withdrawals_paused(&self) -> bool {
        Storage::get().withdrawals_paused
    }

    /// Get maximum withdrawal per transaction
    #[export]
    pub fn max_withdrawal(&self) -> Option<U256> {
        Storage::get().max_withdrawal_per_tx
    }
}

impl LineTokenService {
    fn ensure_admin(&self) {
        if !Storage::get().admins.contains(&msg::source()) {
            panic!("Not admin: only admin can perform this action")
        }
    }
}

/// Compute blake2b-256 hash of withdrawal payload
fn compute_withdrawal_hash(
    caller: ActorId,
    amount: U256,
    withdrawal_id: [u8; 32],
    expiry: u64,
) -> [u8; 32] {
    // Blake2b with 256-bit output (matches @polkadot/util-crypto blake2AsU8a)
    type Blake2b256 = Blake2b<U32>;
    let mut hasher = Blake2b256::new();
    
    // Domain separator
    hasher.update(WITHDRAWAL_DOMAIN);
    
    // Caller ActorId (32 bytes)
    hasher.update(caller.as_ref());
    
    // Amount as big-endian 32 bytes
    let mut amount_bytes = [0u8; 32];
    for (i, limb) in amount.0.iter().rev().enumerate() {
        amount_bytes[i * 8..(i + 1) * 8].copy_from_slice(&limb.to_be_bytes());
    }
    hasher.update(&amount_bytes);
    
    // Withdrawal ID (32 bytes)
    hasher.update(&withdrawal_id);
    
    // Expiry as big-endian 8 bytes
    hasher.update(&expiry.to_be_bytes());
    
    hasher.finalize().into()
}

/// Verify sr25519 signature using schnorrkel
fn verify_sr25519_signature(
    message_hash: &[u8; 32],
    signature_bytes: &[u8],
    pubkey_bytes: &[u8; 32],
) {
    // Parse signature (must be 64 bytes)
    if signature_bytes.len() != 64 {
        panic!("Invalid signature length: expected 64 bytes");
    }
    let mut sig_array = [0u8; 64];
    sig_array.copy_from_slice(signature_bytes);
    
    let signature = Signature::from_bytes(&sig_array)
        .expect("Invalid signature format");
    
    // Parse public key
    let public_key = PublicKey::from_bytes(pubkey_bytes)
        .expect("Invalid public key format");
    
    // Create signing context and verify
    let ctx = signing_context(SIGNING_CTX);
    
    if public_key.verify(ctx.bytes(message_hash), &signature).is_err() {
        panic!("Invalid signature: verification failed");
    }
}
