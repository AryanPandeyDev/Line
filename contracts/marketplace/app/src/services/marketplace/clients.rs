//! Cross-contract client proxies for LINE token and NFT contracts
//!
//! Uses sails-rs encoding format (verified from official sails-rs source):
//! - Service route (SCALE-encoded string)
//! - Method route (SCALE-encoded string)  
//! - Params (SCALE-encoded as a TUPLE, not separate args)
//!
//! Reference: https://github.com/gear-tech/sails/blob/master/rs/src/client/mod.rs
//! See CallCodec::encode_params_with_prefix()

use gstd::msg;
use sails_rs::prelude::*;

// ============================================================================
// LINE TOKEN CLIENT
// ============================================================================

/// Client for interacting with LINE token contract
pub struct LineClient {
    program_id: ActorId,
}

impl LineClient {
    pub fn new(program_id: ActorId) -> Self {
        Self { program_id }
    }

    /// Transfer tokens from marketplace to recipient
    /// 
    /// Used for: refunds, payouts
    pub async fn transfer(&self, to: ActorId, value: U256) -> Result<bool, String> {
        // Sails encoding: SCALE(service) + SCALE(method) + SCALE(params_tuple)
        // This is verified from sails-rs CallCodec::encode_params_with_prefix
        let mut payload = Vec::new();
        "Line".encode_to(&mut payload);      // Service route
        "Transfer".encode_to(&mut payload);  // Method route
        (to, value).encode_to(&mut payload); // Params as tuple
        
        let reply_bytes = msg::send_bytes_for_reply(self.program_id, &payload, 0, 0)
            .map_err(|e| format!("Failed to send transfer message: {:?}", e))?
            .await
            .map_err(|e| format!("Transfer reply failed: {:?}", e))?;
        
        Self::decode_reply(&reply_bytes)
    }

    /// Transfer tokens from user to marketplace (pull funds)
    /// 
    /// Used for: bid locking
    /// Requires: user has approved marketplace for at least `value`
    pub async fn transfer_from(&self, from: ActorId, to: ActorId, value: U256) -> Result<bool, String> {
        let mut payload = Vec::new();
        "Line".encode_to(&mut payload);           // Service route
        "TransferFrom".encode_to(&mut payload);   // Method route
        (from, to, value).encode_to(&mut payload); // Params as tuple
        
        let reply_bytes = msg::send_bytes_for_reply(self.program_id, &payload, 0, 0)
            .map_err(|e| format!("Failed to send transfer_from message: {:?}", e))?
            .await
            .map_err(|e| format!("TransferFrom reply failed: {:?}", e))?;
        
        Self::decode_reply(&reply_bytes)
    }

    /// Decode reply, skipping the service/method prefix
    /// Sails returns: SCALE(service) + SCALE(method) + SCALE(result)
    /// But for empty tuple () returns, it skips the prefix
    fn decode_reply(reply_bytes: &[u8]) -> Result<bool, String> {
        let mut cursor = reply_bytes;
        
        // Skip service route
        let _service: String = Decode::decode(&mut cursor)
            .map_err(|e| format!("Failed to decode service route: {:?}", e))?;
        
        // Skip method route  
        let _method: String = Decode::decode(&mut cursor)
            .map_err(|e| format!("Failed to decode method route: {:?}", e))?;
        
        // Decode result
        let result: bool = Decode::decode(&mut cursor)
            .map_err(|e| format!("Failed to decode result: {:?}", e))?;
        
        Ok(result)
    }
}

// ============================================================================
// NFT CONTRACT CLIENT
// ============================================================================

/// NFT contract client for cross-contract calls
pub struct NftClient {
    program_id: ActorId,
}

impl NftClient {
    pub fn new(program_id: ActorId) -> Self {
        Self { program_id }
    }

    /// Transfer NFT from one address to another
    /// 
    /// Used for: NFT escrow, NFT delivery to winner, NFT return to seller
    /// Requires: marketplace is NFT admin
    pub async fn transfer_from(&self, from: ActorId, to: ActorId, token_id: u64) -> Result<bool, String> {
        let mut payload = Vec::new();
        "Nft".encode_to(&mut payload);            // Service route
        "TransferFrom".encode_to(&mut payload);   // Method route
        (from, to, token_id).encode_to(&mut payload); // Params as tuple
        
        let reply_bytes = msg::send_bytes_for_reply(self.program_id, &payload, 0, 0)
            .map_err(|e| format!("Failed to send NFT transfer message: {:?}", e))?
            .await
            .map_err(|e| format!("NFT transfer reply failed: {:?}", e))?;
        
        Self::decode_reply(&reply_bytes)
    }

    /// Decode reply, skipping the service/method prefix
    fn decode_reply(reply_bytes: &[u8]) -> Result<bool, String> {
        let mut cursor = reply_bytes;
        
        // Skip service route
        let _service: String = Decode::decode(&mut cursor)
            .map_err(|e| format!("Failed to decode service route: {:?}", e))?;
        
        // Skip method route  
        let _method: String = Decode::decode(&mut cursor)
            .map_err(|e| format!("Failed to decode method route: {:?}", e))?;
        
        // Decode result
        let result: bool = Decode::decode(&mut cursor)
            .map_err(|e| format!("Failed to decode result: {:?}", e))?;
        
        Ok(result)
    }
}
