use std::{env, fs, path::PathBuf};

fn main() {
    // Build WASM
    sails_rs::build_wasm();

    // Generate IDL if not in no-build mode
    if env::var("__GEAR_WASM_BUILDER_NO_BUILD").is_err() {
        // Try to read the binpath file to get output location
        if let Ok(bin_path) = fs::read_to_string(".binpath") {
            let bin_path = bin_path.trim();
            let mut idl_path = PathBuf::from(bin_path);
            idl_path.set_extension("idl");
            
            let _ = sails_idl_gen::generate_idl_to_file::<line_token_app::LineTokenProgram>(idl_path);
        }
    }
}
