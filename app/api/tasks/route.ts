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

    // Get all tasks with user progress
    const [allTasks, userTasks, streak] = await Promise.all([
      db.task.findMany({
        where: { isActive: true },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      }),
      db.userTask.findMany({
        where: { userId: user.id },
        include: { task: true },
      }),
      db.dailyStreak.findUnique({
        where: { userId: user.id },
      }),
    ])

    // Get streak rewards config
    const streakRewards = await db.streakReward.findMany({
      orderBy: { day: "asc" },
    })

    // Map user task progress
    const userTaskMap = new Map(userTasks.map((ut) => [ut.taskId, ut]))

    // Format all tasks with full details for UI
    const tasks = allTasks.map((t) => {
      const userTask = userTaskMap.get(t.id)
      const status = userTask?.status || "ACTIVE"
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        description: t.description,
        type: t.type,
        icon: t.icon,
        reward: t.reward,
        xpReward: t.xpReward,
        externalUrl: t.externalUrl,
        status,
        progress: userTask?.progress || 0,
        targetProgress: t.targetProgress,
      }
    })

    // Calculate summary stats
    const completedCount = userTasks.filter(
      (ut) => ut.status === "COMPLETED" || ut.status === "CLAIMED"
    ).length
    const claimedTodayCount = userTasks.filter(
      (ut) => ut.status === "CLAIMED" && ut.claimedAt &&
        new Date(ut.claimedAt).toDateString() === new Date().toDateString()
    ).length

    const summary = {
      total: allTasks.length,
      completed: completedCount,
      claimedToday: claimedTodayCount,
    }

    // Format streak data
    const currentStreak = streak?.currentStreak || 0
    const claimedDays = streak?.claimedDays || []

    const streakData = {
      current: currentStreak,
      rewards: streakRewards.length > 0
        ? streakRewards.map((sr) => ({
          day: sr.day,
          reward: sr.reward,
          claimed: claimedDays.includes(sr.day),
        }))
        : [
          { day: 1, reward: 50, claimed: claimedDays.includes(1) },
          { day: 2, reward: 75, claimed: claimedDays.includes(2) },
          { day: 3, reward: 100, claimed: claimedDays.includes(3) },
          { day: 4, reward: 125, claimed: claimedDays.includes(4) },
          { day: 5, reward: 150, claimed: claimedDays.includes(5) },
          { day: 6, reward: 200, claimed: claimedDays.includes(6) },
          { day: 7, reward: 300, claimed: claimedDays.includes(7) },
        ],
    }

    return NextResponse.json({
      tasks,
      summary,
      streak: streakData,
    })
  } catch (error) {
    console.error("Error fetching tasks:", error)
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

    const { taskId, action } = await request.json()

    const task = await db.task.findUnique({ where: { id: taskId } })
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Get or create user task
    let userTask = await db.userTask.findFirst({
      where: { userId: user.id, taskId },
    })

    if (action === "complete") {
      if (!userTask) {
        userTask = await db.userTask.create({
          data: {
            userId: user.id,
            taskId,
            status: "COMPLETED",
            progress: task.targetProgress,
            completedAt: new Date(),
          },
        })
      } else if (userTask.status === "ACTIVE") {
        userTask = await db.userTask.update({
          where: { id: userTask.id },
          data: {
            status: "COMPLETED",
            progress: task.targetProgress,
            completedAt: new Date(),
          },
        })
      }

      return NextResponse.json({
        success: true,
        message: "Task completed!",
        taskId,
      })
    }

    if (action === "claim") {
      // Enforce wallet connection before allowing claim
      const wallet = await db.wallet.findUnique({
        where: { userId: user.id },
        select: { isConnected: true },
      })

      if (!wallet || !wallet.isConnected) {
        return NextResponse.json(
          { error: "Wallet must be connected to claim task rewards", code: "WALLET_NOT_CONNECTED" },
          { status: 403 }
        )
      }

      if (!userTask || userTask.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "Task must be completed before claiming" },
          { status: 400 }
        )
      }

      // Update task status
      await db.userTask.update({
        where: { id: userTask.id },
        data: {
          status: "CLAIMED",
          claimedAt: new Date(),
        },
      })

      // Add rewards
      await addTokensToUser(user.id, task.reward, `Task: ${task.name}`, "EARN")
      if (task.xpReward > 0) {
        await addXPToUser(user.id, task.xpReward)
      }

      return NextResponse.json({
        success: true,
        message: `Claimed ${task.reward} LINE tokens!`,
        taskId,
        reward: task.reward,
      })
    }

    if (action === "progress") {
      const { amount = 1 } = await request.json()

      if (!userTask) {
        userTask = await db.userTask.create({
          data: {
            userId: user.id,
            taskId,
            status: "ACTIVE",
            progress: Math.min(amount, task.targetProgress),
          },
        })
      } else {
        const newProgress = Math.min(userTask.progress + amount, task.targetProgress)
        const isComplete = newProgress >= task.targetProgress

        userTask = await db.userTask.update({
          where: { id: userTask.id },
          data: {
            progress: newProgress,
            status: isComplete ? "COMPLETED" : "ACTIVE",
            completedAt: isComplete ? new Date() : null,
          },
        })
      }

      return NextResponse.json({
        success: true,
        message: "Progress updated!",
        taskId,
        progress: userTask.progress,
        target: task.targetProgress,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing task action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
