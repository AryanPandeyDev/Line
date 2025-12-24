//! Unit tests for LINE Token allowance functionality
//! Tests the allowance logic using HashMap (simulating contract storage)

use sails_rs::{collections::HashMap, prelude::*};

// ============================================================================
// HELPER FUNCTIONS (simulating contract logic)
// ============================================================================

/// Get balance of an account
fn balance_of(balances: &HashMap<ActorId, U256>, account: ActorId) -> U256 {
    balances.get(&account).cloned().unwrap_or_default()
}

/// Transfer tokens between accounts
fn transfer(
    balances: &mut HashMap<ActorId, U256>,
    from: ActorId,
    to: ActorId,
    value: U256,
) -> bool {
    if value.is_zero() {
        return false;
    }

    let from_balance = balance_of(balances, from);
    if from_balance < value {
        core::panic!("Insufficient balance");
    }

    let new_from_balance = from_balance - value;
    let to_balance = balance_of(balances, to);
    let new_to_balance = to_balance
        .checked_add(value)
        .expect("Balance overflow");

    if new_from_balance.is_zero() {
        balances.remove(&from);
    } else {
        balances.insert(from, new_from_balance);
    }
    balances.insert(to, new_to_balance);

    true
}

/// Transfer from using allowance
fn transfer_from(
    balances: &mut HashMap<ActorId, U256>,
    allowances: &mut HashMap<(ActorId, ActorId), U256>,
    caller: ActorId,
    from: ActorId,
    to: ActorId,
    value: U256,
) -> bool {
    // Get current allowance
    let current_allowance = allowances
        .get(&(from, caller))
        .cloned()
        .unwrap_or_default();

    // Check allowance
    if current_allowance < value {
        core::panic!("Insufficient allowance");
    }

    // Decrease allowance FIRST
    let new_allowance = current_allowance - value;
    if new_allowance.is_zero() {
        allowances.remove(&(from, caller));
    } else {
        allowances.insert((from, caller), new_allowance);
    }

    // Perform transfer
    transfer(balances, from, to, value)
}

// ============================================================================
// CORE TRANSFER FUNCTION TESTS
// ============================================================================

#[test]
fn test_transfer_basic() {
    let mut balances = HashMap::new();
    let user_a = ActorId::from(1u64);
    let user_b = ActorId::from(2u64);

    // Give user A 100 tokens
    balances.insert(user_a, U256::from(100u64));

    // Transfer 30 to user B
    let success = transfer(&mut balances, user_a, user_b, U256::from(30u64));

    assert!(success);
    assert_eq!(balances.get(&user_a), Some(&U256::from(70u64)));
    assert_eq!(balances.get(&user_b), Some(&U256::from(30u64)));
}

