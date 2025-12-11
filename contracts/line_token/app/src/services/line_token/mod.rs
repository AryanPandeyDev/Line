//! LINE Token Service - Fungible token with minter access control
//!
//! Implements VFT (Vara Fungible Token) standard with:
//! - Mintable by authorized minters only
//! - Transferable between accounts
//! - Admin can add/remove minters

#![allow(static_mut_refs)]

use sails_rs::{
    collections::{HashMap, HashSet},
    gstd::{msg, service},
    prelude::*,
};

mod funcs;

/// Storage for LINE token
#[derive(Default)]
pub struct Storage {
    /// Token balances
    pub balances: HashMap<ActorId, U256>,
    /// Token metadata
    pub meta: Metadata,
    /// Total supply
    pub total_supply: U256,
    /// Authorized minters
    pub minters: HashSet<ActorId>,
    /// Admins (can add/remove minters)
    pub admins: HashSet<ActorId>,
}

/// Token metadata
#[derive(Default)]
pub struct Metadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
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

/// Events emitted by the token
#[event]
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum Event {
    /// Tokens transferred
    Transfer {
        from: ActorId,
        to: ActorId,
        value: U256,
    },
    /// Tokens minted
    Minted {
        to: ActorId,
        value: U256,
    },
    /// Minter role granted
    MinterAdded {
        minter: ActorId,
    },
    /// Minter role revoked
    MinterRemoved {
        minter: ActorId,
    },
}

/// LINE Token Service
#[derive(Clone)]
pub struct LineTokenService;

impl LineTokenService {
    pub fn new() -> Self {
        Self
    }

    /// Initialize the token with metadata
    pub fn init(name: String, symbol: String, decimals: u8) -> Self {
        let admin = msg::source();
        unsafe {
            STORAGE = Some(Storage {
                meta: Metadata {
                    name,
                    symbol,
                    decimals,
                },
                admins: [admin].into(),
                minters: [admin].into(), // Deployer is initial minter
                ..Default::default()
            });
        }
        Self
    }
}

#[service(events = Event)]
impl LineTokenService {
    /// Mint tokens to an account (only minters)
    #[export]
    pub fn mint(&mut self, to: ActorId, value: U256) -> bool {
        let storage = Storage::get();
        if !storage.minters.contains(&msg::source()) {
            panic!("Not allowed to mint: caller is not a minter")
        }

        let storage = Storage::get_mut();
        let mutated = funcs::mint(&mut storage.balances, &mut storage.total_supply, to, value);

        if mutated {
            self.emit_event(Event::Minted { to, value })
                .expect("Notification Error");
        }
        mutated
    }

    /// Transfer tokens to another account
    #[export]
    pub fn transfer(&mut self, to: ActorId, value: U256) -> bool {
        let from = msg::source();
        let storage = Storage::get_mut();
        let mutated = funcs::transfer(&mut storage.balances, from, to, value);

        if mutated {
            self.emit_event(Event::Transfer { from, to, value })
                .expect("Notification Error");
        }
        mutated
    }

    /// Add a minter (only admin)
    #[export]
    pub fn add_minter(&mut self, minter: ActorId) {
        self.ensure_admin();
        Storage::get_mut().minters.insert(minter);
        self.emit_event(Event::MinterAdded { minter })
            .expect("Notification Error");
    }

    /// Remove a minter (only admin)
    #[export]
    pub fn remove_minter(&mut self, minter: ActorId) {
        self.ensure_admin();
        Storage::get_mut().minters.remove(&minter);
        self.emit_event(Event::MinterRemoved { minter })
            .expect("Notification Error");
    }

    /// Check if an account is a minter
    #[export]
    pub fn is_minter(&self, account: ActorId) -> bool {
        Storage::get().minters.contains(&account)
    }

    /// Get the balance of an account
    #[export]
    pub fn balance_of(&self, account: ActorId) -> U256 {
        funcs::balance_of(&Storage::get().balances, account)
    }

    /// Get total supply
    #[export]
    pub fn total_supply(&self) -> U256 {
        Storage::get().total_supply
    }

    /// Get token name
    #[export]
    pub fn name(&self) -> &'static str {
        &Storage::get().meta.name
    }

    /// Get token symbol
    #[export]
    pub fn symbol(&self) -> &'static str {
        &Storage::get().meta.symbol
    }

    /// Get token decimals
    #[export]
    pub fn decimals(&self) -> u8 {
        Storage::get().meta.decimals
    }

    /// Get all minters
    #[export]
    pub fn minters(&self) -> Vec<ActorId> {
        Storage::get().minters.iter().cloned().collect()
    }

    /// Get all admins
    #[export]
    pub fn admins(&self) -> Vec<ActorId> {
        Storage::get().admins.iter().cloned().collect()
    }
}

impl LineTokenService {
    fn ensure_admin(&self) {
        if !Storage::get().admins.contains(&msg::source()) {
            panic!("Not admin: only admin can perform this action")
        }
    }
}
