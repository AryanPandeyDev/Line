//! Build script for NFT contract
//! Generates WASM binary and IDL

use nft_app::NftProgram;
use sails_idl_gen::program;
use std::{env, fs::File, path::PathBuf};

fn main() {
    // Build WASM binary
    sails_rs::build_wasm();

    // Generate IDL
    let idl_path = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap()).join("nft.idl");
    let idl_file = File::create(idl_path).expect("Failed to create IDL file");
    program::generate_idl::<NftProgram>(idl_file).expect("Failed to generate IDL");
}
