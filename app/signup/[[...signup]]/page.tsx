"use client"
import { SignUp } from "@clerk/nextjs"
import Link from "next/link"

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-radial-glow opacity-40" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-neon-purple/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-neon-cyan/20 rounded-full blur-3xl" />

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

        {/* Clerk SignUp Component */}
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          forceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-card/80 backdrop-blur-xl border border-border shadow-2xl",
            },
          }}
        />

        {/* Welcome bonus */}
        <div className="mt-6 p-4 rounded-xl border border-neon-green/30 bg-neon-green/5 text-center w-full">
          <p className="text-sm">
            <span className="text-neon-green font-medium">Welcome Bonus:</span> Get{" "}
            <span className="font-bold text-neon-cyan">500 LINE tokens</span> when you sign up!
          </p>
        </div>
      </div>
    </main>
  )
}
