//! Pure functions for NFT operations
//!
//! These functions contain no side effects and are easy to test.

use sails_rs::{collections::HashMap, prelude::*};

/// Mint a new token
pub fn mint(
    owners: &mut HashMap<u64, ActorId>,
    token_uris: &mut HashMap<u64, String>,
    total_supply: &mut u64,
    to: ActorId,
    token_id: u64,
    metadata_uri: String,
) {
    owners.insert(token_id, to);
    token_uris.insert(token_id, metadata_uri);
    *total_supply += 1;
}

/// Transfer a token to a new owner
pub fn transfer(
    owners: &mut HashMap<u64, ActorId>,
    token_id: u64,
    to: ActorId,
) {
    owners.insert(token_id, to);
}


