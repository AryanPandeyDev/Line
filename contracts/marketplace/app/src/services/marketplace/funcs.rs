//! Pure helper functions for marketplace operations
//!
//! These functions contain no side effects and are easy to test.

use sails_rs::{collections::HashMap, prelude::*};

/// Queue a refund for an outbid user
/// 
/// Adds to existing pending refund if one exists
pub fn queue_refund(pending_refunds: &mut HashMap<ActorId, U256>, user: ActorId, amount: U256) {
    if amount.is_zero() {
        return;
    }
    pending_refunds
        .entry(user)
        .and_modify(|e| *e += amount)
        .or_insert(amount);
}

/// Queue a payout for seller or finalizer
/// 
/// Adds to existing pending payout if one exists
pub fn queue_payout(pending_payouts: &mut HashMap<ActorId, U256>, recipient: ActorId, amount: U256) {
    if amount.is_zero() {
        return;
    }
    pending_payouts
        .entry(recipient)
        .and_modify(|e| *e += amount)
        .or_insert(amount);
}

/// Calculate finalizer reward from bid amount
/// 
/// # Arguments
/// * `highest_bid` - The winning bid amount
/// * `reward_bps` - Reward in basis points (100 = 1%)
/// 
/// # Returns
/// The finalizer reward amount
pub fn calculate_finalizer_reward(highest_bid: U256, reward_bps: u32) -> U256 {
    if reward_bps == 0 {
        return U256::zero();
    }
    // reward = highest_bid * bps / 10000
    // Using checked arithmetic for safety
    let bps_u256 = U256::from(reward_bps);
    let divisor = U256::from(10000u32);
    
    highest_bid
        .checked_mul(bps_u256)
        .map(|product| product / divisor)
        .unwrap_or_default()
}

/// Validate bid amount against auction rules
/// 
/// # Arguments
/// * `bid_amount` - The proposed bid
/// * `start_price` - Minimum first bid
/// * `highest_bid` - Current highest bid
/// * `min_increment` - Minimum bid increment
/// * `is_first_bid` - Whether this is the first bid
/// 
/// # Returns
/// Ok(()) if valid, Err(message) if invalid
pub fn validate_bid(
    bid_amount: U256,
    start_price: U256,
    highest_bid: U256,
    min_increment: U256,
    is_first_bid: bool,
) -> Result<(), &'static str> {
    if is_first_bid {
        if bid_amount < start_price {
            return Err("Bid must be at least start price");
        }
    } else {
        // Use checked_add for overflow safety
        let min_bid = highest_bid.checked_add(min_increment)
            .ok_or("Bid calculation overflow")?;
        if bid_amount < min_bid {
            return Err("Bid must exceed highest bid plus increment");
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_queue_refund_new() {
        let mut pending = HashMap::new();
        let user = ActorId::from([1u8; 32]);
        let amount = U256::from(100);
        
        queue_refund(&mut pending, user, amount);
        
        assert_eq!(pending.get(&user), Some(&amount));
    }

    #[test]
    fn test_queue_refund_accumulates() {
        let mut pending = HashMap::new();
        let user = ActorId::from([1u8; 32]);
        
        queue_refund(&mut pending, user, U256::from(100));
        queue_refund(&mut pending, user, U256::from(50));
        
        assert_eq!(pending.get(&user), Some(&U256::from(150)));
    }

    #[test]
    fn test_queue_refund_zero_ignored() {
        let mut pending = HashMap::new();
        let user = ActorId::from([1u8; 32]);
        
        queue_refund(&mut pending, user, U256::zero());
        
        assert!(pending.is_empty());
    }

    #[test]
    fn test_finalizer_reward_calculation() {
        // 1000 LINE at 50 bps (0.5%) = 5 LINE
        let reward = calculate_finalizer_reward(U256::from(1000), 50);
        assert_eq!(reward, U256::from(5));
        
        // 10000 LINE at 100 bps (1%) = 100 LINE
        let reward = calculate_finalizer_reward(U256::from(10000), 100);
        assert_eq!(reward, U256::from(100));
        
        // 0 bps = 0 reward
        let reward = calculate_finalizer_reward(U256::from(10000), 0);
        assert_eq!(reward, U256::zero());
    }

    #[test]
    fn test_validate_bid_first_bid() {
        // Valid first bid
        assert!(validate_bid(
            U256::from(100),
            U256::from(100),
            U256::zero(),
            U256::from(10),
            true
        ).is_ok());
        
        // Invalid first bid (below start price)
        assert!(validate_bid(
            U256::from(50),
            U256::from(100),
            U256::zero(),
            U256::from(10),
            true
        ).is_err());
    }

    #[test]
    fn test_validate_bid_subsequent() {
        // Valid subsequent bid
        assert!(validate_bid(
            U256::from(120),
            U256::from(100),
            U256::from(100),
            U256::from(10),
            false
        ).is_ok());
        
        // Invalid (doesn't meet increment)
        assert!(validate_bid(
            U256::from(105),
            U256::from(100),
            U256::from(100),
            U256::from(10),
            false
        ).is_err());
    }
}
