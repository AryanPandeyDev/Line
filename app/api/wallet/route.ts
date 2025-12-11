import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { walletService } from "@/src/lib/services/walletService"

/**
 * GET /api/wallet
 * 
 * Returns wallet info, balances, and transaction history.
 */
export async function GET() {
    try {
        const { userId: clerkId } = await auth()

        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const result = await walletService.getWalletInfo(clerkId)
        if (!result) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error("Error fetching wallet:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * POST /api/wallet
 * 
 * Actions: connect, disconnect, sync
 */
export async function POST(request: Request) {
    try {
        const { userId: clerkId } = await auth()

        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { action, address, network } = await request.json()

        if (action === "connect" && address) {
            const result = await walletService.connectWallet(clerkId, address, network)

            if (!result.success) {
                return NextResponse.json({ error: result.message }, { status: 400 })
            }

            return NextResponse.json({
                success: true,
                message: result.message,
                wallet: result.wallet,
            })
        }

        if (action === "disconnect") {
            const result = await walletService.disconnectWallet(clerkId)
            return NextResponse.json({
                success: result.success,
                message: result.message,
            })
        }

        if (action === "sync") {
            const result = await walletService.syncWallet(clerkId)

            if (!result.success) {
                return NextResponse.json({ error: result.message }, { status: 400 })
            }

            return NextResponse.json({
                success: true,
                message: result.message,
                varaBalance: result.varaBalance,
                lineBalance: result.lineBalance,
            })
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Error processing wallet action:", error)
        // Return more specific error message for debugging
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        console.error("Detailed wallet error:", {
            name: error instanceof Error ? error.name : "Unknown",
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        })
        return NextResponse.json({
            error: process.env.NODE_ENV === "development"
                ? `Wallet error: ${errorMessage}`
                : "Internal server error"
        }, { status: 500 })
    }
}
