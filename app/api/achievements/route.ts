import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { achievementService } from "@/src/lib/services/achievementService"

/**
 * GET /api/achievements
 * 
 * Returns all achievements with user progress and stats.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await achievementService.getAchievements(clerkId)
    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching achievements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/achievements
 * 
 * Actions: unlock, progress
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { achievementId, action, amount } = body

    if (!achievementId) {
      return NextResponse.json({ error: "achievementId is required" }, { status: 400 })
    }

    if (action === "unlock") {
      const result = await achievementService.unlockAchievement(clerkId, achievementId)

      if (!result.success) {
        if (result.error === "Achievement not found") {
          return NextResponse.json({ error: result.error }, { status: 404 })
        }
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        rewards: result.rewards,
      })
    }

    if (action === "progress") {
      const result = await achievementService.updateProgress(clerkId, achievementId, amount || 1)

      if (!result.success) {
        if (result.error === "Achievement not found") {
          return NextResponse.json({ error: result.error }, { status: 404 })
        }
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        progress: result.progress,
        target: result.target,
        unlocked: result.unlocked,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing achievement action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
