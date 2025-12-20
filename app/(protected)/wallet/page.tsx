"use client"

import { useState, useEffect } from "react"
import { Wallet, ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import {
  selectWallet,
  selectIsWalletConnected,
  selectTransactionHistory,
  fetchWalletState,
} from "@/lib/redux/slices/wallet-slice"
import { openModal } from "@/lib/redux/slices/ui-slice"

export default function WalletPage() {
  const dispatch = useAppDispatch()
  const wallet = useAppSelector(selectWallet)
  const isConnected = useAppSelector(selectIsWalletConnected)
  const transactionHistory = useAppSelector(selectTransactionHistory)

  const [activeTab, setActiveTab] = useState<"tokens" | "history">("tokens")

  // Fetch wallet state when connected - use either addressRaw or address
  useEffect(() => {
    if (isConnected) {
      const address = wallet.addressRaw || wallet.address
      if (address) {
        dispatch(fetchWalletState(address))
      }
    }
  }, [isConnected, wallet.addressRaw, wallet.address, dispatch])

  // Build tokens array with real on-chain balances
  const tokens = [
    {
      name: "LINE Token",
      symbol: "LINE",
      balance: wallet.lineBalance,
      balanceRaw: wallet.lineRaw,
    },
    {
      name: "VARA",
      symbol: "VARA",
      balance: wallet.varaBalance,
    },
  ]

  const displayAddress = wallet.address || wallet.addressRaw

  const copyAddress = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress)
      alert("Wallet address copied!")
    }
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Wallet</h1>
          <p className="text-muted-foreground">Manage your tokens and transaction history</p>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Wallet Connected</h3>
            <p className="text-muted-foreground mb-6">
              Connect your SubWallet to view balances and transactions
            </p>
            <Button
              onClick={() => dispatch(openModal({ type: "wallet-connect" }))}
              className="bg-primary hover:bg-primary/80"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground">Manage your tokens and transaction history</p>
      </div>

      {/* Balance Overview */}
      <Card className="mb-8 bg-gradient-to-br from-primary/20 via-card to-secondary/20 border-primary/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">VARA Balance</p>
              {wallet.loadingWallet ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-2xl text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    {wallet.varaBalance.toFixed(4)} VARA
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-lg font-semibold text-primary">
                      {wallet.lineBalance.toLocaleString()} LINE
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="text-sm font-mono truncate max-w-[200px]">
                  {wallet.shortAddress || displayAddress}
                </span>
                <button
                  onClick={copyAddress}
                  className="p-1 hover:text-primary transition-colors"
                  title="Copy address"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`https://idea.gear-tech.io/explorer/${wallet.addressRaw || displayAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:text-primary transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => dispatch(openModal({ type: "withdrawal" }))}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading indicator */}
      {wallet.loadingWallet && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
          Refreshing balances...
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["tokens", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full font-medium transition-all capitalize ${activeTab === tab
              ? "bg-primary text-primary-foreground shadow-neon-primary"
              : "bg-card/50 text-muted-foreground hover:bg-card"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "tokens" ? (
        <div className="grid gap-4">
          {tokens.map((token) => (
            <Card key={token.symbol} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="font-bold text-primary">{token.symbol[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{token.name}</h3>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    {wallet.loadingWallet ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <p className="font-bold text-lg">
                        {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {transactionHistory.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground">
                  Your transaction history will appear here once you start using LINE tokens.
                </p>
              </CardContent>
            </Card>
          ) : (
            transactionHistory.map((tx) => (
              <Card key={tx.id} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "receive" ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"
                          }`}
                      >
                        {tx.type === "receive" ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {tx.type === "receive" ? `From: ${tx.from}` : `To: ${tx.to}`}
                        </p>
                        <p className="text-sm text-muted-foreground">{tx.timestamp}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold ${tx.type === "receive" ? "text-green-400" : "text-foreground"}`}>
                        {tx.type === "receive" ? "+" : "-"}
                        {tx.amount} {tx.token}
                      </p>
                      <Badge
                        className={
                          tx.status === "confirmed"
                            ? "bg-green-500/20 text-green-400 border-green-500/50"
                            : tx.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              : "bg-red-500/20 text-red-400 border-red-500/50"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
