"use client"

import { useState } from "react"
import { User, Mail, Shield, Bell, Palette, LogOut, Camera, Trophy, Gamepad2, Coins, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAppDispatch } from "@/lib/redux/hooks"
import { logout } from "@/lib/redux/slices/auth-slice"
import { useRouter } from "next/navigation"

const achievements = [
  { name: "First Win", icon: Trophy, unlocked: true },
  { name: "100 Games", icon: Gamepad2, unlocked: true },
  { name: "Big Spender", icon: Coins, unlocked: false },
  { name: "Veteran", icon: Clock, unlocked: false },
]

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "preferences">("profile")

  const handleLogout = () => {
    dispatch(logout())
    router.push("/")
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <Card className="mb-8 bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary p-1">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                  <User className="w-12 h-12 text-primary" />
                </div>
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/80 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold mb-1">CyberPlayer_42</h2>
              <p className="text-muted-foreground mb-3">player@example.com</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Badge className="bg-primary/20 text-primary border-primary/50">Level 15</Badge>
                <Badge className="bg-secondary/20 text-secondary border-secondary/50">Pro Member</Badge>
                <Badge className="bg-accent/20 text-accent border-accent/50">Early Adopter</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {achievements.map((achievement) => (
                <div
                  key={achievement.name}
                  className={`p-3 rounded-lg ${achievement.unlocked ? "bg-primary/10" : "bg-card/50 opacity-50"}`}
                >
                  <achievement.icon
                    className={`w-6 h-6 mx-auto mb-1 ${achievement.unlocked ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <p className="text-xs">{achievement.name}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["profile", "security", "preferences"] as const).map((tab) => (
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

      {activeTab === "profile" && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue="CyberPlayer_42" className="bg-background/50 mt-1" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="player@example.com" className="bg-background/50 mt-1" />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" defaultValue="Cyber Player" className="bg-background/50 mt-1" />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" placeholder="Tell us about yourself..." className="bg-background/50 mt-1" />
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/80">Save Changes</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-4">Change Password</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" className="bg-background/50 mt-1" />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" className="bg-background/50 mt-1" />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" className="bg-background/50 mt-1" />
                </div>
                <Button className="bg-primary hover:bg-primary/80">Update Password</Button>
              </div>
            </div>

            <div className="border-t border-border/50 pt-6">
              <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
              <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
                <div>
                  <p className="font-medium">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
            </div>

            <div className="border-t border-border/50 pt-6">
              <Button variant="destructive" onClick={handleLogout} className="w-full md:w-auto">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "preferences" && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive game and reward notifications</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Get updates via email</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Sound Effects</p>
                  <p className="text-sm text-muted-foreground">Play sounds for game events</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
