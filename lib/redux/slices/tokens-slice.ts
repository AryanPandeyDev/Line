import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

interface Transaction {
  id: string
  type: "earn" | "spend" | "transfer" | "claim"
  amount: number
  description: string
  timestamp: string
}

interface TokensState {
  balance: number
  pendingRewards: number
  totalEarned: number
  transactions: Transaction[]
  dailyClaimAvailable: boolean
  lastClaimDate: string | null
  isLoading: boolean
  error: string | null
}

const initialState: TokensState = {
  balance: 0,
  pendingRewards: 0,
  totalEarned: 0,
  transactions: [],
  dailyClaimAvailable: false,
  lastClaimDate: null,
  isLoading: false,
  error: null,
}

// Async thunk to fetch tokens from API
export const fetchTokens = createAsyncThunk(
  "tokens/fetchTokens",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tokens")
      if (!response.ok) {
        throw new Error("Failed to fetch tokens")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk to claim daily reward
export const claimDailyRewardAsync = createAsyncThunk(
  "tokens/claimDailyReward",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to claim reward")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

const tokensSlice = createSlice({
  name: "tokens",
  initialState,
  reducers: {
    // Local state updates (for optimistic UI)
    setTokens: (state, action: PayloadAction<Partial<TokensState>>) => {
      return { ...state, ...action.payload }
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload)
    },
    updateBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTokens.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTokens.fulfilled, (state, action) => {
        state.isLoading = false
        state.balance = action.payload.balance
        state.dailyClaimAvailable = action.payload.dailyClaimAvailable
        state.transactions = action.payload.history.map((h: { type: string; amount: number; source: string; timestamp: string }, i: number) => ({
          id: `tx-${i}`,
          type: h.type as Transaction["type"],
          amount: h.amount,
          description: h.source,
          timestamp: h.timestamp,
        }))
      })
      .addCase(fetchTokens.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(claimDailyRewardAsync.pending, (state) => {
        state.isLoading = true
      })
      .addCase(claimDailyRewardAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.balance = action.payload.newBalance
        state.dailyClaimAvailable = false
        state.lastClaimDate = new Date().toISOString()
      })
      .addCase(claimDailyRewardAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setTokens, addTransaction, updateBalance } = tokensSlice.actions
export default tokensSlice.reducer

// Selectors
export const selectTokenBalance = (state: { tokens: TokensState }) => state.tokens.balance
export const selectTransactions = (state: { tokens: TokensState }) => state.tokens.transactions
export const selectDailyClaimAvailable = (state: { tokens: TokensState }) => state.tokens.dailyClaimAvailable
export const selectTotalEarned = (state: { tokens: TokensState }) => state.tokens.totalEarned
export const selectTokensLoading = (state: { tokens: TokensState }) => state.tokens.isLoading
