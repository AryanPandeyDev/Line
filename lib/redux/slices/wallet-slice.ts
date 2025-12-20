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
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  isWalletInstalled: boolean
  loadingWallet: boolean
  error: string | null

  // Addresses
  address: string | null
  addressRaw: string | null
  shortAddress: string | null

  // Network
  network: NetworkType

  // Balances
  varaBalance: number
  lineBalance: number
  lineRaw: string

  // NFT count
  nftCount: number

  // Transaction history
  transactionHistory: WalletTransaction[]
  transactions: WalletTransaction[]

  // Loading state
  isLoading: boolean

  // Flag to prevent infinite fetch loops
  hasFetched: boolean
}

const initialState: WalletState = {
  isConnected: false,
  isConnecting: false,
  isWalletInstalled: true,
  loadingWallet: false,
  error: null,

  address: null,
  addressRaw: null,
  shortAddress: null,

  network: "unknown",

  varaBalance: 0,
  lineBalance: 0,
  lineRaw: "0",

  nftCount: 0,

  transactionHistory: [],
  transactions: [],

  isLoading: false,
  hasFetched: false,
}

// SubWallet injected provider type
declare global {
  interface Window {
    injectedWeb3?: {
      'subwallet-js'?: {
        enable: () => Promise<{
          accounts: {
            get: () => Promise<Array<{ address: string; name?: string }>>
            subscribe: (callback: (accounts: Array<{ address: string }>) => void) => () => void
          }
          signer: unknown
        }>
        version: string
      }
    }
  }
}

/**
 * Fetch wallet state from backend database
 */
export const fetchWallet = createAsyncThunk(
  "wallet/fetchWallet",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/wallet")
      if (!response.ok) {
        if (response.status === 401) {
          return null
        }
        throw new Error("Failed to fetch wallet")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

/**
 * Connect wallet - saves to backend database
 */
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

/**
 * Connect SubWallet - detects extension, prompts account selection, saves to backend
 */
export const connectSubwallet = createAsyncThunk(
  "wallet/connectSubwallet",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      if (typeof window === "undefined") {
        return rejectWithValue("Window not available")
      }

      const subwallet = window.injectedWeb3?.['subwallet-js']

      if (!subwallet) {
        dispatch(setWalletInstalled(false))
        return rejectWithValue("SubWallet not detected. Please install SubWallet extension.")
      }

      dispatch(setWalletInstalled(true))

      // Enable extension - this opens SubWallet popup for authorization
      const extension = await subwallet.enable()

      // Get current accounts
      const accounts = await extension.accounts.get()

      if (!accounts || accounts.length === 0) {
        return rejectWithValue("No accounts found. Please create an account in SubWallet.")
      }

      // If only one account, use it. Otherwise let user know to select in SubWallet first.
      let selectedAccount = accounts[0]

      if (accounts.length > 1) {
        // With multiple accounts, SubWallet should show a selection popup
        // The first account in the list is typically the "active" one selected by user
        console.log("Multiple accounts available:", accounts.map(a => a.address))
        console.log("Using first (active) account:", selectedAccount.address)
      }

      const ss58Address = selectedAccount.address

      // Get raw hex ActorId
      let rawAddress: string = ss58Address
      try {
        const { decodeAddress } = await import("@polkadot/util-crypto")
        const { u8aToHex } = await import("@polkadot/util")
        const publicKey = decodeAddress(ss58Address)
        rawAddress = u8aToHex(publicKey)
      } catch {
        // Keep ss58 as fallback
      }

      // Save to backend database
      const result = await dispatch(connectWalletAsync({
        address: ss58Address,
        network: "vara-testnet"
      })).unwrap()

      return {
        ...result,
        addressRaw: rawAddress,
      }
    } catch (error) {
      console.error("SubWallet connection error:", error)
      return rejectWithValue((error as Error).message || "Failed to connect SubWallet")
    }
  }
)

/**
 * Disconnect wallet - updates backend database
 */
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

/**
 * Fetch on-chain wallet state (balances)
 */
