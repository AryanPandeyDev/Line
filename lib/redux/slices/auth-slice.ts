import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
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
  },
})

export const { setUser, setLoading, setError, logout } = authSlice.actions
export default authSlice.reducer

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading
