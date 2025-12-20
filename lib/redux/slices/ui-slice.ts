import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type Theme = "dark" | "neon"
export type ModalType = "wallet-connect" | "withdrawal" | "nft-detail" | "claim-reward" | "buy-nft" | null

interface Toast {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  message?: string
}

interface UIState {
  theme: Theme
  activeModal: ModalType
  modalData: Record<string, unknown> | null
  toasts: Toast[]
  isMobileMenuOpen: boolean
  isLoading: boolean
  mockNetworkDelay: boolean
  reducedMotion: boolean
}

const initialState: UIState = {
  theme: "neon",
  activeModal: null,
  modalData: null,
  toasts: [],
  isMobileMenuOpen: false,
  isLoading: false,
  mockNetworkDelay: false,
  reducedMotion: false,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
    },
    openModal: (state, action: PayloadAction<{ type: ModalType; data?: Record<string, unknown> }>) => {
      state.activeModal = action.payload.type
      state.modalData = action.payload.data || null
    },
    closeModal: (state) => {
      state.activeModal = null
      state.modalData = null
    },
    addToast: (state, action: PayloadAction<Omit<Toast, "id">>) => {
      state.toasts.push({ ...action.payload, id: crypto.randomUUID() })
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileMenuOpen = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    toggleMockNetworkDelay: (state) => {
      state.mockNetworkDelay = !state.mockNetworkDelay
    },
    setReducedMotion: (state, action: PayloadAction<boolean>) => {
      state.reducedMotion = action.payload
    },
  },
})

export const {
  setTheme,
  openModal,
  closeModal,
  addToast,
  removeToast,
  toggleMobileMenu,
  setMobileMenuOpen,
  setLoading,
  toggleMockNetworkDelay,
  setReducedMotion,
} = uiSlice.actions

export default uiSlice.reducer

// Selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal
export const selectModalData = (state: { ui: UIState }) => state.ui.modalData
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts
export const selectIsMobileMenuOpen = (state: { ui: UIState }) => state.ui.isMobileMenuOpen
