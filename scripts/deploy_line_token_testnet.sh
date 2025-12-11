#!/bin/bash
# LINE Token Deployment (VARA TESTNET)
# Deploy via IDEA Portal or gcli

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build/line_token"
WASM_FILE="$BUILD_DIR/line_token.wasm"

echo "🚀 LINE Token Deployment (Vara Testnet)"
echo ""

# Check build artifacts
if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM not found. Run ./scripts/build_contracts.sh first"
    exit 1
fi

echo "📦 WASM file: $WASM_FILE ($(du -h "$WASM_FILE" | cut -f1))"
echo ""

# Check for gcli
if command -v gcli &> /dev/null; then
    GCLI_AVAILABLE=true
    echo "✅ gcli found"
else
    GCLI_AVAILABLE=false
    echo "⚠️  gcli not installed (optional)"
fi

echo ""
echo "============================================"
echo "  DEPLOYMENT OPTIONS FOR VARA NETWORK"
echo "============================================"
echo ""
echo "📝 OPTION 1: Vara IDEA Portal (Recommended)"
echo ""
echo "   1. Go to: https://idea.gear-tech.io/"
echo "   2. Switch to 'Vara Testnet' (top-right dropdown)"
echo "   3. Connect your wallet (Polkadot.js extension)"
echo "   4. Click 'Upload Program'"
echo "   5. Select: $WASM_FILE"
echo "   6. Set init payload (JSON):"
echo ""
echo '      {"name":"LINE","symbol":"LINE","decimals":9}'
echo ""
echo "   7. Click 'Upload Program' and sign the transaction"
echo "   8. Save the Program ID after deployment!"
echo ""
echo "-------------------------------------------"
echo ""

if [ "$GCLI_AVAILABLE" = true ]; then
    echo "📝 OPTION 2: Command Line (gcli)"
    echo ""
    echo "   gcli --endpoint wss://testnet.vara.network program upload \\"
    echo "     --code $WASM_FILE \\"
    echo "     --payload '{\"name\":\"LINE\",\"symbol\":\"LINE\",\"decimals\":9}'"
    echo ""
    echo "-------------------------------------------"
fi

echo ""
echo "📌 POST-DEPLOYMENT STEPS:"
echo ""
echo "   1. Save the Program ID to your .env:"
echo "      LINE_TOKEN_PROGRAM_ID=0x..."
echo ""
echo "   2. Add your backend wallet as a minter:"
echo "      - Go to IDEA Portal -> Your Program -> Send Message"
echo "      - Service: 'Line'"
echo "      - Method: 'AddMinter'"
echo "      - Payload: {\"minter\":\"<BACKEND_WALLET_ADDRESS>\"}"
echo ""
echo "   3. Verify minter was added:"
echo "      - Read State -> 'Minters'"
echo ""
