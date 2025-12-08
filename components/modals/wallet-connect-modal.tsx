"use client"

import { useState } from "react"
import { X, Wallet, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { selectActiveModal, closeModal } from "@/lib/redux/slices/ui-slice"
import {
  connectWallet,
  disconnectWallet,
  startConnecting,
  selectIsWalletConnected,
  selectWallet,
} from "@/lib/redux/slices/wallet-slice"
import { cn } from "@/lib/utils"

const walletOptions = [
  { id: "polkadot", name: "Polkadot.js", icon: "🔴", popular: true },
  { id: "subwallet", name: "SubWallet", icon: "🟢", popular: true },
  { id: "talisman", name: "Talisman", icon: "🟣", popular: false },
  { id: "nova", name: "Nova Wallet", icon: "🔵", popular: false },
]

export function WalletConnectModal() {
  const dispatch = useAppDispatch()
  const activeModal = useAppSelector(selectActiveModal)
  const wallet = useAppSelector(selectWallet)
  const isConnected = useAppSelector(selectIsWalletConnected)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  if (activeModal !== "wallet-connect") return null

  const handleConnect = async (walletId: string) => {
    setSelectedWallet(walletId)
    dispatch(startConnecting())

    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate mock address
    const mockAddress =
      "5" +
      Array.from(
        { length: 47 },
        () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)],
      ).join("")

    dispatch(connectWallet({ address: mockAddress }))
    setSelectedWallet(null)
  }

  const handleDisconnect = () => {
    dispatch(disconnectWallet())
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
              <p className="text-xs text-muted-foreground">Vara Network</p>
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
              <div className="p-4 rounded-xl bg-muted/50 border border-neon-green/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-neon-green" />
                  </div>
                  <span className="text-sm font-medium text-neon-green">Connected</span>
                </div>
                <p className="text-sm font-mono text-muted-foreground break-all">{wallet.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">VARA Balance</p>
                  <p className="text-lg font-bold">{wallet.varaBalance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">LINE Balance</p>
                  <p className="text-lg font-bold text-primary">{wallet.lineBalance}</p>
                </div>
              </div>

              {wallet.network !== "vara-mainnet" && wallet.network !== "vara-testnet" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Please switch to Vara Network</span>
                </div>
              )}

              <Button variant="outline" className="w-full bg-transparent" onClick={handleDisconnect}>
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Select a wallet to connect to LINE on Vara Network</p>

              {walletOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleConnect(option.id)}
                  disabled={wallet.isConnecting}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                    "hover:bg-muted/50 hover:border-primary/50",
                    selectedWallet === option.id && wallet.isConnecting
                      ? "border-primary bg-muted/50"
                      : "border-border",
                  )}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{option.name}</p>
                    {option.popular && <span className="text-xs text-primary">Popular</span>}
                  </div>
                  {selectedWallet === option.id && wallet.isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <div className="w-5 h-5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-muted-foreground">By connecting, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  )
}
