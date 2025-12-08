import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

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
}

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    startConnecting: (state) => {
      state.isConnecting = true
      state.error = null
    },
    connectWallet: (state, action: PayloadAction<{ address: string }>) => {
      const addr = action.payload.address
      state.isConnected = true
      state.isConnecting = false
      state.address = addr
      state.shortAddress = `${addr.slice(0, 6)}...${addr.slice(-4)}`
      state.network = "vara-testnet"
      // Mock balances
      state.varaBalance = 125.5
      state.lineBalance = 2450
      state.nftCount = 2
      state.transactions = [
        {
          id: "1",
          type: "receive",
          amount: 100,
          token: "VARA",
          from: "0x1234...5678",
          to: addr,
          timestamp: new Date().toISOString(),
          status: "confirmed",
        },
        {
          id: "2",
          type: "nft-purchase",
          amount: 1200,
          token: "LINE",
          from: addr,
          to: "LINE Marketplace",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: "confirmed",
        },
      ]
      state.error = null
    },
    disconnectWallet: (state) => {
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
    setNetwork: (state, action: PayloadAction<NetworkType>) => {
      state.network = action.payload
    },
    updateBalances: (state, action: PayloadAction<{ vara?: number; line?: number }>) => {
      if (action.payload.vara !== undefined) state.varaBalance = action.payload.vara
      if (action.payload.line !== undefined) state.lineBalance = action.payload.line
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isConnecting = false
    },
    addTransaction: (state, action: PayloadAction<Omit<WalletTransaction, "id">>) => {
      state.transactions.unshift({
        ...action.payload,
        id: crypto.randomUUID(),
      })
    },
  },
})

export const {
  startConnecting,
  connectWallet,
  disconnectWallet,
  setNetwork,
  updateBalances,
  setError,
  addTransaction,
} = walletSlice.actions

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
