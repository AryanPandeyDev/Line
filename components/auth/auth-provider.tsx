"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useAppDispatch } from "@/lib/redux/hooks"
import { fetchUserProfile } from "@/lib/redux/slices/auth-slice"

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const dispatch = useAppDispatch()
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        // Fetch user profile on mount for protected routes
        dispatch(fetchUserProfile()).finally(() => {
            setIsInitializing(false)
        })
    }, [dispatch])

    // Only show loading during initial fetch
    if (isInitializing) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#a855f7] animate-spin" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

