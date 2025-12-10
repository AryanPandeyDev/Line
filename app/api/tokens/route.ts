import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { tokenService } from "@/src/lib/services/tokenService"

/**
 * GET /api/tokens
 * 
 * Returns token balance, history, and streak info for the current user.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await tokenService.getTokenInfo(clerkId)
    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching tokens:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/tokens
 * 
 * Actions: claim daily reward, add tokens (admin)
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, amount } = await request.json()

    if (action === "claim") {
      const result = await tokenService.claimDailyReward(clerkId)

      if (!result.success) {
        if (result.code === "WALLET_NOT_CONNECTED") {
          return NextResponse.json(
            { error: result.message, code: result.code },
            { status: 403 }
          )
        }
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        newBalance: result.newBalance,
        message: result.message,
        currentStreak: result.currentStreak,
      })
    }

    if (action === "add" && amount && typeof amount === "number") {
      const result = await tokenService.addTokens(clerkId, amount)

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        newBalance: result.newBalance,
        message: result.message,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing token action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
