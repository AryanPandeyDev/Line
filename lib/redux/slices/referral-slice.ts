import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// Types matching API response
export interface ReferralStats {
    totalReferrals: number
    activeReferrals: number
    totalEarned: number
    currentTier: number
    commissionRate: number
}

export interface ReferralTier {
    tier: number
    referrals: number
    reward: number
    bonus: string
    unlocked: boolean
}

export interface ReferredUser {
    id: string
    name: string
    joined: string
    earned: number
    status: "active" | "inactive"
}

interface ReferralState {
    referralCode: string
    referralLink: string
    stats: ReferralStats
    tiers: ReferralTier[]
    referrals: ReferredUser[]
    isLoading: boolean
    error: string | null
}

const initialState: ReferralState = {
    referralCode: "",
    referralLink: "",
    stats: {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarned: 0,
        currentTier: 1,
        commissionRate: 0.05,
    },
    tiers: [],
    referrals: [],
    isLoading: false,
    error: null,
}

// Async thunk to fetch referral data from API
export const fetchReferralData = createAsyncThunk(
    "referrals/fetchReferralData",
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/referrals")
            if (!response.ok) {
                throw new Error("Failed to fetch referral data")
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

// Async thunk to apply a referral code
export const applyReferralCode = createAsyncThunk(
    "referrals/applyReferralCode",
    async (referralCode: string, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/referrals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "apply", referralCode }),
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to apply referral code")
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

const referralSlice = createSlice({
    name: "referrals",
    initialState,
    reducers: {
        clearReferralError: (state) => {
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchReferralData.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchReferralData.fulfilled, (state, action) => {
                state.isLoading = false
                state.referralCode = action.payload.code || ""
                state.referralLink = action.payload.link || ""
                state.stats = action.payload.stats || initialState.stats
                state.tiers = action.payload.tiers || []
                state.referrals = action.payload.referredUsers || []
            })
            .addCase(fetchReferralData.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })
            .addCase(applyReferralCode.fulfilled, (state) => {
                // Refresh data after applying code
            })
            .addCase(applyReferralCode.rejected, (state, action) => {
                state.error = action.payload as string
            })
    },
})

export const { clearReferralError } = referralSlice.actions
export default referralSlice.reducer

// Selectors
export const selectReferralCode = (state: { referrals: ReferralState }) => state.referrals.referralCode
export const selectReferralLink = (state: { referrals: ReferralState }) => state.referrals.referralLink
export const selectReferralStats = (state: { referrals: ReferralState }) => state.referrals.stats
export const selectReferralTiers = (state: { referrals: ReferralState }) => state.referrals.tiers
export const selectReferredUsers = (state: { referrals: ReferralState }) => state.referrals.referrals
export const selectReferralLoading = (state: { referrals: ReferralState }) => state.referrals.isLoading
export const selectReferralError = (state: { referrals: ReferralState }) => state.referrals.error
