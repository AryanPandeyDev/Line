#![no_std]
#![allow(clippy::new_without_default)]

//! LINE Token - VFT (Vara Fungible Token) Implementation
//!
//! A mintable fungible token with role-based access control.
//! Only designated minters (backend server) can mint tokens.

use sails_rs::prelude::*;
mod services;
pub use services::line_token::LineTokenService;

/// LINE Token Program
pub struct LineTokenProgram(());

#[program]
impl LineTokenProgram {
    /// Initialize the LINE token with metadata
    pub fn new(name: String, symbol: String, decimals: u8) -> Self {
        LineTokenService::init(name, symbol, decimals);
        Self(())
    }

    /// Get the token service
    pub fn line(&self) -> LineTokenService {
        LineTokenService::new()
    }
}
