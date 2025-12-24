//! NFT Contract Unit Tests
//!
//! Unit tests for the NFT contract logic using HashMap simulation.
//! Tests the core functionality without requiring full gtest setup.

use sails_rs::{collections::{HashMap, HashSet}, prelude::*};

// ============================================================================
// HELPER FUNCTIONS (simulating contract logic)
// ============================================================================

/// Mint a new token
fn mint(
    owners: &mut HashMap<u64, ActorId>,
    token_uris: &mut HashMap<u64, String>,
    total_supply: &mut u64,
    admins: &HashSet<ActorId>,
    caller: ActorId,
    to: ActorId,
    token_id: u64,
    metadata_uri: String,
) -> bool {
    // Check admin
    if !admins.contains(&caller) {
        core::panic!("Not admin: only admin can perform this action");
    }
    
    // Check token doesn't exist
    if owners.contains_key(&token_id) {
        core::panic!("Token ID already exists: {}", token_id);
    }
    
    owners.insert(token_id, to);
    token_uris.insert(token_id, metadata_uri);
    *total_supply += 1;
    
    true
}

/// Transfer a token from one address to another
fn transfer_from(
    owners: &mut HashMap<u64, ActorId>,
    admins: &HashSet<ActorId>,
    caller: ActorId,
    from: ActorId,
    to: ActorId,
    token_id: u64,
) -> bool {
    // Check admin
    if !admins.contains(&caller) {
        core::panic!("Not admin: only admin can perform this action");
    }
    
    // Check token exists and is owned by from
    let current_owner = owners.get(&token_id)
        .unwrap_or_else(|| core::panic!("Token does not exist: {}", token_id));
    
    if *current_owner != from {
        core::panic!("Not owner: {} does not own token {}", from, token_id);
    }
    
    owners.insert(token_id, to);
    true
}

/// Add an admin
fn add_admin(
    admins: &mut HashSet<ActorId>,
    caller: ActorId,
    new_admin: ActorId,
) -> bool {
    if !admins.contains(&caller) {
        core::panic!("Not admin: only admin can perform this action");
    }
    admins.insert(new_admin);
    true
}

/// Remove an admin
fn remove_admin(
    admins: &mut HashSet<ActorId>,
    caller: ActorId,
    admin_to_remove: ActorId,
) -> bool {
    if !admins.contains(&caller) {
        core::panic!("Not admin: only admin can perform this action");
    }
    admins.remove(&admin_to_remove);
    true
}

/// Get owner of a token
fn owner_of(owners: &HashMap<u64, ActorId>, token_id: u64) -> Option<ActorId> {
    owners.get(&token_id).cloned()
}

/// Get token URI
fn token_uri(token_uris: &HashMap<u64, String>, token_id: u64) -> Option<String> {
    token_uris.get(&token_id).cloned()
}

/// Check if an account is an admin
fn is_admin(admins: &HashSet<ActorId>, account: ActorId) -> bool {
    admins.contains(&account)
}

// ============================================================================
// TEST CONSTANTS
// ============================================================================

fn admin() -> ActorId { ActorId::from(42u64) }
fn marketplace() -> ActorId { ActorId::from(100u64) }
fn buyer() -> ActorId { ActorId::from(200u64) }
fn non_admin() -> ActorId { ActorId::from(999u64) }

// ============================================================================
// MINT TESTS
// ============================================================================

#[test]
fn test_mint_by_admin_succeeds() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    let result = mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://metadata1".to_string(),
    );
    
    assert!(result);
    assert_eq!(total_supply, 1);
    assert_eq!(owners.get(&1), Some(&marketplace()));
}

#[test]
fn test_mint_sets_owner_correctly() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://metadata1".to_string(),
    );
    
    assert_eq!(owner_of(&owners, 1), Some(marketplace()));
}

#[test]
fn test_mint_sets_metadata_uri() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    let metadata = "ipfs://QmTest123".to_string();
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        42,
        metadata.clone(),
    );
    
    assert_eq!(token_uri(&token_uris, 42), Some(metadata));
}

#[test]
#[should_panic(expected = "Token ID already exists")]
fn test_mint_fails_when_token_exists() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    // First mint succeeds
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://meta1".to_string(),
    );
    
    // Second mint with same ID should panic
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://meta2".to_string(),
    );
}

#[test]
#[should_panic(expected = "Not admin")]
fn test_mint_fails_for_non_admin() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    // Non-admin tries to mint
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        non_admin(),  // non-admin caller
        marketplace(),
        1,
        "ipfs://meta1".to_string(),
    );
}

// ============================================================================
// TRANSFER_FROM TESTS
// ============================================================================

