"use client"

import type React from "react"

import { useState } from "react"
import {
  Coins,
  Gift,
  CheckCircle2,
  Clock,
  ExternalLink,
  Youtube,
  Twitter,
  MessageCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Target,
} from "lucide-react"
import { NeonCard } from "@/components/ui/neon-card"
import { NeonButton } from "@/components/ui/neon-button"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import {
  claimDailyRewardAsync,
  fetchTokens,
  selectDailyClaimAvailable,
  selectTokenBalance,
  selectTotalEarned,
} from "@/lib/redux/slices/tokens-slice"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  reward: number
  type: "daily" | "external" | "achievement"
  icon: React.ElementType
  completed: boolean
  progress?: number
  maxProgress?: number
  externalUrl?: string
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Watch Tutorial Video",
    description: "Learn how to play and earn on LINE",
    reward: 50,
    type: "external",
    icon: Youtube,
    completed: false,
    externalUrl: "https://youtube.com",
  },
  {
    id: "2",
    title: "Follow on Twitter",
    description: "Stay updated with the latest news",
    reward: 30,
    type: "external",
    icon: Twitter,
    completed: false,
    externalUrl: "https://twitter.com",
  },
  {
    id: "3",
    title: "Join Discord",
    description: "Connect with the community",
    reward: 40,
    type: "external",
    icon: MessageCircle,
    completed: true,
  },
  {
    id: "4",
    title: "Complete 3 Games",
    description: "Play and finish 3 games today",
    reward: 100,
    type: "daily",
    icon: Target,
    completed: false,
    progress: 1,
    maxProgress: 3,
  },
  {
    id: "5",
    title: "Win 5 Matches",
    description: "Victory rewards the persistent",
    reward: 150,
    type: "daily",
    icon: TrendingUp,
    completed: false,
    progress: 2,
    maxProgress: 5,
  },
  {
    id: "6",
    title: "Invite a Friend",
    description: "Share the fun, earn together",
    reward: 200,
    type: "achievement",
    icon: Sparkles,
    completed: false,
  },
]

export default function EarnPage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const dailyClaimAvailable = useAppSelector(selectDailyClaimAvailable)
  const tokenBalance = useAppSelector(selectTokenBalance)
  const totalEarned = useAppSelector(selectTotalEarned)

  const [tasks, setTasks] = useState(mockTasks)
  const [claimingDaily, setClaimingDaily] = useState(false)
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)

  const completedTasks = tasks.filter((t) => t.completed).length
  const totalTasks = tasks.length
  const progressPercent = (completedTasks / totalTasks) * 100

  const handleClaimDaily = async () => {
    setClaimingDaily(true)
    try {
      await dispatch(claimDailyRewardAsync()).unwrap()
      toast({
        title: "Daily Reward Claimed!",
        description: "You received your streak bonus!",
      })
      // Refresh tokens after claim
      dispatch(fetchTokens())
    } catch (error) {
      toast({
        title: "Failed to claim",
        description: "Please try again later",
        variant: "destructive",
      })
    }
    setClaimingDaily(false)
  }

  const handleClaimTask = async (task: Task) => {
    if (task.completed) return

    setClaimingTaskId(task.id)

    // For external tasks, open the URL first
    if (task.type === "external" && task.externalUrl) {
      window.open(task.externalUrl, "_blank")
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate verification
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Mark as completed in local state
    // TODO: Replace with API call when tasks API is integrated
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t)))

    toast({
      title: "Task Completed!",
      description: `You earned ${task.reward} LINE tokens`,
    })

    // Refresh token balance from API
    dispatch(fetchTokens())
    setClaimingTaskId(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Coins className="w-8 h-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">Earn LINE</h1>
      </div>

      {/* Progress Overview */}
      <NeonCard className="p-6 mb-8" glowColor="cyan">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Daily Progress</h2>
            <p className="text-muted-foreground">Complete tasks to earn LINE tokens</p>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{tokenBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Current Balance</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neon-magenta">{totalEarned.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Tasks Completed</span>
            <span className="font-medium">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </NeonCard>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily Reward */}
        <div className="lg:col-span-1">
          <NeonCard className={cn("p-6 h-full", dailyClaimAvailable && "animate-neon-pulse")} glowColor="magenta">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-neon-magenta/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-neon-magenta" />
              </div>
              <div>
                <h3 className="font-bold">Daily Reward</h3>
                <p className="text-sm text-muted-foreground">Claim once per day</p>
              </div>
            </div>

            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-neon-magenta/20 to-neon-purple/20 flex items-center justify-center border-2 border-neon-magenta/50">
                <Coins className="w-12 h-12 text-neon-magenta" />
              </div>
              <p className="text-4xl font-bold text-neon-magenta mb-2">100</p>
              <p className="text-muted-foreground">LINE Tokens</p>
            </div>

            <NeonButton
              variant={dailyClaimAvailable ? "secondary" : "outline"}
              className="w-full"
              onClick={handleClaimDaily}
              disabled={!dailyClaimAvailable || claimingDaily}
            >
              {claimingDaily ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Claiming...
                </>
              ) : dailyClaimAvailable ? (
                <>
                  <Gift className="w-4 h-4" />
                  Claim Reward
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Already Claimed
                </>
              )}
            </NeonButton>
          </NeonCard>
        </div>

        {/* Tasks List */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Available Tasks</h3>

          <div className="space-y-4">
            {tasks.map((task) => (
              <NeonCard
                key={task.id}
                className={cn("p-4 transition-all", task.completed && "opacity-60")}
                glowColor={task.completed ? "cyan" : "purple"}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      task.completed ? "bg-neon-green/10" : "bg-muted",
                    )}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-neon-green" />
                    ) : (
                      <task.icon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-primary">+{task.reward}</p>
                        <p className="text-xs text-muted-foreground">LINE</p>
                      </div>
                    </div>

                    {/* Progress bar for daily tasks */}
                    {task.progress !== undefined && task.maxProgress && !task.completed && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span>
                            {task.progress}/{task.maxProgress}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neon-purple"
                            style={{ width: `${(task.progress / task.maxProgress) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    <div className="mt-3">
                      {task.completed ? (
                        <span className="inline-flex items-center gap-1 text-sm text-neon-green">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </span>
                      ) : task.type === "external" ? (
                        <NeonButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleClaimTask(task)}
                          disabled={claimingTaskId === task.id}
                        >
                          {claimingTaskId === task.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3 h-3" />
                              Complete Task
                            </>
                          )}
                        </NeonButton>
                      ) : task.progress !== undefined && task.maxProgress && task.progress >= task.maxProgress ? (
                        <NeonButton
                          size="sm"
                          onClick={() => handleClaimTask(task)}
                          disabled={claimingTaskId === task.id}
                        >
                          {claimingTaskId === task.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            "Claim Reward"
                          )}
                        </NeonButton>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {task.type === "daily" ? "Keep playing to complete" : "Coming soon"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </NeonCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
