"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { setUser, setLoading, selectAuthLoading } from "@/lib/redux/slices/auth-slice"

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/sign-in", "/sign-up"]

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const isLoadingRedux = useAppSelector(selectAuthLoading)

  const { isLoaded, isSignedIn } = useClerkAuth()
  const { user } = useUser()

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && user) {
        // Sync Clerk user with Redux
        dispatch(
          setUser({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            displayName: user.fullName || user.username || "Player",
            avatarUrl: user.imageUrl,
            createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
          }),
        )
      } else {
        dispatch(setUser(null))
      }
      dispatch(setLoading(false))
    }
  }, [isLoaded, isSignedIn, user, dispatch])

  useEffect(() => {
    // Redirect unauthenticated users from protected routes
    if (isLoaded && !isSignedIn && !PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      router.push("/login")
    }
  }, [isSignedIn, isLoaded, pathname, router])

  if (!isLoaded || isLoadingRedux) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-background">L</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function useAuth() {
  const { signOut } = useClerkAuth()
  const router = useRouter()

  const logout = async () => {
    await signOut()
    router.push("/")
  }

  return { logout }
}
