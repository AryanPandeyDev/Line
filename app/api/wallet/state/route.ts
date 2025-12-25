import { NextRequest, NextResponse } from "next/server";

const LINE_TOKEN_PROGRAM_ID = process.env.NEXT_PUBLIC_LINE_TOKEN_PROGRAM_ID || "";
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
        const { encodeAddress } = await import("@polkadot/util-crypto");

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

            // Get LINE balance using Sails BalanceOf query
            let lineRaw = "0";
            let lineBalance = 0;

            try {
                // Import Sails
                const { Sails } = await import("sails-js");
                const { SailsIdlParser } = await import("sails-js-parser");

                // Fetch the IDL from the public folder (server-side needs file read)
                const fs = await import("fs");
                const path = await import("path");
                const idlPath = path.join(process.cwd(), "public", "contracts", "line_token.idl");
                const idl = fs.readFileSync(idlPath, "utf-8");

                // Create Sails instance
                const parser = new SailsIdlParser();
                await parser.init();
                const sails = new Sails(parser);
                sails.parseIdl(idl);
                sails.setApi(api);
                sails.setProgramId(LINE_TOKEN_PROGRAM_ID as `0x${string}`);

                // Call BalanceOf query with the hex address
                console.log("[Wallet State API] Querying LINE balance for hex address:", addressRaw);

                // Build the query - set origin address for the query
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const query = sails.services.Line.queries.BalanceOf(addressRaw as `0x${string}`) as any;

                // Set origin address (who is making the query)
                if (typeof query.withOrigin === 'function') {
                    query.withOrigin(addressRaw as `0x${string}`);
                } else if (typeof query.originAddress === 'function') {
                    query.originAddress(addressRaw as `0x${string}`);
                }

                // Try to get the payload and use calculateReply
                const payload = query._payload || query.payload;

                if (payload) {
                    console.log("[Wallet State API] Query payload length:", payload.length);

                    // Use calculateReply to simulate message and get response
                    // This is how Sails queries work - they send a simulated message
                    const { u8aToHex, hexToU8a, u8aToBn } = await import("@polkadot/util");
                    const payloadHex = u8aToHex(payload);

                    // Use the gear message calculateReply method
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const gearRpc = (api as any).rpc.gear;

                    // Get block gas limit for the query
                    const gasLimit = api.blockGasLimit.toBigInt();
                    console.log("[Wallet State API] Using gas limit:", gasLimit.toString());

                    if (gearRpc && typeof gearRpc.calculateReplyForHandle === 'function') {
                        const replyInfo = await gearRpc.calculateReplyForHandle(
                            addressRaw,  // origin (who is calling)
                            LINE_TOKEN_PROGRAM_ID,  // destination program
                            payloadHex,  // encoded message payload
                            gasLimit,  // gasLimit - use block gas limit
                            0,  // value
                            null  // at block hash (null = latest)
                        );

                        console.log("[Wallet State API] Reply info:", replyInfo?.toHuman?.() || replyInfo);

                        if (replyInfo && replyInfo.payload) {
                            const replyPayload = replyInfo.payload.toHex();
                            console.log("[Wallet State API] Reply payload:", replyPayload);

                            // The reply format involves Service/Method prefix + Result.
                            // For BalanceOf (U256), the result is the last 32 bytes.
                            const replyU8a = hexToU8a(replyPayload);
                            if (replyU8a.length >= 32) {
                                // Take the last 32 bytes
                                const balanceU8a = replyU8a.slice(-32);
                                // Convert to BN (BigInt) treating as Little Endian (Sails/SCALE default)
                                const balanceBn = u8aToBn(balanceU8a, { isLe: true });

                                lineRaw = balanceBn.toString();
                                lineBalance = Number(lineRaw) / (10 ** LINE_TOKEN_DECIMALS);
                                console.log("[Wallet State API] LINE balance:", lineBalance, "LINE (raw:", lineRaw, ")");
                            }
                        }
                    } else {
                        // Fallback: Try using api.message.calculateReply
                        console.log("[Wallet State API] Trying api.message.calculateReply...");
                        const calcResult = await api.message.calculateReply({
                            origin: addressRaw as `0x${string}`,
                            destination: LINE_TOKEN_PROGRAM_ID as `0x${string}`,
                            payload: payloadHex as `0x${string}`,
                            value: 0,
                            gasLimit: api.blockGasLimit.toBigInt(),
                        });

                        console.log("[Wallet State API] Calculate result:", calcResult);

                        if (calcResult && calcResult.payload) {
                            const replyPayloadHex = calcResult.payload.toHex();
                            console.log("[Wallet State API] Reply payload:", replyPayloadHex);

                            const replyU8a = hexToU8a(replyPayloadHex);
                            if (replyU8a.length >= 32) {
                                // Take the last 32 bytes
                                const balanceU8a = replyU8a.slice(-32);
                                // Convert to BN (BigInt) treating as Little Endian
                                const balanceBn = u8aToBn(balanceU8a, { isLe: true });

                                lineRaw = balanceBn.toString();
                                lineBalance = Number(lineRaw) / (10 ** LINE_TOKEN_DECIMALS);
                                console.log("[Wallet State API] LINE balance:", lineBalance, "LINE (raw:", lineRaw, ")");
                            }
                        }
                    }
                } else {
                    console.log("[Wallet State API] No payload found in query builder");
                }
            } catch (stateError) {
                console.error("Error reading LINE balance via Sails:", stateError);
                // Continue with 0 balance
            }

            // Convert raw hex to SS58 format
            let addressSS58 = "";
            try {
                addressSS58 = encodeAddress(addressRaw, 137); // 137 is Vara network prefix
            } catch {
                addressSS58 = addressRaw; // Fallback to raw if encoding fails
            }

            // Fetch real transactions from database
            let transactions: Array<{
                id: string;
                type: string;
                amount: number;
                token: string;
                from: string;
                to: string;
                timestamp: string;
                status: string;
            }> = [];

            try {
                // Import database
                const { db } = await import("@/lib/db");

                // Find wallet by address
                const wallet = await db.wallet.findFirst({
                    where: {
                        address: {
                            in: [addressRaw.toLowerCase(), addressSS58]
                        }
                    },
                    include: {
                        transactions: {
                            orderBy: { createdAt: 'desc' },
                            take: 20
                        }
                    }
                });

                if (wallet?.transactions) {
                    transactions = wallet.transactions.map(tx => ({
                        id: tx.id,
                        type: tx.type.toLowerCase(),
                        amount: tx.amount,
                        token: tx.tokenType,
                        from: tx.fromAddress.length > 20
                            ? `${tx.fromAddress.slice(0, 8)}...${tx.fromAddress.slice(-6)}`
                            : tx.fromAddress,
                        to: tx.toAddress.length > 20
                            ? `${tx.toAddress.slice(0, 8)}...${tx.toAddress.slice(-6)}`
                            : tx.toAddress,
                        timestamp: tx.createdAt.toISOString(),
                        status: tx.status.toLowerCase()
                    }));
                }
            } catch (dbError) {
                console.error("[Wallet State API] Error fetching transactions:", dbError);
                // Continue without transactions - don't fail the whole request
            }

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
