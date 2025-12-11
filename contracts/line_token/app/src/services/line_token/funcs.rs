//! Core functions for LINE token operations

use sails_rs::{collections::HashMap, prelude::*};

/// Get balance of an account
pub fn balance_of(balances: &HashMap<ActorId, U256>, account: ActorId) -> U256 {
    balances.get(&account).cloned().unwrap_or_default()
}

/// Mint tokens to an account
pub fn mint(
    balances: &mut HashMap<ActorId, U256>,
    total_supply: &mut U256,
    to: ActorId,
    value: U256,
) -> bool {
    if value.is_zero() {
        return false;
    }

    // Check for overflow
    let new_total_supply = total_supply
        .checked_add(value)
        .expect("Total supply overflow");

    let current_balance = balance_of(balances, to);
    let new_balance = current_balance
        .checked_add(value)
        .expect("Balance overflow");

    balances.insert(to, new_balance);
    *total_supply = new_total_supply;

    true
}

/// Transfer tokens between accounts
pub fn transfer(
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
        panic!("Insufficient balance");
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
