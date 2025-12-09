import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from "@reduxjs/toolkit"

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
  xpReward?: number
}

interface AchievementsState {
  achievements: Achievement[]
  totalUnlocked: number
  isLoading: boolean
  error: string | null
}

const initialState: AchievementsState = {
  achievements: [],
  totalUnlocked: 0,
  isLoading: false,
  error: null,
}

// Async thunk to fetch achievements from API
export const fetchAchievements = createAsyncThunk(
  "achievements/fetchAchievements",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/achievements")
      if (!response.ok) {
        throw new Error("Failed to fetch achievements")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk to unlock achievement
export const unlockAchievementAsync = createAsyncThunk(
  "achievements/unlock",
  async (achievementId: string, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId, action: "unlock" }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to unlock achievement")
      }
      return { achievementId, ...(await response.json()) }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Map rarity based on rewards
function mapRarity(xpReward: number, tokenReward: number): Achievement["rarity"] {
  const totalReward = xpReward + tokenReward
  if (totalReward >= 1000) return "legendary"
  if (totalReward >= 500) return "epic"
  if (totalReward >= 200) return "rare"
  return "common"
}

const achievementsSlice = createSlice({
  name: "achievements",
  initialState,
  reducers: {
    setAchievements: (state, action: PayloadAction<Achievement[]>) => {
      state.achievements = action.payload
      state.totalUnlocked = action.payload.filter((a) => a.unlocked).length
    },
    updateLocalProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
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
  extraReducers: (builder) => {
    builder
      .addCase(fetchAchievements.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAchievements.fulfilled, (state, action) => {
        state.isLoading = false
        // Map API response to Achievement interface
        state.achievements = action.payload.achievements.map((a: {
          id: string
          name: string
          description: string
          icon: string
          xpReward: number
          tokenReward: number
          unlocked: boolean
          unlockedAt: string | null
          progress?: { current: number; target: number }
        }) => ({
          id: a.id,
          title: a.name,
          description: a.description,
          icon: a.icon || "🏆",
          rarity: mapRarity(a.xpReward, a.tokenReward),
          unlocked: a.unlocked,
          unlockedAt: a.unlockedAt || undefined,
          progress: a.progress?.current,
          maxProgress: a.progress?.target,
          reward: a.tokenReward,
          xpReward: a.xpReward,
        }))
        state.totalUnlocked = action.payload.stats.unlocked
      })
      .addCase(fetchAchievements.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(unlockAchievementAsync.fulfilled, (state, action) => {
        const achievement = state.achievements.find((a) => a.id === action.payload.achievementId)
        if (achievement && !achievement.unlocked) {
          achievement.unlocked = true
          achievement.unlockedAt = new Date().toISOString()
          state.totalUnlocked += 1
        }
      })
  },
})

export const { setAchievements, updateLocalProgress } = achievementsSlice.actions
export default achievementsSlice.reducer

// Selectors
export const selectAchievements = (state: { achievements: AchievementsState }) => state.achievements.achievements
export const selectUnlockedAchievements = createSelector(
  [selectAchievements],
  (achievements) => achievements.filter((a) => a.unlocked)
)
export const selectLockedAchievements = createSelector(
  [selectAchievements],
  (achievements) => achievements.filter((a) => !a.unlocked)
)
export const selectTotalUnlocked = (state: { achievements: AchievementsState }) => state.achievements.totalUnlocked
export const selectAchievementsLoading = (state: { achievements: AchievementsState }) => state.achievements.isLoading
