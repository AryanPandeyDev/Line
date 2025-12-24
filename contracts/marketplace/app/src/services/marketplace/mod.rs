//! Marketplace Service - Core implementation
//!
//! Implements an auction-only NFT marketplace with:
//! - Admin-only auction creation (marketplace is sole seller in MVP)
//! - Immediate fund locking on bid via LINE transfer_from
//! - Pull-based refunds for outbid users
//! - Pull-based payouts for failed seller/finalizer payments
//! - Permissionless finalize_auction with optional reward
//! - Time-based auction ending (not finalization)

#![allow(static_mut_refs)]

use gstd::msg;
use sails_rs::{
    collections::{HashMap, HashSet},
    gstd::{exec, service},
    prelude::*,
};

mod clients;
mod funcs;

use clients::{LineClient, NftClient};

// ============================================================================
// CONSTANTS
// ============================================================================

/// Minimum auction duration: 1 minute
const MIN_AUCTION_DURATION_MS: u64 = 60_000;

/// Maximum auction duration: 30 days
const MAX_AUCTION_DURATION_MS: u64 = 30 * 24 * 60 * 60 * 1000;

/// Maximum extension window: 1 hour
const MAX_EXTENSION_WINDOW_MS: u64 = 60 * 60 * 1000;

/// Maximum finalizer reward: 10% (1000 basis points)
const MAX_FINALIZER_REWARD_BPS: u32 = 1000;

// ============================================================================
// AUCTION STRUCT
// ============================================================================

/// Single auction state
#[derive(Clone, Debug, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct Auction {
    /// NFT contract address
    pub nft_program_id: ActorId,
    /// NFT token ID
    pub token_id: u64,
    /// Original seller (receives proceeds) - always admin in MVP
    pub seller: ActorId,
    /// Minimum first bid
    pub start_price: U256,
    /// Current highest bid (0 if no bids)
    pub highest_bid: U256,
    /// Current winning bidder
    pub highest_bidder: Option<ActorId>,
    /// Auction end timestamp (milliseconds since epoch)
    pub end_time_ms: u64,
    /// True after finalization complete
    pub settled: bool,
    /// Anti-snipe extension window (milliseconds)
    pub extension_window_ms: u64,
    /// Minimum increment over previous bid
    pub min_bid_increment: U256,
}

// ============================================================================
// STORAGE
// ============================================================================

