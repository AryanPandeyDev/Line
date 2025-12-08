"use client"
import { Users, Copy, Gift, Trophy, Share2, Twitter, Send, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

const referralTiers = [
  { tier: 1, referrals: 5, reward: 500, bonus: "5% commission" },
  { tier: 2, referrals: 15, reward: 2000, bonus: "7% commission" },
  { tier: 3, referrals: 50, reward: 10000, bonus: "10% commission" },
  { tier: 4, referrals: 100, reward: 50000, bonus: "15% commission + NFT" },
]

const referredUsers = [
  { name: "Alex M.", joined: "2 days ago", earned: 150, status: "active" },
  { name: "Sarah K.", joined: "1 week ago", earned: 420, status: "active" },
  { name: "Mike R.", joined: "2 weeks ago", earned: 280, status: "active" },
  { name: "Emma L.", joined: "3 weeks ago", earned: 95, status: "inactive" },
]

export default function ReferralPage() {
  const referralCode = "LGC-PLAYER-7X9K2M"
  const referralLink = `https://linegamecenter.com/ref/${referralCode}`
  const currentReferrals = 12
  const totalEarned = 2845

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const currentTier = referralTiers.findIndex((t) => currentReferrals < t.referrals)
  const nextTier = referralTiers[currentTier] || referralTiers[referralTiers.length - 1]
  const prevTierReferrals = currentTier > 0 ? referralTiers[currentTier - 1].referrals : 0
  const progress = ((currentReferrals - prevTierReferrals) / (nextTier.referrals - prevTierReferrals)) * 100

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
                <p className="text-3xl font-bold">{currentReferrals}</p>
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
                <p className="text-3xl font-bold">{totalEarned.toLocaleString()} LGC</p>
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
                <p className="text-3xl font-bold">Tier {currentTier || 1}</p>
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
                <Input value={referralLink} readOnly className="bg-background/50 font-mono text-sm" />
                <Button onClick={() => copyToClipboard(referralLink)} variant="outline" className="border-primary">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 mb-4">
                <Input
                  value={referralCode}
                  readOnly
                  className="bg-background/50 font-mono text-center text-lg font-bold"
                />
                <Button onClick={() => copyToClipboard(referralCode)} variant="outline" className="border-primary">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-2">
              <Button className="flex-1 bg-[#1DA1F2] hover:bg-[#1DA1F2]/80">
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button className="flex-1 bg-[#0088cc] hover:bg-[#0088cc]/80">
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </Button>
              <Button className="flex-1 bg-[#25D366] hover:bg-[#25D366]/80">
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
              <span className="text-sm text-muted-foreground">Progress to Tier {(currentTier || 0) + 1}</span>
              <span className="text-sm font-medium">
                {currentReferrals} / {nextTier.referrals} referrals
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {referralTiers.map((tier, index) => (
              <div
                key={tier.tier}
                className={`p-4 rounded-xl border transition-all ${
                  index < currentTier
                    ? "bg-primary/10 border-primary/50"
                    : index === currentTier
                      ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-primary shadow-neon-primary"
                      : "bg-card/30 border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className={`w-5 h-5 ${index <= currentTier ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-bold">Tier {tier.tier}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{tier.referrals} referrals</p>
                <p className="font-bold text-primary">{tier.reward.toLocaleString()} LGC</p>
                <p className="text-xs text-secondary mt-1">{tier.bonus}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referred Users */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Your Referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {referredUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <span className="font-bold text-sm">{user.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">Joined {user.joined}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-primary">+{user.earned} LGC</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      user.status === "active" ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
