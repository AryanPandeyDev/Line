import { NextRequest, NextResponse } from "next/server";

const LINE_TOKEN_PROGRAM_ID = "0x9ed2e4d572c01130463cfc67747e2a535d504556b0c443a1ddf1109e416a05ba";
const LINE_TOKEN_DECIMALS = 9;
const VARA_RPC = "wss://testnet.vara.network";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    let addressRaw = searchParams.get("addressRaw");

    if (!addressRaw) {
        return NextResponse.json(
            { error: "Missing 'addressRaw' query parameter" },
            { status: 400 }
        );
    }

    // Check if it's already a valid hex address (0x + 64 chars)
    const isHexAddress = /^0x[a-fA-F0-9]{64}$/.test(addressRaw);

    // If not hex, try to convert from SS58 format
    if (!isHexAddress) {
        try {
            const { decodeAddress } = await import("@polkadot/util-crypto");
            const { u8aToHex } = await import("@polkadot/util");
            const publicKey = decodeAddress(addressRaw);
            addressRaw = u8aToHex(publicKey);
            console.log("[Wallet State API] Converted SS58 to raw hex:", addressRaw);
        } catch (err) {
            console.error("[Wallet State API] Failed to decode SS58 address:", err);
            return NextResponse.json(
                { error: "Invalid address format. Expected 0x hex or SS58 address" },
                { status: 400 }
            );
        }
    }

    try {
        // Dynamic import to avoid bundler issues
        const { GearApi } = await import("@gear-js/api");
        const { encodeAddress } = await import("@gear-js/api");

        console.log("[Wallet State API] Connecting to Vara testnet:", VARA_RPC);
        const api = await GearApi.create({ providerAddress: VARA_RPC });
        console.log("[Wallet State API] Connected successfully!");

        try {
            // Get VARA balance (native token)
            console.log("[Wallet State API] Fetching balance for addressRaw:", addressRaw);

            // Also try with SS58 format
            let ss58Address = "";
            try {
                ss58Address = encodeAddress(addressRaw, 137);
                console.log("[Wallet State API] SS58 address:", ss58Address);
            } catch (encodeErr) {
                console.log("[Wallet State API] Could not encode to SS58:", encodeErr);
            }

            const accountInfo = await api.query.system.account(addressRaw);
            console.log("[Wallet State API] Raw account info:", JSON.stringify(accountInfo.toHuman()));

            const varaBalancePlanck = accountInfo.data.free.toBigInt();
            const varaBalance = Number(varaBalancePlanck) / 1e12; // VARA has 12 decimals
            console.log("[Wallet State API] VARA Balance:", varaBalance, "TVARA (planck:", varaBalancePlanck.toString(), ")");

            // Get LINE balance from program state
            let lineRaw = "0";
            let lineBalance = 0;

            try {
                // Read program state
                const stateResult = await api.programState.read(
                    {
                        programId: LINE_TOKEN_PROGRAM_ID as `0x${string}`,
                        payload: "0x"
                    },
                    null
                );

                if (stateResult) {
                    try {
                        const stateStr = stateResult.toString();
                        const stateObj = JSON.parse(stateStr);

                        if (stateObj && stateObj.balances) {
                            // balances might be an object or array of [address, balance]
                            if (Array.isArray(stateObj.balances)) {
                                for (const [addr, bal] of stateObj.balances) {
                                    if (addr.toLowerCase() === addressRaw.toLowerCase()) {
                                        lineRaw = String(bal);
                                        lineBalance = Number(BigInt(bal)) / (10 ** LINE_TOKEN_DECIMALS);
                                        break;
                                    }
                                }
                            } else if (typeof stateObj.balances === 'object') {
                                const bal = stateObj.balances[addressRaw] || stateObj.balances[addressRaw.toLowerCase()];
                                if (bal) {
                                    lineRaw = String(bal);
                                    lineBalance = Number(BigInt(bal)) / (10 ** LINE_TOKEN_DECIMALS);
                                }
                            }
                        }
                    } catch {
                        // State parsing failed, balance remains 0
                    }
                }
            } catch (stateError) {
                console.error("Error reading LINE program state:", stateError);
                // Continue with 0 balance
            }

            // Convert raw hex to SS58 format
            let addressSS58 = "";
            try {
                addressSS58 = encodeAddress(addressRaw, 137); // 137 is Vara network prefix
            } catch {
                addressSS58 = addressRaw; // Fallback to raw if encoding fails
            }

            // Transactions - would need event subscription for real history
            // For now return empty array (real implementation needs indexer)
            const transactions: Array<{
                type: string;
                amount: number;
                token: string;
                from: string;
                to: string;
                timestamp: string;
                status: string;
            }> = [];

            return NextResponse.json({
                addressSS58,
                addressRaw: addressRaw.toLowerCase(),
                varaBalance,
                lineRaw,
                lineBalance,
                transactions,
            });
        } finally {
            await api.disconnect();
        }
    } catch (error) {
        console.error("Error fetching wallet state:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to fetch wallet state: " + errorMessage },
            { status: 500 }
        );
    }
}
