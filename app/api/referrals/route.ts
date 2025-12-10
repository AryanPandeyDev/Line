import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { referralService } from "@/src/lib/services/referralService"

/**
 * GET /api/referrals
 * 
 * Returns the current user's referral info including code, stats, tiers, and referred users.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await referralService.getReferralInfo(clerkId)
    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching referrals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/referrals
 * 
 * Actions: apply referral code
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, referralCode } = await request.json()

    if (action === "apply" && referralCode) {
      const result = await referralService.applyReferralCode(clerkId, referralCode)

      if (!result.success) {
        // Determine status code based on error message
        if (result.message === "User not found") {
          return NextResponse.json({ error: result.message }, { status: 404 })
        }
        if (result.message === "Invalid referral code") {
          return NextResponse.json({ error: result.message }, { status: 404 })
        }
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: result.message })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing referral action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
