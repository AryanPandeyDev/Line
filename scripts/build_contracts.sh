#!/bin/bash
# LINE Token Build Script (Gear/Vara)
# Builds WASM for Vara Network using sails-rs

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$PROJECT_ROOT/contracts/line_token"
BUILD_DIR="$PROJECT_ROOT/build/line_token"

echo "🔨 Building LINE Token for Vara Network..."
echo ""

mkdir -p "$BUILD_DIR"
cd "$CONTRACT_DIR"

# Build for release
echo "📦 Running cargo build --release..."
cargo build --release

# Copy artifacts
WASM_FILE="$CONTRACT_DIR/target/wasm32-gear/release/line_token.wasm"
OPT_WASM_FILE="$CONTRACT_DIR/target/wasm32-gear/release/line_token.opt.wasm"

if [ -f "$OPT_WASM_FILE" ]; then
    cp "$OPT_WASM_FILE" "$BUILD_DIR/line_token.wasm"
    echo "✅ Copied optimized WASM"
elif [ -f "$WASM_FILE" ]; then
    cp "$WASM_FILE" "$BUILD_DIR/line_token.wasm"
    echo "✅ Copied WASM (not optimized - install wasm-opt for smaller size)"
fi

# Copy IDL if exists
IDL_FILE="$CONTRACT_DIR/target/wasm32-gear/release/line_token.idl"
if [ -f "$IDL_FILE" ]; then
    cp "$IDL_FILE" "$BUILD_DIR/"
    echo "✅ Copied IDL"
fi

echo ""
echo "📊 Build artifacts:"
ls -lh "$BUILD_DIR/"
echo ""
echo "🚀 Next steps:"
echo "   1. Go to https://idea.gear-tech.io/"
echo "   2. Connect your wallet"
echo "   3. Upload: $BUILD_DIR/line_token.wasm"
echo "   4. Set init payload: {\"name\":\"LINE\",\"symbol\":\"LINE\",\"decimals\":9}"
echo ""
