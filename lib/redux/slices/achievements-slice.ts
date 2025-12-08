import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: "common" | "rare" | "epic" | "legendary"
  unlocked: boolean
  unlockedAt?: string
  progress?: number
  maxProgress?: number
  reward: number
}

interface AchievementsState {
  achievements: Achievement[]
  totalUnlocked: number
}

const initialAchievements: Achievement[] = [
  {
    id: "1",
    title: "First Steps",
    description: "Complete your first game",
    icon: "🎮",
    rarity: "common",
    unlocked: true,
    unlockedAt: "2024-01-15",
    reward: 50,
  },
  {
    id: "2",
    title: "Token Collector",
    description: "Earn 1000 LINE tokens",
    icon: "💎",
    rarity: "rare",
    unlocked: true,
    unlockedAt: "2024-01-18",
    reward: 200,
  },
  {
    id: "3",
    title: "NFT Enthusiast",
    description: "Own 5 NFTs",
    icon: "🖼️",
    rarity: "epic",
    unlocked: false,
    progress: 2,
    maxProgress: 5,
    reward: 500,
  },
  {
    id: "4",
    title: "Whale Status",
    description: "Own 10,000 LINE tokens",
    icon: "🐋",
    rarity: "legendary",
    unlocked: false,
    progress: 2450,
    maxProgress: 10000,
    reward: 2000,
  },
  {
    id: "5",
    title: "Social Butterfly",
    description: "Refer 10 friends",
    icon: "🦋",
    rarity: "epic",
    unlocked: false,
    progress: 3,
    maxProgress: 10,
    reward: 1000,
  },
  {
    id: "6",
    title: "Daily Warrior",
    description: "Login 30 days in a row",
    icon: "⚔️",
    rarity: "rare",
    unlocked: false,
    progress: 7,
    maxProgress: 30,
    reward: 300,
  },
]

const initialState: AchievementsState = {
  achievements: initialAchievements,
  totalUnlocked: initialAchievements.filter((a) => a.unlocked).length,
}

const achievementsSlice = createSlice({
  name: "achievements",
  initialState,
  reducers: {
    unlockAchievement: (state, action: PayloadAction<string>) => {
      const achievement = state.achievements.find((a) => a.id === action.payload)
      if (achievement && !achievement.unlocked) {
        achievement.unlocked = true
        achievement.unlockedAt = new Date().toISOString()
        state.totalUnlocked += 1
      }
    },
    updateProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
      const achievement = state.achievements.find((a) => a.id === action.payload.id)
      if (achievement && achievement.maxProgress) {
        achievement.progress = Math.min(action.payload.progress, achievement.maxProgress)
        if (achievement.progress >= achievement.maxProgress && !achievement.unlocked) {
          achievement.unlocked = true
          achievement.unlockedAt = new Date().toISOString()
          state.totalUnlocked += 1
        }
      }
    },
  },
})

export const { unlockAchievement, updateProgress } = achievementsSlice.actions
export default achievementsSlice.reducer

// Selectors
export const selectAchievements = (state: { achievements: AchievementsState }) => state.achievements.achievements
export const selectUnlockedAchievements = (state: { achievements: AchievementsState }) =>
  state.achievements.achievements.filter((a) => a.unlocked)
export const selectLockedAchievements = (state: { achievements: AchievementsState }) =>
  state.achievements.achievements.filter((a) => !a.unlocked)
export const selectTotalUnlocked = (state: { achievements: AchievementsState }) => state.achievements.totalUnlocked
