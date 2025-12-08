"use client"

import { useState } from "react"
import { Wallet, ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const tokens = [
  { name: "LINE Token", symbol: "LGC", balance: 15420, usdValue: 3084.0, change: 5.2 },
  { name: "Ethereum", symbol: "ETH", balance: 2.45, usdValue: 5267.5, change: -1.8 },
  { name: "Bonus Points", symbol: "BP", balance: 8750, usdValue: 87.5, change: 12.5 },
]

const transactions = [
  { type: "receive", amount: 500, token: "LGC", from: "Daily Reward", time: "2 hours ago", status: "completed" },
  { type: "send", amount: 0.1, token: "ETH", to: "NFT Purchase", time: "5 hours ago", status: "completed" },
  { type: "receive", amount: 1200, token: "LGC", from: "Game Winnings", time: "1 day ago", status: "completed" },
  { type: "send", amount: 2000, token: "BP", to: "NFT Bid", time: "2 days ago", status: "pending" },
  { type: "receive", amount: 300, token: "LGC", from: "Referral Bonus", time: "3 days ago", status: "completed" },
]

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<"tokens" | "history">("tokens")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const walletAddress = "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12"

  const totalBalance = tokens.reduce((acc, token) => acc + token.usdValue, 0)

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
    alert("Wallet address copied!")
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
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                ${totalBalance.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +3.2%
                </Badge>
                <span className="text-sm text-muted-foreground">vs last week</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="text-sm font-mono truncate max-w-[180px]">{walletAddress}</span>
                <button onClick={copyAddress} className="p-1 hover:text-primary transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-1 hover:text-primary transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-primary hover:bg-primary/80">
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-secondary text-secondary hover:bg-secondary/10 bg-transparent"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["tokens", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full font-medium transition-all capitalize ${
              activeTab === tab
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
                    <p className="font-bold text-lg">
                      {token.balance.toLocaleString()} {token.symbol}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm text-muted-foreground">${token.usdValue.toLocaleString()}</span>
                      <span
                        className={`text-sm flex items-center ${token.change >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {token.change >= 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {Math.abs(token.change)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <Card key={index} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === "receive" ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"
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
                      <p className="text-sm text-muted-foreground">{tx.time}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-bold ${tx.type === "receive" ? "text-green-400" : "text-foreground"}`}>
                      {tx.type === "receive" ? "+" : "-"}
                      {tx.amount} {tx.token}
                    </p>
                    <Badge
                      className={
                        tx.status === "completed"
                          ? "bg-green-500/20 text-green-400 border-green-500/50"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                      }
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
