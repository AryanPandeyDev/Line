import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getUserByClerkId, getOrCreateWallet } from "@/lib/db-helpers"

export async function GET() {
    try {
        const { userId: clerkId } = await auth()

        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Get wallet
        const wallet = await db.wallet.findUnique({
            where: { userId: user.id },
            include: {
                transactions: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    include: {
                        nft: {
                            select: { name: true },
                        },
                    },
                },
            },
        })

        if (!wallet) {
            return NextResponse.json({
                isConnected: false,
                address: null,
                network: "unknown",
                varaBalance: 0,
                lineBalance: 0,
                nftCount: 0,
                transactions: [],
            })
        }

        // Get NFT count
        const nftCount = await db.userNFT.count({
            where: { userId: user.id },
        })

        // Format transactions
        const formattedTransactions = wallet.transactions.map((tx) => ({
            id: tx.id,
            type: tx.type.toLowerCase().replace("_", "-"),
            amount: tx.amount,
            token: tx.tokenType,
            from: tx.fromAddress,
            to: tx.toAddress,
            timestamp: tx.createdAt.toISOString(),
            status: tx.status.toLowerCase(),
            nftName: tx.nft?.name || null,
        }))

        return NextResponse.json({
            isConnected: wallet.isConnected,
            address: wallet.address,
            shortAddress: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
            network: wallet.network.toLowerCase().replace("_", "-"),
            varaBalance: wallet.varaBalance,
            lineBalance: wallet.lineBalance,
            nftCount,
            transactions: formattedTransactions,
        })
    } catch (error) {
        console.error("Error fetching wallet:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { userId: clerkId } = await auth()

        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const { action, address, network } = await request.json()

        if (action === "connect" && address) {
            const wallet = await getOrCreateWallet(user.id, address)

            if (network) {
                await db.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        network: network.toUpperCase().replace("-", "_") as "VARA_MAINNET" | "VARA_TESTNET",
                    },
                })
            }

            return NextResponse.json({
                success: true,
                message: "Wallet connected successfully!",
                wallet: {
                    address: wallet.address,
                    shortAddress: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
                    network: wallet.network.toLowerCase().replace("_", "-"),
                    varaBalance: wallet.varaBalance,
                    lineBalance: wallet.lineBalance,
                },
            })
        }

        if (action === "disconnect") {
            const wallet = await db.wallet.findUnique({
                where: { userId: user.id },
            })

            if (wallet) {
                await db.wallet.update({
                    where: { id: wallet.id },
                    data: { isConnected: false },
                })
            }

            return NextResponse.json({
                success: true,
                message: "Wallet disconnected",
            })
        }

        if (action === "sync") {
            // In production, this would call blockchain RPC to get real balances
            const wallet = await db.wallet.findUnique({
                where: { userId: user.id },
            })

            if (!wallet) {
                return NextResponse.json(
                    { error: "No wallet connected" },
                    { status: 400 }
                )
            }

            // TODO: Implement real blockchain balance sync
            // For now, just update the sync timestamp
            await db.wallet.update({
                where: { id: wallet.id },
                data: { lastSyncedAt: new Date() },
            })

            return NextResponse.json({
                success: true,
                message: "Wallet synced",
                varaBalance: wallet.varaBalance,
                lineBalance: wallet.lineBalance,
            })
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Error processing wallet action:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
