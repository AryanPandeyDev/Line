import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  level: number
  xp: number
  xpToNextLevel: number
  tokens: number
  bonusPoints: number
  referralCode: string
  totalReferrals: number
  totalPlayTimeSeconds: number
  totalPlayTimeHours: number
  createdAt: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
}

// Async thunk to fetch user profile from API
export const fetchUserProfile = createAsyncThunk(
  "auth/fetchUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/user")
      if (!response.ok) {
        if (response.status === 401) {
          return null // Not authenticated
        }
        throw new Error("Failed to fetch user profile")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk to update user profile
export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async (updates: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        throw new Error("Failed to update profile")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
      state.isLoading = false
      state.error = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isLoading = false
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
    },
    updateTokenBalance: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.tokens = action.payload
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.user = action.payload
          state.isAuthenticated = true
        } else {
          state.user = null
          state.isAuthenticated = false
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        // Merge the updated user data
        if (state.user && action.payload) {
          state.user = { ...state.user, ...action.payload }
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setUser, setLoading, setError, logout, updateTokenBalance } = authSlice.actions
export default authSlice.reducer

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading
export const selectUserTokens = (state: { auth: AuthState }) => state.auth.user?.tokens || 0
export const selectUserLevel = (state: { auth: AuthState }) => state.auth.user?.level || 1
export const selectTotalPlayTimeHours = (state: { auth: AuthState }) => state.auth.user?.totalPlayTimeHours || 0
