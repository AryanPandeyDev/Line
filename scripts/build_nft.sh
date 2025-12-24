#!/bin/bash
# Build script for NFT contract
# Usage: ./scripts/build_nft.sh

set -e

echo "=== Building NFT Contract ==="
cd contracts/nft

# Build release
echo "Building WASM..."
cargo build --release

# The build.rs generates the IDL and wasm-opt automatically via sails-rs
echo "Build complete!"

# Show output files
echo ""
echo "=== Output Files ==="
echo "WASM: target/wasm32-unknown-unknown/release/nft.opt.wasm"
echo "IDL:  nft.idl"

# Copy to build directory for easier access
mkdir -p ../../build/nft
cp target/wasm32-unknown-unknown/release/nft.opt.wasm ../../build/nft/ 2>/dev/null || echo "Note: Optimized wasm not yet generated"
cp nft.idl ../../build/nft/ 2>/dev/null || echo "Note: IDL not yet generated"

echo ""
echo "Files copied to build/nft/"
