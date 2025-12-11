"use client"

import { useEffect, useMemo } from "react"
import { Users, Copy, Gift, Trophy, Share2, Twitter, Send, MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import {
  fetchReferralData,
  selectReferralCode,
  selectReferralLink,
  selectReferralStats,
  selectReferralTiers,
  selectReferredUsers,
  selectReferralLoading,
} from "@/lib/redux/slices/referral-slice"
import { useToast } from "@/hooks/use-toast"

export default function ReferralPage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  // Redux state
  const referralCode = useAppSelector(selectReferralCode)
  const referralLink = useAppSelector(selectReferralLink)
  const stats = useAppSelector(selectReferralStats)
  const tiers = useAppSelector(selectReferralTiers)
  const referrals = useAppSelector(selectReferredUsers)
  const isLoading = useAppSelector(selectReferralLoading)

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchReferralData())
  }, [dispatch])

  // Calculate tier progress
  const tierProgress = useMemo(() => {
    if (tiers.length === 0) {
      return { currentTierIndex: 0, nextTier: null, progress: 0, prevReferrals: 0 }
    }

    const currentTierIndex = tiers.findIndex((t) => stats.totalReferrals < t.referrals)
    const actualIndex = currentTierIndex === -1 ? tiers.length - 1 : currentTierIndex
    const nextTier = tiers[actualIndex]
    const prevReferrals = actualIndex > 0 ? tiers[actualIndex - 1].referrals : 0

    const progress = nextTier
      ? Math.min(100, ((stats.totalReferrals - prevReferrals) / (nextTier.referrals - prevReferrals)) * 100)
      : 100

    return { currentTierIndex: actualIndex, nextTier, progress, prevReferrals }
  }, [stats.totalReferrals, tiers])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    })
  }

  // Format relative time
  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "today"
    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  if (isLoading && !referralCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-muted-foreground">Invite friends and earn rewards together</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-3xl font-bold">{stats.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-3xl font-bold">{stats.totalEarned.toLocaleString()} LINE</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Tier</p>
                <p className="text-3xl font-bold">Tier {stats.currentTier}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="mb-8 bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex gap-2 mb-4">
                <Input
                  value={referralLink || "Loading..."}
                  readOnly
                  className="bg-background/50 font-mono text-sm"
                />
                <Button
                  onClick={() => copyToClipboard(referralLink)}
                  variant="outline"
                  className="border-primary"
                  disabled={!referralLink}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 mb-4">
                <Input
                  value={referralCode || "Loading..."}
                  readOnly
                  className="bg-background/50 font-mono text-center text-lg font-bold"
                />
                <Button
                  onClick={() => copyToClipboard(referralCode)}
                  variant="outline"
                  className="border-primary"
                  disabled={!referralCode}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-2">
              <Button
                className="flex-1 bg-[#1DA1F2] hover:bg-[#1DA1F2]/80"
                onClick={() => {
                  const text = `Join me on LINE Gaming! Use my referral code: ${referralCode}`
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`, "_blank")
                }}
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                className="flex-1 bg-[#0088cc] hover:bg-[#0088cc]/80"
                onClick={() => {
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`Join LINE Gaming with my referral code!`)}`, "_blank")
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </Button>
              <Button
                className="flex-1 bg-[#25D366] hover:bg-[#25D366]/80"
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Join LINE Gaming! ${referralLink}`)}`, "_blank")
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Progress */}
      <Card className="mb-8 bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Tier Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {tierProgress.nextTier
                  ? `Progress to Tier ${tierProgress.currentTierIndex + 1}`
                  : "Max Tier Reached"}
              </span>
              <span className="text-sm font-medium">
                {stats.totalReferrals} / {tierProgress.nextTier?.referrals || stats.totalReferrals} referrals
              </span>
            </div>
            <Progress value={tierProgress.progress} className="h-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {tiers.length > 0 ? (
              tiers.map((tier, index) => (
                <div
                  key={tier.tier}
                  className={`p-4 rounded-xl border transition-all ${tier.unlocked
                    ? "bg-primary/10 border-primary/50"
                    : index === tierProgress.currentTierIndex
                      ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-primary shadow-neon-primary"
                      : "bg-card/30 border-border/50 opacity-60"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className={`w-5 h-5 ${tier.unlocked || index === tierProgress.currentTierIndex ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-bold">Tier {tier.tier}</span>
                    {tier.unlocked && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Unlocked</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{tier.referrals} referrals</p>
                  <p className="font-bold text-primary">{tier.reward.toLocaleString()} LINE</p>
                  <p className="text-xs text-secondary mt-1">{tier.bonus}</p>
                </div>
              ))
            ) : (
              // Default tiers if none in database
              <>
                {[
                  { tier: 1, referrals: 5, reward: 10, bonus: "5% commission" },
                  { tier: 2, referrals: 15, reward: 25, bonus: "7% commission" },
                  { tier: 3, referrals: 50, reward: 50, bonus: "10% commission" },
                  { tier: 4, referrals: 100, reward: 100, bonus: "15% commission + NFT" },
                ].map((tier, index) => (
                  <div
                    key={tier.tier}
                    className={`p-4 rounded-xl border transition-all ${stats.totalReferrals >= tier.referrals
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card/30 border-border/50 opacity-60"
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className={`w-5 h-5 ${stats.totalReferrals >= tier.referrals ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-bold">Tier {tier.tier}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{tier.referrals} referrals</p>
                    <p className="font-bold text-primary">{tier.reward.toLocaleString()} LINE</p>
                    <p className="text-xs text-secondary mt-1">{tier.bonus}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referred Users */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Your Referrals ({referrals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="font-bold text-sm">{user.name?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div>
                      <p className="font-medium">{user.name || "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground">Joined {formatJoinDate(user.joined)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-primary">+{user.earned} LINE</p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${user.status === "active" ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"
                        }`}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm">Share your link to start earning!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
