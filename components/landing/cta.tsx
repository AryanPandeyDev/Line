"use client"

import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { NeonButton } from "@/components/ui/neon-button"

export function LandingCTA() {
  const { isSignedIn } = useAuth()

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-neon" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon-purple/10 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-neon-magenta/30 mb-8">
          <Sparkles className="w-4 h-4 text-neon-magenta" />
          <span className="text-sm text-neon-magenta font-medium">Limited Time: Early Adopter Bonus</span>
        </div>

        {/* Heading */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6">
          Ready to <span className="neon-text-magenta">Enter</span> the{" "}
          <span className="bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">LINE</span>?
        </h2>

        {/* Description */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Join thousands of players already earning, collecting, and competing. Sign up now and receive{" "}
          <span className="text-neon-cyan font-semibold">500 LINE tokens</span> as a welcome bonus.
        </p>

        {/* CTAs - Only show Create Account for non-authenticated users */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isSignedIn && (
            <Link href="/signup">
              <NeonButton size="lg" className="w-full sm:w-auto text-lg">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </NeonButton>
            </Link>
          )}
          <Link href="/games">
            <NeonButton variant="outline" size="lg" className="w-full sm:w-auto text-lg">
              Learn More
            </NeonButton>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green" />
            <span>Secure & Safe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-cyan" />
            <span>Free to Play</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-magenta" />
            <span>Real Rewards</span>
          </div>
        </div>
      </div>
    </section>
  )
}