/// Global marketplace storage
#[derive(Default)]
pub struct Storage {
    /// All auctions by ID
    pub auctions: HashMap<u64, Auction>,
    /// Quick lookup: (nft_program, token_id) → auction_id
    pub token_to_auction: HashMap<(ActorId, u64), u64>,
    /// Next auction ID counter
    pub next_auction_id: u64,
    /// LINE token contract address (set once at init)
    pub line_program_id: ActorId,
    /// Admins who can create/cancel auctions
    pub admins: HashSet<ActorId>,
    /// Auctions currently locked during async operations
    pub locked_auctions: HashSet<u64>,
    /// Pending refunds for outbid users: user → amount
    pub pending_refunds: HashMap<ActorId, U256>,
    /// Pending payouts for seller/finalizer: recipient → amount
    pub pending_payouts: HashMap<ActorId, U256>,
    /// Pending NFT returns on failed transfers: auction_id → (recipient, token_id, nft_program)
    pub pending_nft_returns: HashMap<u64, (ActorId, u64, ActorId)>,
    /// Finalizer reward in basis points (e.g., 50 = 0.5%)
    pub finalizer_reward_bps: u32,
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

// ============================================================================
// EVENTS
// ============================================================================

/// Events emitted by the marketplace
#[event]
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum Event {
    /// Auction created
    AuctionCreated {
        auction_id: u64,
        nft_program_id: ActorId,
        token_id: u64,
        seller: ActorId,
        start_price: U256,
        end_time_ms: u64,
    },
    /// Auction cancelled
    AuctionCancelled { auction_id: u64 },
    /// New bid placed
    BidPlaced {
        auction_id: u64,
        bidder: ActorId,
        amount: U256,
        new_end_time_ms: u64,
    },
    /// Auction finalized
    AuctionFinalized {
        auction_id: u64,
        winner: Option<ActorId>,
        winning_bid: U256,
        seller_payout: U256,
        finalizer_reward: U256,
    },
    /// Refund queued for outbid user
    RefundQueued { user: ActorId, amount: U256 },
    /// Refund claimed
    RefundClaimed { user: ActorId, amount: U256 },
    /// Payout queued (transfer failed)
    PayoutQueued { recipient: ActorId, amount: U256 },
    /// Payout claimed
    PayoutClaimed { recipient: ActorId, amount: U256 },
    /// NFT transfer failed, queued for retry
    NftTransferQueued {
        auction_id: u64,
        recipient: ActorId,
        token_id: u64,
    },
    /// NFT transfer completed via claim
    NftTransferClaimed {
        auction_id: u64,
        recipient: ActorId,
        token_id: u64,
    },
    /// Admin added
    AdminAdded { admin: ActorId },
    /// Admin removed
    AdminRemoved { admin: ActorId },
    /// Finalizer reward updated
    FinalizerRewardUpdated { bps: u32 },
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/// Marketplace Service
#[derive(Clone)]
pub struct MarketplaceService;

// ============================================================================
// CLIENT HELPERS (module-level functions)
// ============================================================================

/// Get LINE client for cross-contract calls
fn get_line_client() -> LineClient {
    LineClient::new(Storage::get().line_program_id)
}

/// Get NFT client for cross-contract calls
fn get_nft_client(nft_program_id: ActorId) -> NftClient {
    NftClient::new(nft_program_id)
}

impl MarketplaceService {
    pub fn new() -> Self {
        Self
    }

    /// Initialize the marketplace
    pub fn init(line_program_id: ActorId) -> Self {
        let deployer = msg::source();
        let mut admins = HashSet::new();
        admins.insert(deployer);

        unsafe {
            STORAGE = Some(Storage {
                line_program_id,
                admins,
                next_auction_id: 1,
                finalizer_reward_bps: 0,
                ..Default::default()
            });
        }
        Self
    }
}

#[service(events = Event)]
impl MarketplaceService {
    // ========================================================================
    // AUCTION MANAGEMENT
    // ========================================================================

    /// Create a new auction for an NFT
    /// 
    /// NFT is escrowed to marketplace via cross-contract call
    #[export]
    pub async fn create_auction(
        &mut self,
        nft_program_id: ActorId,
        token_id: u64,
        start_price: U256,
        duration_ms: u64,
        extension_window_ms: u64,
        min_bid_increment: U256,
    ) -> u64 {
        self.ensure_admin();

        // Validate inputs
        if duration_ms < MIN_AUCTION_DURATION_MS {
            panic!("Duration must be at least {} ms", MIN_AUCTION_DURATION_MS);
        }
        if start_price.is_zero() {
            panic!("Start price must be greater than 0");
        }

        let storage = Storage::get();
        
        // Check no duplicate auction
        if storage.token_to_auction.contains_key(&(nft_program_id, token_id)) {
            panic!("Auction already exists for this NFT");
        }

        let seller = msg::source();
        let marketplace = exec::program_id();
        let now = exec::block_timestamp();
        let end_time_ms = now.checked_add(duration_ms)
            .expect("End time overflow");

        // Validate extension window
        if extension_window_ms > MAX_EXTENSION_WINDOW_MS {
            panic!("Extension window cannot exceed {} ms", MAX_EXTENSION_WINDOW_MS);
        }
        if duration_ms > MAX_AUCTION_DURATION_MS {
            panic!("Duration cannot exceed {} ms", MAX_AUCTION_DURATION_MS);
        }

        // Escrow NFT to marketplace via cross-contract call
        let nft_client = get_nft_client(nft_program_id);
        match nft_client.transfer_from(seller, marketplace, token_id).await {
            Ok(true) => {},
            Ok(false) => panic!("NFT escrow failed: transfer returned false"),
            Err(e) => panic!("NFT escrow failed: {}", e),
        }

        // Create and store auction
        let storage = Storage::get_mut();
        let auction_id = storage.next_auction_id;

        let auction = Auction {
            nft_program_id,
            token_id,
            seller,
            start_price,
            highest_bid: U256::zero(),
            highest_bidder: None,
            end_time_ms,
            settled: false,
            extension_window_ms,
            min_bid_increment,
        };

        storage.auctions.insert(auction_id, auction);
        storage.token_to_auction.insert((nft_program_id, token_id), auction_id);
        storage.next_auction_id += 1;

        // Emit event
        self.emit_event(Event::AuctionCreated {
            auction_id,
            nft_program_id,
            token_id,
            seller,
            start_price,
            end_time_ms,
        }).expect("Failed to emit event");

        auction_id
    }

    /// Cancel an auction before it ends
    #[export]
    pub async fn cancel_auction(&mut self, auction_id: u64) -> bool {
        let storage = Storage::get();
        
        let auction = storage.auctions.get(&auction_id)
            .unwrap_or_else(|| panic!("Auction not found"));
        
        // Check permissions
        let caller = msg::source();
        if !storage.admins.contains(&caller) && caller != auction.seller {
            panic!("Only admin or seller can cancel");
        }

        if auction.settled {
            panic!("Auction already settled");
        }

        let now = exec::block_timestamp();
        if now >= auction.end_time_ms {
            panic!("Auction ended - use finalize_auction");
        }

        if storage.locked_auctions.contains(&auction_id) {
            panic!("Auction is locked");
        }

        // Get auction data before modifying storage
        let nft_program_id = auction.nft_program_id;
        let token_id = auction.token_id;
        let seller = auction.seller;
        let highest_bidder = auction.highest_bidder;
        let highest_bid = auction.highest_bid;

        let storage = Storage::get_mut();
        storage.locked_auctions.insert(auction_id);

        // Queue refund if there was a bidder
        if let Some(bidder) = highest_bidder {
            funcs::queue_refund(&mut storage.pending_refunds, bidder, highest_bid);
            self.emit_event(Event::RefundQueued { user: bidder, amount: highest_bid })
                .expect("Failed to emit event");
        }

        // Return NFT to seller via cross-contract call
        let nft_client = get_nft_client(nft_program_id);
        let marketplace = exec::program_id();
        match nft_client.transfer_from(marketplace, seller, token_id).await {
            Ok(true) => {},
            Ok(false) | Err(_) => {
                // Queue for later claim if transfer fails
                storage.pending_nft_returns.insert(auction_id, (seller, token_id, nft_program_id));
                self.emit_event(Event::NftTransferQueued { auction_id, recipient: seller, token_id })
                    .expect("Failed to emit event");
            }
        }

        // Clean up storage
        storage.auctions.remove(&auction_id);
        storage.token_to_auction.remove(&(nft_program_id, token_id));
        storage.locked_auctions.remove(&auction_id);

        self.emit_event(Event::AuctionCancelled { auction_id })
            .expect("Failed to emit event");

        true
    }

    // ========================================================================
    // BIDDING
    // ========================================================================

    /// Place a bid on an auction
    /// 
    /// Funds are pulled from bidder via LINE.transfer_from
    #[export]
    pub async fn bid(&mut self, auction_id: u64, bid_amount: U256) -> bool {
        let storage = Storage::get();
        
        let auction = storage.auctions.get(&auction_id)
            .unwrap_or_else(|| panic!("Auction not found"));

        if auction.settled {
            panic!("Auction already settled");
        }

        // CRITICAL: Time ends the auction
        let now = exec::block_timestamp();
        if now >= auction.end_time_ms {
            panic!("Auction ended");
        }

        if storage.locked_auctions.contains(&auction_id) {
            panic!("Auction is locked");
        }

        // Validate bid amount
        let is_first_bid = auction.highest_bidder.is_none();
        if let Err(msg) = funcs::validate_bid(
            bid_amount,
            auction.start_price,
            auction.highest_bid,
            auction.min_bid_increment,
            is_first_bid,
        ) {
            panic!("{}", msg);
        }

        // Get values before storage mutation
        let prev_bidder = auction.highest_bidder;
        let prev_amount = auction.highest_bid;
        let extension_window = auction.extension_window_ms;
        let current_end_time = auction.end_time_ms;

        let bidder = msg::source();
        let marketplace = exec::program_id();

        // Prevent self-outbidding
        if prev_bidder == Some(bidder) {
            panic!("Cannot outbid yourself");
        }

        // Lock auction before async operation
        let storage = Storage::get_mut();
        storage.locked_auctions.insert(auction_id);

        // Pull funds from bidder via LINE.transfer_from
        let line_client = get_line_client();
        match line_client.transfer_from(bidder, marketplace, bid_amount).await {
            Ok(true) => {},
            Ok(false) => {
                storage.locked_auctions.remove(&auction_id);
                panic!("Bid failed: transfer returned false - check allowance");
            },
            Err(e) => {
                storage.locked_auctions.remove(&auction_id);
                panic!("Bid failed: {}", e);
            }
        }

        // Queue refund for previous bidder (if any)
        if let Some(prev) = prev_bidder {
            funcs::queue_refund(&mut storage.pending_refunds, prev, prev_amount);
            self.emit_event(Event::RefundQueued { user: prev, amount: prev_amount })
                .expect("Failed to emit event");
        }

        // Update auction state
        let auction = storage.auctions.get_mut(&auction_id).unwrap();
        auction.highest_bid = bid_amount;
        auction.highest_bidder = Some(bidder);

        // Anti-snipe extension
        let time_remaining = current_end_time.saturating_sub(now);
        if time_remaining <= extension_window {
            auction.end_time_ms = now + extension_window;
        }
        let new_end_time_ms = auction.end_time_ms;

        // Unlock
        storage.locked_auctions.remove(&auction_id);

        self.emit_event(Event::BidPlaced {
            auction_id,
            bidder,
            amount: bid_amount,
            new_end_time_ms,
        }).expect("Failed to emit event");

        true
    }

    /// Claim pending refund for outbid user
    #[export]
    pub async fn claim_refund(&mut self) -> bool {
        let storage = Storage::get();
        let caller = msg::source();

        let amount = storage.pending_refunds.get(&caller)
            .cloned()
            .unwrap_or_default();

        if amount.is_zero() {
            panic!("No pending refund");
        }

        // Remove from pending FIRST (effects before interactions)
        let storage = Storage::get_mut();
        storage.pending_refunds.remove(&caller);

        // Transfer funds to caller
        let line_client = get_line_client();
        match line_client.transfer(caller, amount).await {
            Ok(true) => {},
            Ok(false) | Err(_) => {
                // Re-add to pending if transfer fails
                storage.pending_refunds.insert(caller, amount);
                panic!("Refund transfer failed - try again later");
            }
        }

        self.emit_event(Event::RefundClaimed { user: caller, amount })
            .expect("Failed to emit event");

        true
    }

    // ========================================================================
    // FINALIZATION
    // ========================================================================

    /// Finalize an auction after it ends
    /// Permissionless - anyone can call this
    #[export]
    pub async fn finalize_auction(&mut self, auction_id: u64) -> bool {
        let storage = Storage::get();

        let auction = storage.auctions.get(&auction_id)
            .unwrap_or_else(|| panic!("Auction not found"));

        if auction.settled {
            panic!("Auction already settled");
        }

        let now = exec::block_timestamp();
        if now < auction.end_time_ms {
            panic!("Auction not ended yet");
        }

        if storage.locked_auctions.contains(&auction_id) {
            panic!("Auction is locked");
        }

        // Get values before storage mutation
        let nft_program_id = auction.nft_program_id;
        let token_id = auction.token_id;
        let seller = auction.seller;
        let highest_bidder = auction.highest_bidder;
        let highest_bid = auction.highest_bid;

        let finalizer = msg::source();
        let marketplace = exec::program_id();
        let reward_bps = storage.finalizer_reward_bps;

        // Mark settled IMMEDIATELY (before any async calls)
        let storage = Storage::get_mut();
        storage.locked_auctions.insert(auction_id);
        
        let auction = storage.auctions.get_mut(&auction_id).unwrap();
        auction.settled = true;

        storage.token_to_auction.remove(&(nft_program_id, token_id));

        let (winner, winning_bid, seller_payout, finalizer_reward) = 
            if let Some(winner) = highest_bidder {
                let winning_bid = highest_bid;
                let finalizer_reward = funcs::calculate_finalizer_reward(winning_bid, reward_bps);
                let seller_payout = winning_bid - finalizer_reward;

                // Transfer NFT to winner
                let nft_client = get_nft_client(nft_program_id);
                match nft_client.transfer_from(marketplace, winner, token_id).await {
                    Ok(true) => {},
                    Ok(false) | Err(_) => {
                        storage.pending_nft_returns.insert(auction_id, (winner, token_id, nft_program_id));
                        self.emit_event(Event::NftTransferQueued { auction_id, recipient: winner, token_id })
                            .expect("Failed to emit event");
                    }
                }

                // Pay seller
                if !seller_payout.is_zero() {
                    let line_client = get_line_client();
                    match line_client.transfer(seller, seller_payout).await {
                        Ok(true) => {},
                        Ok(false) | Err(_) => {
                            funcs::queue_payout(&mut storage.pending_payouts, seller, seller_payout);
                            self.emit_event(Event::PayoutQueued { recipient: seller, amount: seller_payout })
                                .expect("Failed to emit event");
                        }
                    }
                }

                // Pay finalizer
                if !finalizer_reward.is_zero() {
                    let line_client = get_line_client();
                    match line_client.transfer(finalizer, finalizer_reward).await {
                        Ok(true) => {},
                        Ok(false) | Err(_) => {
                            funcs::queue_payout(&mut storage.pending_payouts, finalizer, finalizer_reward);
                            self.emit_event(Event::PayoutQueued { recipient: finalizer, amount: finalizer_reward })
                                .expect("Failed to emit event");
                        }
                    }
                }

                (Some(winner), winning_bid, seller_payout, finalizer_reward)
            } else {
                // No bids - return NFT to seller
                let nft_client = get_nft_client(nft_program_id);
                match nft_client.transfer_from(marketplace, seller, token_id).await {
                    Ok(true) => {},
                    Ok(false) | Err(_) => {
                        storage.pending_nft_returns.insert(auction_id, (seller, token_id, nft_program_id));
                        self.emit_event(Event::NftTransferQueued { auction_id, recipient: seller, token_id })
                            .expect("Failed to emit event");
                    }
                }

                (None, U256::zero(), U256::zero(), U256::zero())
            };

        // Clean up auction from storage (important for storage efficiency)
        storage.auctions.remove(&auction_id);
        storage.locked_auctions.remove(&auction_id);

        self.emit_event(Event::AuctionFinalized {
            auction_id,
            winner,
            winning_bid,
            seller_payout,
            finalizer_reward,
        }).expect("Failed to emit event");

        true
    }

    /// Claim pending payout (for seller or finalizer when transfer failed)
    #[export]
    pub async fn claim_payout(&mut self) -> bool {
        let storage = Storage::get();
        let caller = msg::source();

        let amount = storage.pending_payouts.get(&caller)
            .cloned()
            .unwrap_or_default();

        if amount.is_zero() {
            panic!("No pending payout");
        }

        let storage = Storage::get_mut();
        storage.pending_payouts.remove(&caller);

        let line_client = get_line_client();
        match line_client.transfer(caller, amount).await {
            Ok(true) => {},
            Ok(false) | Err(_) => {
                storage.pending_payouts.insert(caller, amount);
                panic!("Payout transfer failed - try again later");
            }
        }

        self.emit_event(Event::PayoutClaimed { recipient: caller, amount })
            .expect("Failed to emit event");

        true
    }

    /// Claim pending NFT transfer (for winner or seller when transfer failed)
    #[export]
    pub async fn claim_nft(&mut self, auction_id: u64) -> bool {
        let storage = Storage::get();
        
        let (recipient, token_id, nft_program_id) = storage.pending_nft_returns.get(&auction_id)
            .cloned()
            .unwrap_or_else(|| panic!("No pending NFT transfer"));

        let caller = msg::source();
        if caller != recipient && !storage.admins.contains(&caller) {
            panic!("Only recipient or admin can claim");
        }

        let storage = Storage::get_mut();
        storage.pending_nft_returns.remove(&auction_id);

        let marketplace = exec::program_id();
        let nft_client = get_nft_client(nft_program_id);
        match nft_client.transfer_from(marketplace, recipient, token_id).await {
            Ok(true) => {},
            Ok(false) | Err(_) => {
                storage.pending_nft_returns.insert(auction_id, (recipient, token_id, nft_program_id));
                panic!("NFT transfer failed - try again later");
            }
        }

        self.emit_event(Event::NftTransferClaimed { auction_id, recipient, token_id })
            .expect("Failed to emit event");

        true
    }

    // ========================================================================
    // ADMIN FUNCTIONS (non-async)
    // ========================================================================

    /// Add a new admin
    #[export]
    pub fn add_admin(&mut self, admin: ActorId) -> bool {
        self.ensure_admin();
        
        let storage = Storage::get_mut();
        storage.admins.insert(admin);

        self.emit_event(Event::AdminAdded { admin })
            .expect("Failed to emit event");

        true
    }

    /// Remove an admin
    #[export]
    pub fn remove_admin(&mut self, admin: ActorId) -> bool {
        self.ensure_admin();

        let storage = Storage::get_mut();
        
        if storage.admins.len() <= 1 {
            panic!("Cannot remove last admin");
        }

        // Cannot remove yourself
        if admin == msg::source() {
            panic!("Cannot remove yourself as admin");
        }

        storage.admins.remove(&admin);

        self.emit_event(Event::AdminRemoved { admin })
            .expect("Failed to emit event");

        true
    }

    /// Set the finalizer reward in basis points
    #[export]
    pub fn set_finalizer_reward_bps(&mut self, bps: u32) -> bool {
        self.ensure_admin();

        if bps > MAX_FINALIZER_REWARD_BPS {
            panic!("Reward cannot exceed {} bps ({}%)", MAX_FINALIZER_REWARD_BPS, MAX_FINALIZER_REWARD_BPS / 100);
        }

        let storage = Storage::get_mut();
        storage.finalizer_reward_bps = bps;

        self.emit_event(Event::FinalizerRewardUpdated { bps })
            .expect("Failed to emit event");

        true
    }

    // ========================================================================
    // QUERY FUNCTIONS
    // ========================================================================

    #[export]
    pub fn get_auction(&self, auction_id: u64) -> Option<Auction> {
        Storage::get().auctions.get(&auction_id).cloned()
    }

    #[export]
    pub fn get_pending_refund(&self, user: ActorId) -> U256 {
        Storage::get().pending_refunds.get(&user).cloned().unwrap_or_default()
    }

    #[export]
    pub fn get_pending_payout(&self, user: ActorId) -> U256 {
        Storage::get().pending_payouts.get(&user).cloned().unwrap_or_default()
    }

    #[export]
    pub fn get_pending_nft(&self, auction_id: u64) -> Option<(ActorId, u64, ActorId)> {
        Storage::get().pending_nft_returns.get(&auction_id).cloned()
    }

    #[export]
    pub fn is_admin(&self, account: ActorId) -> bool {
        Storage::get().admins.contains(&account)
    }

    #[export]
    pub fn admins(&self) -> Vec<ActorId> {
        Storage::get().admins.iter().cloned().collect()
    }

    #[export]
    pub fn finalizer_reward_bps(&self) -> u32 {
        Storage::get().finalizer_reward_bps
    }

    #[export]
    pub fn line_program_id(&self) -> ActorId {
        Storage::get().line_program_id
    }

    #[export]
    pub fn next_auction_id(&self) -> u64 {
        Storage::get().next_auction_id
    }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

impl MarketplaceService {
    fn ensure_admin(&self) {
        if !Storage::get().admins.contains(&msg::source()) {
            panic!("Not admin: only admin can perform this action");
        }
    }
}
