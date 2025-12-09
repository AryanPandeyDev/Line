"use client"

import type React from "react"
import { useEffect, useState } from "react"
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
  Wallet,
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
  selectNextRewardAmount,
  selectCurrentStreak,
  selectWalletConnected,
  selectTokensLoading,
} from "@/lib/redux/slices/tokens-slice"
import {
  fetchTasks,
  selectTasks,
  selectTasksSummary,
  completeTaskAsync,
  claimTaskRewardAsync,
  selectTasksLoading,
  type Task,
} from "@/lib/redux/slices/tasks-slice"
import { selectIsWalletConnected } from "@/lib/redux/slices/wallet-slice"
import { fetchWallet } from "@/lib/redux/slices/wallet-slice"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

// Icon mapping for task icons from database
const iconMap: Record<string, React.ElementType> = {
  youtube: Youtube,
  twitter: Twitter,
  "message-circle": MessageCircle,
  target: Target,
  "trending-up": TrendingUp,
  sparkles: Sparkles,
}

function getTaskIcon(iconName: string | null): React.ElementType {
  if (!iconName) return Target
  return iconMap[iconName.toLowerCase()] || Target
}

export default function EarnPage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Token state
  const tokenBalance = useAppSelector(selectTokenBalance)
  const totalEarned = useAppSelector(selectTotalEarned)
  const dailyClaimAvailable = useAppSelector(selectDailyClaimAvailable)
  const nextRewardAmount = useAppSelector(selectNextRewardAmount)
  const currentStreak = useAppSelector(selectCurrentStreak)
  const tokensLoading = useAppSelector(selectTokensLoading)

  // Wallet state - check both wallet slice and tokens slice for connection
  const walletConnected = useAppSelector(selectIsWalletConnected)
  const walletConnectedFromTokens = useAppSelector(selectWalletConnected)
  const isWalletConnected = walletConnected || walletConnectedFromTokens

  // Tasks state
  const tasks = useAppSelector(selectTasks)
  const tasksSummary = useAppSelector(selectTasksSummary)
  const tasksLoading = useAppSelector(selectTasksLoading)

  // Local UI state
  const [claimingDaily, setClaimingDaily] = useState(false)
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchTokens())
    dispatch(fetchTasks())
    dispatch(fetchWallet())
  }, [dispatch])

  const completedTasks = tasksSummary.completed
  const totalTasks = tasksSummary.total
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const handleClaimDaily = async () => {
    if (!isWalletConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to claim rewards",
        variant: "destructive",
      })
      return
    }

    setClaimingDaily(true)
    try {
      await dispatch(claimDailyRewardAsync()).unwrap()
      toast({
        title: "Daily Reward Claimed!",
        description: `You received ${nextRewardAmount} LINE tokens for your streak!`,
      })
      // Refresh tokens after claim
      dispatch(fetchTokens())
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Please try again later"
      toast({
        title: "Failed to claim",
        description: errorMessage.includes("WALLET_NOT_CONNECTED")
          ? "Please connect your wallet first"
          : errorMessage,
        variant: "destructive",
      })
    }
    setClaimingDaily(false)
  }

  const handleCompleteTask = async (task: Task) => {
    // For external tasks, open the URL
    if (task.type === "EXTERNAL" && task.externalUrl) {
      window.open(task.externalUrl, "_blank")
    }

    setClaimingTaskId(task.id)
    try {
      await dispatch(completeTaskAsync(task.id)).unwrap()
      toast({
        title: "Task Completed!",
        description: "You can now claim your reward",
      })
      dispatch(fetchTasks())
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Please try again later"
      toast({
        title: "Task Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
    setClaimingTaskId(null)
  }

  const handleClaimTask = async (task: Task) => {
    if (!isWalletConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to claim rewards",
        variant: "destructive",
      })
      return
    }

    setClaimingTaskId(task.id)
    try {
      const result = await dispatch(claimTaskRewardAsync(task.id)).unwrap()
      toast({
        title: "Reward Claimed!",
        description: `You earned ${result.reward || task.reward} LINE tokens`,
      })
      dispatch(fetchTokens())
      dispatch(fetchTasks())
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Please try again later"
      toast({
        title: "Failed to claim",
        description: errorMessage.includes("WALLET_NOT_CONNECTED")
          ? "Please connect your wallet first"
          : errorMessage,
        variant: "destructive",
      })
    }
    setClaimingTaskId(null)
  }

  // Determine button state for tasks
  const getTaskButton = (task: Task) => {
    const TaskIcon = getTaskIcon(task.icon)
    const isLoading = claimingTaskId === task.id

    if (task.status === "CLAIMED") {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-neon-green">
          <CheckCircle2 className="w-4 h-4" />
          Claimed
        </span>
      )
    }

    if (task.status === "COMPLETED") {
      // Can claim, but need wallet
      if (!isWalletConnected) {
        return (
          <NeonButton variant="outline" size="sm" disabled>
            <Wallet className="w-3 h-3" />
            Connect Wallet
          </NeonButton>
        )
      }
      return (
        <NeonButton size="sm" onClick={() => handleClaimTask(task)} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Claiming...
            </>
          ) : (
            "Claim Reward"
          )}
        </NeonButton>
      )
    }

    // ACTIVE status
    if (task.type === "EXTERNAL") {
      return (
        <NeonButton variant="outline" size="sm" onClick={() => handleCompleteTask(task)} disabled={isLoading}>
          {isLoading ? (
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
      )
    }

    if (task.type === "DAILY" && task.progress >= task.targetProgress) {
      return (
        <NeonButton size="sm" onClick={() => handleCompleteTask(task)} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Completing...
            </>
          ) : (
            "Complete"
          )}
        </NeonButton>
      )
    }

    return (
      <span className="text-sm text-muted-foreground">
        {task.type === "DAILY" ? "Keep playing to complete" : "Coming soon"}
      </span>
    )
  }

  // Daily claim button logic
  const getDailyClaimButton = () => {
    if (claimingDaily) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Claiming...
        </>
      )
    }

    if (!isWalletConnected) {
      return (
        <>
          <Wallet className="w-4 h-4" />
          Connect Wallet to Claim
        </>
      )
    }

    if (dailyClaimAvailable) {
      return (
        <>
          <Gift className="w-4 h-4" />
          Claim Reward
        </>
      )
    }

    return (
      <>
        <Clock className="w-4 h-4" />
        Already Claimed
      </>
    )
  }

  const canClaimDaily = isWalletConnected && dailyClaimAvailable

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
            <div className="text-center">
              <p className="text-3xl font-bold text-neon-cyan">{completedTasks}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
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
          <NeonCard className={cn("p-6 h-full", canClaimDaily && "animate-neon-pulse")} glowColor="magenta">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-neon-magenta/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-neon-magenta" />
              </div>
              <div>
                <h3 className="font-bold">Daily Reward</h3>
                <p className="text-sm text-muted-foreground">
                  Day {currentStreak + 1} Streak
                </p>
              </div>
            </div>

            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-neon-magenta/20 to-neon-purple/20 flex items-center justify-center border-2 border-neon-magenta/50">
                <Coins className="w-12 h-12 text-neon-magenta" />
              </div>
              <p className="text-4xl font-bold text-neon-magenta mb-2">{nextRewardAmount}</p>
              <p className="text-muted-foreground">LINE Tokens</p>
            </div>

            <NeonButton
              variant={canClaimDaily ? "secondary" : "outline"}
              className="w-full"
              onClick={handleClaimDaily}
              disabled={!canClaimDaily || claimingDaily}
            >
              {getDailyClaimButton()}
            </NeonButton>
          </NeonCard>
        </div>

        {/* Tasks List */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Available Tasks</h3>

          {tasksLoading && tasks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <NeonCard className="p-8 text-center">
              <p className="text-muted-foreground">No tasks available</p>
            </NeonCard>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const TaskIcon = getTaskIcon(task.icon)
                const isCompleted = task.status === "COMPLETED" || task.status === "CLAIMED"

                return (
                  <NeonCard
                    key={task.id}
                    className={cn("p-4 transition-all", task.status === "CLAIMED" && "opacity-60")}
                    glowColor={isCompleted ? "cyan" : "purple"}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                          task.status === "CLAIMED" ? "bg-neon-green/10" : "bg-muted"
                        )}
                      >
                        {task.status === "CLAIMED" ? (
                          <CheckCircle2 className="w-6 h-6 text-neon-green" />
                        ) : (
                          <TaskIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-medium">{task.name}</h4>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-primary">+{task.reward}</p>
                            <p className="text-xs text-muted-foreground">LINE</p>
                            {task.xpReward > 0 && (
                              <p className="text-xs text-neon-cyan">+{task.xpReward} XP</p>
                            )}
                          </div>
                        </div>

                        {/* Progress bar for daily tasks */}
                        {task.type === "DAILY" && task.targetProgress > 1 && task.status === "ACTIVE" && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span>
                                {task.progress}/{task.targetProgress}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-neon-purple"
                                style={{ width: `${(task.progress / task.targetProgress) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action button */}
                        <div className="mt-3">{getTaskButton(task)}</div>
                      </div>
                    </div>
                  </NeonCard>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
