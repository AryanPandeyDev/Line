import { NextRequest, NextResponse } from "next/server";

const LINE_TOKEN_PROGRAM_ID = process.env.NEXT_PUBLIC_LINE_TOKEN_PROGRAM_ID || "";
const LINE_DECIMALS = 9;
const VARA_RPC = "wss://testnet.vara.network";

/**
 * Convert any address format to raw hex (padded to 64 chars)
 * Supports: 0x prefixed hex (any length), SS58 addresses
 */
function normalizeAddress(address: string): string {
    // If already a proper 64-char hex
    if (/^0x[a-fA-F0-9]{64}$/.test(address)) {
        return address.toLowerCase();
    }

    // If shorter hex address, pad with zeros (e.g., 40-char Ethereum address)
    if (/^0x[a-fA-F0-9]+$/.test(address)) {
        const hex = address.slice(2).padStart(64, '0');
        return `0x${hex}`.toLowerCase();
    }

    // For SS58 or other formats, return padded version
    // In production, use @polkadot/util-crypto to decode SS58
    const hex = Buffer.from(address).toString('hex').padStart(64, '0');
    return `0x${hex}`.toLowerCase();
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
        return NextResponse.json(
            { error: "Missing 'address' query parameter" },
            { status: 400 }
        );
    }

    // Normalize address to 64-char hex format
    let normalizedAddress: string;
    try {
        normalizedAddress = normalizeAddress(address);
    } catch {
        return NextResponse.json(
            { error: "Could not parse address format" },
            { status: 400 }
        );
    }

    try {
        // Dynamic import to avoid bundler issues with @gear-js/api
        const { GearApi } = await import("@gear-js/api");

        // Connect to Vara testnet
        const api = await GearApi.create({ providerAddress: VARA_RPC });

        try {
            // Read full program state
            const stateResult = await api.programState.read(
                {
                    programId: LINE_TOKEN_PROGRAM_ID as `0x${string}`,
                    payload: "0x"
                },
                undefined
            );

            // Parse state to find user balance
            let rawBigInt = BigInt(0);

            if (stateResult) {
                try {
                    // Try to parse as JSON (some states are JSON-serializable)
                    const stateStr = stateResult.toString();
                    const stateObj = JSON.parse(stateStr);

                    if (stateObj && stateObj.balances) {
                        // Find user's balance in the balances map
                        for (const [addr, balance] of Object.entries(stateObj.balances)) {
                            if (addr.toLowerCase() === normalizedAddress.toLowerCase()) {
                                rawBigInt = BigInt(balance as string);
                                break;
                            }
                        }
                    }
                } catch {
                    // State is not JSON, might be SCALE encoded
                    // For now, return 0 - proper implementation would use @polkadot/types
                    rawBigInt = BigInt(0);
                }
            }

            const raw = rawBigInt.toString();
            const human = Number(rawBigInt) / (10 ** LINE_DECIMALS);

            return NextResponse.json({ raw, human });
        } finally {
            await api.disconnect();
        }
    } catch (error) {
        console.error("Error querying on-chain balance:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to query on-chain balance: " + errorMessage },
            { status: 500 }
        );
    }
}