export const fetchWalletState = createAsyncThunk(
  "wallet/fetchWalletState",
  async (addressRaw: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/wallet/state?addressRaw=${encodeURIComponent(addressRaw)}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch wallet state")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

/**
 * Fetch on-chain LINE balance 
 */
export const fetchOnchainLineBalance = createAsyncThunk(
  "wallet/fetchOnchainLineBalance",
  async (address: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/wallet/onchain-balance?address=${encodeURIComponent(address)}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch on-chain balance")
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
    setWalletInstalled: (state, action: PayloadAction<boolean>) => {
      state.isWalletInstalled = action.payload
    },
    clearWallet: (state) => {
      state.isConnected = false
      state.isConnecting = false
      state.address = null
      state.addressRaw = null
      state.shortAddress = null
      state.network = "unknown"
      state.varaBalance = 0
      state.lineBalance = 0
      state.lineRaw = "0"
      state.nftCount = 0
      state.transactionHistory = []
      state.transactions = []
      state.error = null
    },
    disconnectWallet: (state) => {
      state.isConnected = false
      state.address = null
      state.addressRaw = null
      state.shortAddress = null
      state.network = "unknown"
      state.varaBalance = 0
      state.lineBalance = 0
      state.lineRaw = "0"
      state.nftCount = 0
      state.transactionHistory = []
      state.transactions = []
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch wallet from backend
      .addCase(fetchWallet.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.isLoading = false
        state.hasFetched = true  // Mark as fetched to prevent infinite loops
        if (action.payload) {
          state.isConnected = action.payload.isConnected || false
          state.address = action.payload.address || null
          state.shortAddress = action.payload.shortAddress || null
          state.network = (action.payload.network as NetworkType) || "unknown"
          state.varaBalance = action.payload.varaBalance || 0
          state.lineBalance = action.payload.lineBalance || 0
          state.nftCount = action.payload.nftCount || 0
          state.transactions = action.payload.transactions || []
          state.transactionHistory = action.payload.transactions || []
        }
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoading = false
        state.hasFetched = true  // Mark as fetched even on error to prevent infinite loops
        state.error = action.payload as string
      })

      // Connect SubWallet
      .addCase(connectSubwallet.pending, (state) => {
        state.isConnecting = true
        state.loadingWallet = true
        state.error = null
      })
      .addCase(connectSubwallet.fulfilled, (state, action) => {
        state.isConnecting = false
        state.loadingWallet = false
        state.isConnected = true
        if (action.payload.wallet) {
          state.address = action.payload.wallet.address
          state.shortAddress = action.payload.wallet.shortAddress
          state.network = action.payload.wallet.network as NetworkType
          state.varaBalance = action.payload.wallet.varaBalance || 0
          state.lineBalance = action.payload.wallet.lineBalance || 0
        }
        if (action.payload.addressRaw) {
          state.addressRaw = action.payload.addressRaw
        }
      })
      .addCase(connectSubwallet.rejected, (state, action) => {
        state.isConnecting = false
        state.loadingWallet = false
        state.error = action.payload as string
      })

      // Connect wallet (legacy)
      .addCase(connectWalletAsync.pending, (state) => {
        state.isConnecting = true
        state.error = null
      })
      .addCase(connectWalletAsync.fulfilled, (state, action) => {
        state.isConnecting = false
        state.isConnected = true
        if (action.payload.wallet) {
          state.address = action.payload.wallet.address
          state.shortAddress = action.payload.wallet.shortAddress
          state.network = action.payload.wallet.network as NetworkType
          state.varaBalance = action.payload.wallet.varaBalance || 0
          state.lineBalance = action.payload.wallet.lineBalance || 0
        }
      })
      .addCase(connectWalletAsync.rejected, (state, action) => {
        state.isConnecting = false
        state.error = action.payload as string
      })

      // Disconnect wallet
      .addCase(disconnectWalletAsync.pending, (state) => {
        // Set loading to prevent navbar from re-fetching
        state.loadingWallet = true
      })
      .addCase(disconnectWalletAsync.fulfilled, (state) => {
        state.isConnected = false
        state.loadingWallet = false
        state.address = null
        state.addressRaw = null
        state.shortAddress = null
        state.network = "unknown"
        state.varaBalance = 0
        state.lineBalance = 0
        state.lineRaw = "0"
        state.nftCount = 0
        state.transactions = []
        state.transactionHistory = []
      })
      .addCase(disconnectWalletAsync.rejected, (state) => {
        state.loadingWallet = false
      })

      // Fetch on-chain wallet state
      .addCase(fetchWalletState.pending, (state) => {
        state.loadingWallet = true
      })
      .addCase(fetchWalletState.fulfilled, (state, action) => {
        state.loadingWallet = false
        state.varaBalance = action.payload.varaBalance || 0
        state.lineBalance = action.payload.lineBalance || 0
        state.lineRaw = action.payload.lineRaw || "0"
        if (action.payload.transactions) {
          state.transactionHistory = action.payload.transactions
        }
      })
      .addCase(fetchWalletState.rejected, (state) => {
        state.loadingWallet = false
      })

      // Fetch on-chain LINE balance
      .addCase(fetchOnchainLineBalance.fulfilled, (state, action) => {
        state.lineBalance = action.payload.human || 0
        state.lineRaw = action.payload.raw || "0"
      })
  },
})

export const {
  startConnecting,
  setError,
  setWalletInstalled,
  clearWallet,
  disconnectWallet
} = walletSlice.actions

export default walletSlice.reducer

// Selectors
export const selectWallet = (state: { wallet: WalletState }) => state.wallet
export const selectIsWalletConnected = (state: { wallet: WalletState }) => state.wallet.isConnected
export const selectIsWalletInstalled = (state: { wallet: WalletState }) => state.wallet.isWalletInstalled
export const selectWalletAddress = (state: { wallet: WalletState }) => state.wallet.address
export const selectWalletAddressRaw = (state: { wallet: WalletState }) => state.wallet.addressRaw
export const selectShortAddress = (state: { wallet: WalletState }) => state.wallet.shortAddress
export const selectNetwork = (state: { wallet: WalletState }) => state.wallet.network
export const selectVaraBalance = (state: { wallet: WalletState }) => state.wallet.varaBalance
export const selectLineBalance = (state: { wallet: WalletState }) => state.wallet.lineBalance
export const selectTransactionHistory = (state: { wallet: WalletState }) => state.wallet.transactionHistory
export const selectLoadingWallet = (state: { wallet: WalletState }) => state.wallet.loadingWallet
export const selectWalletBalances = (state: { wallet: WalletState }) => ({
  vara: state.wallet.varaBalance,
  line: state.wallet.lineBalance,
})
export const selectWalletTransactions = (state: { wallet: WalletState }) => state.wallet.transactions
export const selectWalletLoading = (state: { wallet: WalletState }) => state.wallet.isLoading
export const selectHasFetched = (state: { wallet: WalletState }) => state.wallet.hasFetched
