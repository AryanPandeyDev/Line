"use client"
import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginContent() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard"

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-radial-glow opacity-40" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-neon-cyan/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-neon-magenta/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center neon-glow-cyan">
              <span className="text-2xl font-bold text-background">L</span>
            </div>
            <span className="text-3xl font-bold tracking-wider">LINE</span>
          </Link>
        </div>

        {/* Clerk SignIn Component */}
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          forceRedirectUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-card/80 backdrop-blur-xl border border-border shadow-2xl",
            },
          }}
        />
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  )
}
