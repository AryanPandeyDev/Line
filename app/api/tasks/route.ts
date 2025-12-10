import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { taskService } from "@/src/lib/services/taskService"

/**
 * GET /api/tasks
 * 
 * Returns all tasks with user progress and streak info.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await taskService.getTasks(clerkId)
    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/tasks
 * 
 * Actions: complete, claim, progress
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, action, amount } = body

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 })
    }

    if (action === "complete") {
      const result = await taskService.completeTask(clerkId, taskId)

      if (!result.success) {
        if (result.message === "Task not found") {
          return NextResponse.json({ error: result.message }, { status: 404 })
        }
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        taskId: result.taskId,
      })
    }

    if (action === "claim") {
      const result = await taskService.claimTaskReward(clerkId, taskId)

      if (!result.success) {
        if (result.message === "Task not found") {
          return NextResponse.json({ error: result.message }, { status: 404 })
        }
        if (result.message === "Wallet must be connected to claim task rewards") {
          return NextResponse.json(
            { error: result.message, code: "WALLET_NOT_CONNECTED" },
            { status: 403 }
          )
        }
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        taskId: result.taskId,
        reward: result.reward,
      })
    }

    if (action === "progress") {
      const result = await taskService.updateProgress(clerkId, taskId, amount || 1)

      if (!result.success) {
        if (result.message === "Task not found") {
          return NextResponse.json({ error: result.message }, { status: 404 })
        }
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        taskId: result.taskId,
        progress: result.progress,
        target: result.target,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing task action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
