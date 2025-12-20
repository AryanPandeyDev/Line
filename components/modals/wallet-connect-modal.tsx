"use client"

import { useEffect } from "react"
import { X, Wallet, Check, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { selectActiveModal, closeModal } from "@/lib/redux/slices/ui-slice"
import {
  connectSubwallet,
  disconnectWalletAsync,
  selectIsWalletConnected,
  selectIsWalletInstalled,
  selectWallet,
  fetchWalletState,
} from "@/lib/redux/slices/wallet-slice"
import { cn } from "@/lib/utils"

export function WalletConnectModal() {
  const dispatch = useAppDispatch()
  const activeModal = useAppSelector(selectActiveModal)
  const wallet = useAppSelector(selectWallet)
  const isConnected = useAppSelector(selectIsWalletConnected)
  const isWalletInstalled = useAppSelector(selectIsWalletInstalled)

  // Refresh balances when modal opens and connected
  useEffect(() => {
    if (activeModal === "wallet-connect" && isConnected && wallet.addressRaw) {
      dispatch(fetchWalletState(wallet.addressRaw))
    }
  }, [activeModal, isConnected, wallet.addressRaw, dispatch])

  if (activeModal !== "wallet-connect") return null

  const handleConnectSubwallet = async () => {
    dispatch(connectSubwallet())
  }

  const handleDisconnect = () => {
    dispatch(disconnectWalletAsync())
  }

  const handleClose = () => {
    dispatch(closeModal())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl neon-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
              <Wallet className="w-5 h-5 text-background" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Connect Wallet</h2>
              <p className="text-xs text-muted-foreground">Vara Network Testnet</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isConnected ? (
            <div className="space-y-4">
              {/* Connected State */}
              <div className="p-4 rounded-xl bg-muted/50 border border-neon-green/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-neon-green" />
                  </div>
                  <span className="text-sm font-medium text-neon-green">Connected</span>
                </div>
                <p className="text-sm font-mono text-muted-foreground break-all">{wallet.address}</p>
                {wallet.addressRaw && (
                  <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                    Raw: {wallet.addressRaw}
                  </p>
                )}
              </div>

              {/* Real Balances */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">VARA Balance</p>
                  <p className="text-lg font-bold">{wallet.varaBalance.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">LINE Balance</p>
                  <p className="text-lg font-bold text-primary">{wallet.lineBalance.toLocaleString()}</p>
                </div>
              </div>

              {/* Loading indicator */}
              {wallet.loadingWallet && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Refreshing balances...</span>
                </div>
              )}

              {/* Network indicator */}
              {wallet.network === "vara-testnet" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Connected to Testnet</span>
                </div>
              )}

              <Button variant="outline" className="w-full bg-transparent" onClick={handleDisconnect}>
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Wallet not installed */}
              {!isWalletInstalled && wallet.error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">SubWallet Not Detected</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Please install the SubWallet browser extension to connect.
                  </p>
                  <a
                    href="https://www.subwallet.app/download.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary text-sm hover:underline"
                  >
                    Download SubWallet <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Error message */}
              {wallet.error && isWalletInstalled && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive mb-1">Connection Failed</p>
                      <p className="text-sm text-muted-foreground">{wallet.error}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Connect your SubWallet to access LINE on Vara Network
              </p>

              {/* SubWallet Connect Button */}
              <button
                onClick={handleConnectSubwallet}
                disabled={wallet.isConnecting}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                  "hover:bg-muted/50 hover:border-primary/50",
                  wallet.isConnecting ? "border-primary bg-muted/50" : "border-border"
                )}
              >
                <span className="text-2xl">🟢</span>
                <div className="flex-1 text-left">
                  <p className="font-medium">SubWallet</p>
                  <span className="text-xs text-primary">Recommended for Vara</span>
                </div>
                {wallet.isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <div className="w-5 h-5" />
                )}
              </button>

              {/* Other wallet options (disabled) */}
              <div className="opacity-50 space-y-2">
                <p className="text-xs text-muted-foreground">More wallets coming soon:</p>
                {[
                  { id: "polkadot", name: "Polkadot.js", icon: "🔴" },
                  { id: "talisman", name: "Talisman", icon: "🟣" },
                ].map((option) => (
                  <button
                    key={option.id}
                    disabled
                    className="w-full flex items-center gap-4 p-3 rounded-xl border border-border opacity-50 cursor-not-allowed"
                  >
                    <span className="text-xl">{option.icon}</span>
                    <p className="font-medium text-sm">{option.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-muted-foreground">
            By connecting, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}
