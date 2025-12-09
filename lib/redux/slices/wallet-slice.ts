import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

type NetworkType = "vara-mainnet" | "vara-testnet" | "unknown"

interface WalletTransaction {
  id: string
  type: "send" | "receive" | "nft-purchase" | "nft-sale"
  amount: number
  token: "VARA" | "LINE"
  from: string
  to: string
  timestamp: string
  status: "pending" | "confirmed" | "failed"
}

interface WalletState {
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  shortAddress: string | null
  network: NetworkType
  varaBalance: number
  lineBalance: number
  nftCount: number
  transactions: WalletTransaction[]
  error: string | null
  isLoading: boolean
}

const initialState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  shortAddress: null,
  network: "unknown",
  varaBalance: 0,
  lineBalance: 0,
  nftCount: 0,
  transactions: [],
  error: null,
  isLoading: false,
}

// Async thunk to fetch wallet from API
export const fetchWallet = createAsyncThunk(
  "wallet/fetchWallet",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/wallet")
      if (!response.ok) {
        throw new Error("Failed to fetch wallet")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk to connect wallet
export const connectWalletAsync = createAsyncThunk(
  "wallet/connect",
  async ({ address, network }: { address: string; network?: string }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", address, network }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to connect wallet")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk to disconnect wallet
export const disconnectWalletAsync = createAsyncThunk(
  "wallet/disconnect",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      })
      if (!response.ok) {
        throw new Error("Failed to disconnect wallet")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    startConnecting: (state) => {
      state.isConnecting = true
      state.error = null
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isConnecting = false
    },
    clearWallet: (state) => {
      state.isConnected = false
      state.isConnecting = false
      state.address = null
      state.shortAddress = null
      state.network = "unknown"
      state.varaBalance = 0
      state.lineBalance = 0
      state.nftCount = 0
      state.transactions = []
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch wallet
      .addCase(fetchWallet.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.isLoading = false
        state.isConnected = action.payload.isConnected
        state.address = action.payload.address
        state.shortAddress = action.payload.shortAddress
        state.network = action.payload.network as NetworkType
        state.varaBalance = action.payload.varaBalance
        state.lineBalance = action.payload.lineBalance
        state.nftCount = action.payload.nftCount
        state.transactions = action.payload.transactions || []
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Connect wallet
      .addCase(connectWalletAsync.pending, (state) => {
        state.isConnecting = true
        state.error = null
      })
      .addCase(connectWalletAsync.fulfilled, (state, action) => {
        state.isConnecting = false
        state.isConnected = true
        state.address = action.payload.wallet.address
        state.shortAddress = action.payload.wallet.shortAddress
        state.network = action.payload.wallet.network as NetworkType
        state.varaBalance = action.payload.wallet.varaBalance
        state.lineBalance = action.payload.wallet.lineBalance
      })
      .addCase(connectWalletAsync.rejected, (state, action) => {
        state.isConnecting = false
        state.error = action.payload as string
      })
      // Disconnect wallet
      .addCase(disconnectWalletAsync.fulfilled, (state) => {
        state.isConnected = false
        state.address = null
        state.shortAddress = null
        state.network = "unknown"
        state.varaBalance = 0
        state.lineBalance = 0
        state.nftCount = 0
        state.transactions = []
      })
  },
})

export const { startConnecting, setError, clearWallet } = walletSlice.actions
export default walletSlice.reducer

// Selectors
export const selectWallet = (state: { wallet: WalletState }) => state.wallet
export const selectIsWalletConnected = (state: { wallet: WalletState }) => state.wallet.isConnected
export const selectWalletAddress = (state: { wallet: WalletState }) => state.wallet.address
export const selectShortAddress = (state: { wallet: WalletState }) => state.wallet.shortAddress
export const selectNetwork = (state: { wallet: WalletState }) => state.wallet.network
export const selectWalletBalances = (state: { wallet: WalletState }) => ({
  vara: state.wallet.varaBalance,
  line: state.wallet.lineBalance,
})
export const selectWalletTransactions = (state: { wallet: WalletState }) => state.wallet.transactions
export const selectWalletLoading = (state: { wallet: WalletState }) => state.wallet.isLoading
