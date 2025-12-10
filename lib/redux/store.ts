import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/auth-slice"
import uiReducer from "./slices/ui-slice"
import tokensReducer from "./slices/tokens-slice"
import achievementsReducer from "./slices/achievements-slice"
import nftsReducer from "./slices/nfts-slice"
import walletReducer from "./slices/wallet-slice"
import tasksReducer from "./slices/tasks-slice"
import referralReducer from "./slices/referral-slice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    tokens: tokensReducer,
    achievements: achievementsReducer,
    nfts: nftsReducer,
    wallet: walletReducer,
    tasks: tasksReducer,
    referrals: referralReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
