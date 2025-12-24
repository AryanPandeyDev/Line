#![no_std]
#![allow(clippy::new_without_default)]

//! NFT Contract - Marketplace-controlled Non-Fungible Token
//!
//! A minimal NFT implementation where only admins (marketplace) can:
//! - Mint new tokens
//! - Transfer tokens between accounts
//!
//! This contract does NOT handle payments - all economic logic
//! is in the marketplace contract.

use sails_rs::prelude::*;
mod services;
pub use services::nft::NftService;

/// NFT Program
pub struct NftProgram(());

#[program]
impl NftProgram {
    /// Initialize the NFT contract
    /// 
    /// # Arguments
    /// * `initial_admins` - Optional list of additional admin addresses
    ///   The deployer is always added as an admin
    pub fn new(initial_admins: Option<Vec<ActorId>>) -> Self {
        NftService::init(initial_admins);
        Self(())
    }

    /// Get the NFT service
    pub fn nft(&self) -> NftService {
        NftService::new()
    }
}
