#![no_std]
#![allow(clippy::new_without_default)]

//! NFT Auction Marketplace - sails-rs Implementation
//!
//! An auction-only NFT marketplace with:
//! - Admin-only auction creation
//! - Immediate fund locking on bid via LINE transfer_from
//! - Pull-based refunds and payouts (async-safe)
//! - Permissionless finalize_auction
//! - Time-based auction ending

use sails_rs::prelude::*;
mod services;
pub use services::marketplace::MarketplaceService;

/// Marketplace Program
pub struct MarketplaceProgram(());

#[program]
impl MarketplaceProgram {
    /// Initialize the marketplace with LINE token contract address
    /// 
    /// # Arguments
    /// * `line_program_id` - The ActorId of the deployed LINE token contract
    pub fn new(line_program_id: ActorId) -> Self {
        MarketplaceService::init(line_program_id);
        Self(())
    }

    /// Get the marketplace service
    pub fn marketplace(&self) -> MarketplaceService {
        MarketplaceService::new()
    }
}