#[test]
fn test_transfer_from_by_admin_updates_ownership() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    // Mint to marketplace
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://meta1".to_string(),
    );
    
    // Transfer from marketplace to buyer
    let result = transfer_from(
        &mut owners,
        &admins,
        admin(),
        marketplace(),
        buyer(),
        1,
    );
    
    assert!(result);
    assert_eq!(owner_of(&owners, 1), Some(buyer()));
}

#[test]
#[should_panic(expected = "Not owner")]
fn test_transfer_from_fails_if_not_owner() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    // Mint to marketplace
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://meta1".to_string(),
    );
    
    // Try to transfer from wrong address (buyer doesn't own token)
    transfer_from(
        &mut owners,
        &admins,
        admin(),
        buyer(),  // buyer doesn't own it
        marketplace(),
        1,
    );
}

#[test]
#[should_panic(expected = "Token does not exist")]
fn test_transfer_from_fails_for_nonexistent_token() {
    let mut owners = HashMap::new();
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    // Try to transfer non-existent token
    transfer_from(
        &mut owners,
        &admins,
        admin(),
        marketplace(),
        buyer(),
        999,  // doesn't exist
    );
}

#[test]
#[should_panic(expected = "Not admin")]
fn test_transfer_from_fails_for_non_admin() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    // Mint to marketplace
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://meta1".to_string(),
    );
    
    // Non-admin tries to transfer
    transfer_from(
        &mut owners,
        &admins,
        non_admin(),  // non-admin caller
        marketplace(),
        buyer(),
        1,
    );
}

// ============================================================================
// ADMIN TESTS
// ============================================================================

#[test]
fn test_add_admin_works_for_admin() {
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    let result = add_admin(&mut admins, admin(), marketplace());
    
    assert!(result);
    assert!(is_admin(&admins, marketplace()));
}

#[test]
fn test_remove_admin_works_for_admin() {
    let mut admins = HashSet::new();
    admins.insert(admin());
    admins.insert(marketplace());
    
    let result = remove_admin(&mut admins, admin(), marketplace());
    
    assert!(result);
    assert!(!is_admin(&admins, marketplace()));
}

#[test]
#[should_panic(expected = "Not admin")]
fn test_add_admin_fails_for_non_admin() {
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    // Non-admin tries to add admin
    add_admin(&mut admins, non_admin(), buyer());
}

#[test]
#[should_panic(expected = "Not admin")]
fn test_remove_admin_fails_for_non_admin() {
    let mut admins = HashSet::new();
    admins.insert(admin());
    admins.insert(marketplace());
    
    // Non-admin tries to remove admin
    remove_admin(&mut admins, non_admin(), marketplace());
}

// ============================================================================
// QUERY TESTS
// ============================================================================

#[test]
fn test_owner_of_returns_none_for_nonexistent() {
    let owners = HashMap::new();
    assert_eq!(owner_of(&owners, 999), None);
}

#[test]
fn test_token_uri_returns_none_for_nonexistent() {
    let token_uris = HashMap::new();
    assert_eq!(token_uri(&token_uris, 999), None);
}

#[test]
fn test_is_admin_returns_correct_value() {
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    assert!(is_admin(&admins, admin()));
    assert!(!is_admin(&admins, non_admin()));
}

#[test]
fn test_total_supply_increments() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    admins.insert(admin());
    
    assert_eq!(total_supply, 0);
    
    // Mint 3 tokens
    for i in 1..=3 {
        mint(
            &mut owners,
            &mut token_uris,
            &mut total_supply,
            &admins,
            admin(),
            marketplace(),
            i,
            format!("ipfs://meta{}", i),
        );
    }
    
    assert_eq!(total_supply, 3);
}

// ============================================================================
// INTEGRATION TEST: Marketplace Buy Flow Simulation
// ============================================================================

#[test]
fn test_marketplace_buy_flow() {
    let mut owners = HashMap::new();
    let mut token_uris = HashMap::new();
    let mut total_supply = 0u64;
    let mut admins = HashSet::new();
    
    // Setup: Deployer and marketplace are admins
    admins.insert(admin());
    admins.insert(marketplace());
    
    // Step 1: Admin mints NFT to marketplace
    mint(
        &mut owners,
        &mut token_uris,
        &mut total_supply,
        &admins,
        admin(),
        marketplace(),
        1,
        "ipfs://nft1".to_string(),
    );
    
    // Verify marketplace owns NFT
    assert_eq!(owner_of(&owners, 1), Some(marketplace()));
    
    // Step 2: Marketplace transfers NFT to buyer (simulating buy after LINE.transfer_from)
    transfer_from(
        &mut owners,
        &admins,
        marketplace(),  // marketplace is calling
        marketplace(),  // from marketplace
        buyer(),        // to buyer
        1,
    );
    
    // Step 3: Verify buyer now owns NFT
    assert_eq!(owner_of(&owners, 1), Some(buyer()));
}
