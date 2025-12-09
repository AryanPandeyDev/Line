"use client"

import { useEffect, useState } from "react"
import { User, Mail, Shield, Bell, Palette, LogOut, Camera, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import {
  fetchUserProfile,
  updateUserProfile,
  logout,
  selectUser,
  selectAuthLoading,
} from "@/lib/redux/slices/auth-slice"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { UserProfile } from "@clerk/nextjs"
import { dark } from "@clerk/themes"

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { toast } = useToast()

  const user = useAppSelector(selectUser)
  const isLoading = useAppSelector(selectAuthLoading)

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "preferences">("profile")

  // Form state
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Load user profile on mount
  useEffect(() => {
    dispatch(fetchUserProfile())
  }, [dispatch])

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setUsername(user.username || "")
      setDisplayName(user.displayName || "")
    }
  }, [user])

  const handleLogout = () => {
    dispatch(logout())
    router.push("/")
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const updates: { username?: string; displayName?: string } = {}

      if (username !== user.username) {
        updates.username = username
      }
      if (displayName !== user.displayName) {
        updates.displayName = displayName
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "No changes",
          description: "No changes to save",
        })
        setIsSaving(false)
        return
      }

      const result = await dispatch(updateUserProfile(updates)).unwrap()

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile"
      toast({
        title: "Update Failed",
        description: message.includes("USERNAME_TAKEN")
          ? "That username is already taken"
          : message,
        variant: "destructive",
      })
    }
    setIsSaving(false)
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Convert to base64 data URL for now
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      try {
        await dispatch(updateUserProfile({ avatarUrl: dataUrl })).unwrap()
        toast({
          title: "Avatar Updated",
          description: "Your profile picture has been changed",
        })
      } catch {
        toast({
          title: "Upload Failed",
          description: "Could not update avatar",
          variant: "destructive",
        })
      }
    }
    reader.readAsDataURL(file)
  }

  if (isLoading && !user) {
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
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <Card className="mb-8 bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary p-1">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/80 transition-colors cursor-pointer">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold mb-1">
                {user?.displayName || user?.username || "User"}
              </h2>
              <p className="text-muted-foreground mb-3">{user?.email || ""}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Badge className="bg-primary/20 text-primary border-primary/50">
                  Level {user?.level || 1}
                </Badge>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{user?.tokens?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">LINE Tokens</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/10">
                <p className="text-2xl font-bold text-secondary">{user?.xp || 0}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
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
            className={`px-6 py-2 rounded-full font-medium transition-all capitalize ${activeTab === tab
              ? "bg-primary text-primary-foreground shadow-neon-primary"
              : "bg-card/50 text-muted-foreground hover:bg-card"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
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
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/50 mt-1"
                  placeholder="your_username"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  3-20 characters, letters, numbers, underscores only
                </p>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  className="bg-background/50 mt-1"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email is managed via Clerk
                </p>
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-background/50 mt-1"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="bg-background/50 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Bio is stored locally for now
                </p>
              </div>
            </div>
            <Button
              className="bg-primary hover:bg-primary/80"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security Tab - Clerk Integration */}
      {activeTab === "security" && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Clerk UserProfile for security management */}
            <div className="rounded-lg overflow-hidden">
              <UserProfile
                routing="hash"
                appearance={{
                  baseTheme: dark,
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none",
                    navbar: "hidden",
                    pageScrollBox: "p-0",
                    profileSection: "border-border/50",
                  },
                }}
              />
            </div>

            {/* Logout button */}
            <div className="border-t border-border/50 pt-6">
              <Button variant="destructive" onClick={handleLogout} className="w-full md:w-auto">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences Tab */}
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
