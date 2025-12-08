import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

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
}

const initialState: TokensState = {
  balance: 2450,
  pendingRewards: 150,
  totalEarned: 5600,
  transactions: [
    { id: "1", type: "earn", amount: 100, description: "Daily login bonus", timestamp: new Date().toISOString() },
    {
      id: "2",
      type: "earn",
      amount: 250,
      description: "Completed game mission",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "3",
      type: "spend",
      amount: -1200,
      description: "Purchased NFT: Cyber Wolf",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
  ],
  dailyClaimAvailable: true,
  lastClaimDate: null,
}

const tokensSlice = createSlice({
  name: "tokens",
  initialState,
  reducers: {
    addTokens: (state, action: PayloadAction<{ amount: number; description: string; type: Transaction["type"] }>) => {
      state.balance += action.payload.amount
      state.totalEarned += action.payload.amount > 0 ? action.payload.amount : 0
      state.transactions.unshift({
        id: crypto.randomUUID(),
        type: action.payload.type,
        amount: action.payload.amount,
        description: action.payload.description,
        timestamp: new Date().toISOString(),
      })
    },
    spendTokens: (state, action: PayloadAction<{ amount: number; description: string }>) => {
      if (state.balance >= action.payload.amount) {
        state.balance -= action.payload.amount
        state.transactions.unshift({
          id: crypto.randomUUID(),
          type: "spend",
          amount: -action.payload.amount,
          description: action.payload.description,
          timestamp: new Date().toISOString(),
        })
      }
    },
    claimDailyReward: (state) => {
      if (state.dailyClaimAvailable) {
        const reward = 100
        state.balance += reward
        state.totalEarned += reward
        state.dailyClaimAvailable = false
        state.lastClaimDate = new Date().toISOString()
        state.transactions.unshift({
          id: crypto.randomUUID(),
          type: "claim",
          amount: reward,
          description: "Daily reward claimed",
          timestamp: new Date().toISOString(),
        })
      }
    },
    resetDailyClaim: (state) => {
      state.dailyClaimAvailable = true
    },
  },
})

export const { addTokens, spendTokens, claimDailyReward, resetDailyClaim } = tokensSlice.actions
export default tokensSlice.reducer

// Selectors
export const selectTokenBalance = (state: { tokens: TokensState }) => state.tokens.balance
export const selectTransactions = (state: { tokens: TokensState }) => state.tokens.transactions
export const selectDailyClaimAvailable = (state: { tokens: TokensState }) => state.tokens.dailyClaimAvailable
export const selectTotalEarned = (state: { tokens: TokensState }) => state.tokens.totalEarned
