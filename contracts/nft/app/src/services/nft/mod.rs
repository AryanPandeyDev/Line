//! NFT Service - Core implementation
//!
//! Implements a minimal, marketplace-controlled NFT contract.
//! Only admins can mint and transfer tokens.
//! No approvals, no public transfers, no payment logic.

#![allow(static_mut_refs)]

use sails_rs::{
    collections::{HashMap, HashSet},
    gstd::{msg, service},
    prelude::*,
};

mod funcs;

/// Storage for NFT contract
#[derive(Default)]
pub struct Storage {
    /// NFT ownership: token_id → owner
    pub owners: HashMap<u64, ActorId>,
    /// NFT metadata: token_id → metadata URI
    pub token_uris: HashMap<u64, String>,
    /// Total number of NFTs minted
    pub total_supply: u64,
    /// Admins (marketplace and deployer)
    pub admins: HashSet<ActorId>,
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

/// Events emitted by the NFT contract
#[event]
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum Event {
    /// NFT transferred (includes minting where from is zero)
    Transfer {
        from: ActorId,
        to: ActorId,
        token_id: u64,
    },
    /// Admin added
    AdminAdded {
        admin: ActorId,
    },
    /// Admin removed
    AdminRemoved {
        admin: ActorId,
    },
}

/// NFT Service
#[derive(Clone)]
pub struct NftService;

impl NftService {
    pub fn new() -> Self {
        Self
    }

    /// Initialize the NFT contract
    /// Deployer is always added as admin, plus any additional admins
    pub fn init(initial_admins: Option<Vec<ActorId>>) -> Self {
        let deployer = msg::source();
        let mut admins = HashSet::new();
        admins.insert(deployer);
        
        // Add any additional initial admins
        if let Some(extra_admins) = initial_admins {
            for admin in extra_admins {
                admins.insert(admin);
            }
        }
        
        unsafe {
            STORAGE = Some(Storage {
                admins,
                ..Default::default()
            });
        }
        Self
    }
}

#[service(events = Event)]
impl NftService {
    // =========================================================================
    // ADMIN-ONLY FUNCTIONS
    // =========================================================================

    /// Mint a new NFT to an address
    /// 
    /// # Arguments
    /// * `to` - The address to mint to (typically marketplace)
    /// * `token_id` - Unique token ID
    /// * `metadata_uri` - URI pointing to token metadata
    /// 
    /// # Panics
    /// - If caller is not an admin
    /// - If token_id already exists
    #[export]
    pub fn mint(&mut self, to: ActorId, token_id: u64, metadata_uri: String) -> bool {
        self.ensure_admin();
        
        let storage = Storage::get();
        if storage.owners.contains_key(&token_id) {
            panic!("Token ID already exists: {}", token_id);
        }
        
        let storage = Storage::get_mut();
        funcs::mint(
            &mut storage.owners,
            &mut storage.token_uris,
            &mut storage.total_supply,
            to,
            token_id,
            metadata_uri,
        );
        
        // Emit Transfer event with from = zero address (indicating mint)
        self.emit_event(Event::Transfer {
            from: ActorId::zero(),
            to,
            token_id,
        }).expect("Notification Error");
        
        true
    }

    /// Transfer an NFT from one address to another
    /// 
    /// # Arguments
    /// * `from` - Current owner
    /// * `to` - New owner
    /// * `token_id` - Token to transfer
    /// 
    /// # Panics
    /// - If caller is not an admin
    /// - If token_id does not exist
    /// - If from is not the current owner
    #[export]
    pub fn transfer_from(&mut self, from: ActorId, to: ActorId, token_id: u64) -> bool {
        self.ensure_admin();
        
        let storage = Storage::get();
        let current_owner = storage.owners.get(&token_id)
            .unwrap_or_else(|| panic!("Token does not exist: {}", token_id));
        
        if *current_owner != from {
            panic!("Not owner: {} does not own token {}", from, token_id);
        }
        
        let storage = Storage::get_mut();
        funcs::transfer(&mut storage.owners, token_id, to);
        
        self.emit_event(Event::Transfer {
            from,
            to,
            token_id,
        }).expect("Notification Error");
        
        true
    }

    /// Add a new admin
    /// 
    /// # Panics
    /// - If caller is not an admin
    #[export]
    pub fn add_admin(&mut self, admin: ActorId) -> bool {
        self.ensure_admin();
        
        Storage::get_mut().admins.insert(admin);
        
        self.emit_event(Event::AdminAdded { admin })
            .expect("Notification Error");
        
        true
    }

    /// Remove an admin
    /// 
    /// # Panics
    /// - If caller is not an admin
    #[export]
    pub fn remove_admin(&mut self, admin: ActorId) -> bool {
        self.ensure_admin();
        
        Storage::get_mut().admins.remove(&admin);
        
        self.emit_event(Event::AdminRemoved { admin })
            .expect("Notification Error");
        
        true
    }

    // =========================================================================
    // QUERY FUNCTIONS
    // =========================================================================

    /// Get the owner of a token
    #[export]
    pub fn owner_of(&self, token_id: u64) -> Option<ActorId> {
        Storage::get().owners.get(&token_id).cloned()
    }

    /// Get the metadata URI of a token
    #[export]
    pub fn token_uri(&self, token_id: u64) -> Option<String> {
        Storage::get().token_uris.get(&token_id).cloned()
    }

    /// Get total number of NFTs minted
    #[export]
    pub fn total_supply(&self) -> u64 {
        Storage::get().total_supply
    }

    /// Get all admins
    #[export]
    pub fn admins(&self) -> Vec<ActorId> {
        Storage::get().admins.iter().cloned().collect()
    }

    /// Check if an account is an admin
    #[export]
    pub fn is_admin(&self, account: ActorId) -> bool {
        Storage::get().admins.contains(&account)
    }
}

impl NftService {
    fn ensure_admin(&self) {
        if !Storage::get().admins.contains(&msg::source()) {
            panic!("Not admin: only admin can perform this action");
        }
    }
}
