import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getUserByClerkId, addTokensToUser, addXPToUser } from "@/lib/db-helpers"

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

    // Get all achievements with user progress
    const [allAchievements, userAchievements] = await Promise.all([
      db.achievement.findMany({
        where: { isHidden: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      db.userAchievement.findMany({
        where: { userId: user.id },
      }),
    ])

    // Map user achievements
    const userAchMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))

    // Format achievements
    const achievements = allAchievements.map((ach) => {
      const userAch = userAchMap.get(ach.id)
      return {
        id: ach.slug,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        xpReward: ach.xpReward,
        tokenReward: ach.tokenReward,
        unlocked: userAch?.isUnlocked || false,
        unlockedAt: userAch?.unlockedAt?.toISOString() || null,
        progress: userAch && ach.targetValue > 1
          ? { current: userAch.progress, target: ach.targetValue }
          : undefined,
      }
    })

    // Calculate stats
    const unlockedCount = achievements.filter((a) => a.unlocked).length
    const totalXpEarned = achievements
      .filter((a) => a.unlocked)
      .reduce((acc, a) => acc + a.xpReward, 0)
    const totalTokensEarned = achievements
      .filter((a) => a.unlocked)
      .reduce((acc, a) => acc + a.tokenReward, 0)

    return NextResponse.json({
      achievements,
      stats: {
        total: achievements.length,
        unlocked: unlockedCount,
        totalXpEarned,
        totalTokensEarned,
      },
    })
  } catch (error) {
    console.error("Error fetching achievements:", error)
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

    const { achievementId, action } = await request.json()

    // Find achievement by slug or id
    const achievement = await db.achievement.findFirst({
      where: {
        OR: [{ id: achievementId }, { slug: achievementId }],
      },
    })

    if (!achievement) {
      return NextResponse.json({ error: "Achievement not found" }, { status: 404 })
    }

    // Get or create user achievement
    let userAchievement = await db.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId: achievement.id,
        },
      },
    })

    if (action === "unlock") {
      if (userAchievement?.isUnlocked) {
        return NextResponse.json(
          { error: "Achievement already unlocked" },
          { status: 400 }
        )
      }

      if (!userAchievement) {
        userAchievement = await db.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            progress: achievement.targetValue,
            isUnlocked: true,
            unlockedAt: new Date(),
          },
        })
      } else {
        userAchievement = await db.userAchievement.update({
          where: { id: userAchievement.id },
          data: {
            progress: achievement.targetValue,
            isUnlocked: true,
            unlockedAt: new Date(),
          },
        })
      }

      // Grant rewards
      if (achievement.tokenReward > 0) {
        await addTokensToUser(
          user.id,
          achievement.tokenReward,
          `Achievement: ${achievement.name}`,
          "ACHIEVEMENT_REWARD"
        )
      }
      if (achievement.xpReward > 0) {
        await addXPToUser(user.id, achievement.xpReward)
      }

      return NextResponse.json({
        success: true,
        message: `Achievement unlocked: ${achievement.name}!`,
        rewards: {
          tokens: achievement.tokenReward,
          xp: achievement.xpReward,
        },
      })
    }

    if (action === "progress") {
      const { amount = 1 } = await request.json()

      if (!userAchievement) {
        userAchievement = await db.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            progress: Math.min(amount, achievement.targetValue),
            isUnlocked: amount >= achievement.targetValue,
            unlockedAt: amount >= achievement.targetValue ? new Date() : null,
          },
        })
      } else if (!userAchievement.isUnlocked) {
        const newProgress = Math.min(
          userAchievement.progress + amount,
          achievement.targetValue
        )
        const isNowUnlocked = newProgress >= achievement.targetValue

        userAchievement = await db.userAchievement.update({
          where: { id: userAchievement.id },
          data: {
            progress: newProgress,
            isUnlocked: isNowUnlocked,
            unlockedAt: isNowUnlocked ? new Date() : null,
          },
        })

        // Auto-grant rewards on unlock
        if (isNowUnlocked) {
          if (achievement.tokenReward > 0) {
            await addTokensToUser(
              user.id,
              achievement.tokenReward,
              `Achievement: ${achievement.name}`,
              "ACHIEVEMENT_REWARD"
            )
          }
          if (achievement.xpReward > 0) {
            await addXPToUser(user.id, achievement.xpReward)
          }
        }
      }

      return NextResponse.json({
        success: true,
        progress: userAchievement.progress,
        target: achievement.targetValue,
        unlocked: userAchievement.isUnlocked,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing achievement action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