#[test]
fn test_transfer_zero_returns_false() {
    let mut balances = HashMap::new();
    let user_a = ActorId::from(1u64);
    let user_b = ActorId::from(2u64);

    balances.insert(user_a, U256::from(100u64));

    // Transferring 0 should return false
    let success = transfer(&mut balances, user_a, user_b, U256::from(0u64));

    assert!(!success);
    assert_eq!(balances.get(&user_a), Some(&U256::from(100u64)));
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_transfer_insufficient_balance_panics() {
    let mut balances = HashMap::new();
    let user_a = ActorId::from(1u64);
    let user_b = ActorId::from(2u64);

    // User A has 10 tokens
    balances.insert(user_a, U256::from(10u64));

    // Try to transfer 50 (more than balance) - should panic
    transfer(&mut balances, user_a, user_b, U256::from(50u64));
}

#[test]
fn test_balance_of_returns_zero_for_unknown() {
    let balances = HashMap::new();
    let unknown_user = ActorId::from(999u64);

    assert_eq!(balance_of(&balances, unknown_user), U256::from(0u64));
}

// ============================================================================
// ALLOWANCE TESTS
// ============================================================================

#[test]
fn test_approve_sets_allowance() {
    let mut allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();
    let owner = ActorId::from(1u64);
    let spender = ActorId::from(2u64);

    // User A approves User B for 100 tokens
    allowances.insert((owner, spender), U256::from(100u64));

    // Check allowance(A, B) == 100
    let allowance = allowances.get(&(owner, spender)).cloned().unwrap_or_default();
    assert_eq!(allowance, U256::from(100u64));
}

#[test]
fn test_allowance_returns_zero_if_not_set() {
    let allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();
    let owner = ActorId::from(1u64);
    let spender = ActorId::from(2u64);

    let allowance = allowances.get(&(owner, spender)).cloned().unwrap_or_default();
    assert_eq!(allowance, U256::from(0u64));
}

#[test]
fn test_approve_overwrites_previous_allowance() {
    let mut allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();
    let owner = ActorId::from(1u64);
    let spender = ActorId::from(2u64);

    // Set initial allowance
    allowances.insert((owner, spender), U256::from(100u64));
    assert_eq!(allowances.get(&(owner, spender)), Some(&U256::from(100u64)));

    // Overwrite with new value
    allowances.insert((owner, spender), U256::from(50u64));
    assert_eq!(allowances.get(&(owner, spender)), Some(&U256::from(50u64)));

    // Set to 0 (revoke)
    allowances.insert((owner, spender), U256::from(0u64));
    assert_eq!(allowances.get(&(owner, spender)), Some(&U256::from(0u64)));
}

// ============================================================================
// TRANSFER_FROM TESTS
// ============================================================================

#[test]
fn test_transfer_from_success() {
    let mut balances = HashMap::new();
    let mut allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();

    let owner = ActorId::from(1u64);     // User A
    let spender = ActorId::from(2u64);   // User B
    let recipient = ActorId::from(3u64); // User C

    // User A has 100 tokens
    balances.insert(owner, U256::from(100u64));

    // User A approves User B for 50 tokens
    allowances.insert((owner, spender), U256::from(50u64));

    // User B calls transfer_from(A, C, 30)
    let success = transfer_from(
        &mut balances,
        &mut allowances,
        spender,  // caller
        owner,    // from
        recipient, // to
        U256::from(30u64),
    );

    assert!(success);
    // Check: A balance = 70, C balance = 30, allowance(A,B) = 20
    assert_eq!(balances.get(&owner), Some(&U256::from(70u64)));
    assert_eq!(balances.get(&recipient), Some(&U256::from(30u64)));
    assert_eq!(allowances.get(&(owner, spender)), Some(&U256::from(20u64)));
}

#[test]
#[should_panic(expected = "Insufficient allowance")]
fn test_transfer_from_fails_without_allowance() {
    let mut balances = HashMap::new();
    let mut allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();

    let owner = ActorId::from(1u64);
    let spender = ActorId::from(2u64);
    let recipient = ActorId::from(3u64);

    // User A has 100 tokens but NO approval for User B
    balances.insert(owner, U256::from(100u64));

    // User B tries transfer_from(A, C, 10) without approval - should panic
    transfer_from(
        &mut balances,
        &mut allowances,
        spender,
        owner,
        recipient,
        U256::from(10u64),
    );
}

#[test]
fn test_allowance_reduced_after_transfer() {
    let mut balances = HashMap::new();
    let mut allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();

    let owner = ActorId::from(1u64);
    let spender = ActorId::from(2u64);
    let recipient = ActorId::from(3u64);

    balances.insert(owner, U256::from(100u64));
    allowances.insert((owner, spender), U256::from(50u64));

    // First transfer: 20 tokens
    transfer_from(&mut balances, &mut allowances, spender, owner, recipient, U256::from(20u64));
    assert_eq!(allowances.get(&(owner, spender)), Some(&U256::from(30u64)));

    // Second transfer: 30 tokens (uses up remaining)
    transfer_from(&mut balances, &mut allowances, spender, owner, recipient, U256::from(30u64));
    // Allowance should be removed (0 = removed from map)
    assert!(allowances.get(&(owner, spender)).is_none());
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_transfer_from_fails_with_insufficient_balance() {
    let mut balances = HashMap::new();
    let mut allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();

    let owner = ActorId::from(1u64);
    let spender = ActorId::from(2u64);
    let recipient = ActorId::from(3u64);

    // User A has only 10 tokens
    balances.insert(owner, U256::from(10u64));
    // But approves spender for 100
    allowances.insert((owner, spender), U256::from(100u64));

    // Spender tries to transfer 50 (more than owner's balance)
    // Should pass allowance check but fail on balance
    transfer_from(
        &mut balances,
        &mut allowances,
        spender,
        owner,
        recipient,
        U256::from(50u64),
    );
}

#[test]
fn test_transfer_from_exact_allowance() {
    let mut balances = HashMap::new();
    let mut allowances: HashMap<(ActorId, ActorId), U256> = HashMap::new();

    let owner = ActorId::from(1u64);
    let spender = ActorId::from(2u64);
    let recipient = ActorId::from(3u64);

    balances.insert(owner, U256::from(100u64));
    allowances.insert((owner, spender), U256::from(50u64));

    // Transfer exactly the allowance amount
    let success = transfer_from(
        &mut balances,
        &mut allowances,
        spender,
        owner,
        recipient,
        U256::from(50u64),
    );

    assert!(success);
    assert_eq!(balances.get(&owner), Some(&U256::from(50u64)));
    assert_eq!(balances.get(&recipient), Some(&U256::from(50u64)));
    // Allowance should be removed completely
    assert!(allowances.get(&(owner, spender)).is_none());
}
