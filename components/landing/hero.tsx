"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Sparkles } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { NeonButton } from "@/components/ui/neon-button"

export function LandingHero() {
  const { isSignedIn } = useAuth()

  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-12 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute inset-0 gradient-radial-glow opacity-60" />

      {/* Animated grid lines */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "100px 100px",
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-cyan/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="absolute top-1/2 right-1/3 w-64 h-64 bg-neon-magenta/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-neon-cyan/30 mb-6">
              <Sparkles className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm text-neon-cyan font-medium">Web3 Gaming Revolution</span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              <span className="block neon-text-cyan">ENTER THE</span>
              <span className="block bg-gradient-to-r from-neon-magenta via-neon-purple to-neon-cyan bg-clip-text text-transparent">
                LINE
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              The ultimate neon cyberpunk gaming platform. Play immersive games, earn LINE tokens, collect exclusive
              NFTs, and connect with the Vara Network.
            </p>

            {/* CTA - Auth-aware button */}
            <div className="flex justify-center lg:justify-start">
              <Link href={isSignedIn ? "/dashboard" : "/signup"}>
                <NeonButton size="lg" className="w-full sm:w-auto">
                  {isSignedIn ? "Explore LINE" : "Getting Started"}
                  <ArrowRight className="w-5 h-5" />
                </NeonButton>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-12 max-w-md mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-bold neon-text-cyan">50K+</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Players</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-bold text-neon-magenta">12K</p>
                <p className="text-xs sm:text-sm text-muted-foreground">NFTs Minted</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-bold text-neon-purple">$2.4M</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Rewards Earned</p>
              </div>
            </div>
          </div>

          {/* Right content - Hero visual */}
          <div className="relative order-1 lg:order-2">
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-magenta opacity-30 blur-3xl animate-neon-pulse" />

              {/* Main hero image */}
              <div className="relative rounded-2xl overflow-hidden border border-neon-cyan/30 neon-glow-cyan">
                <Image
                  src="/neon-samurai-warrior-with-glowing-katana-cyberpunk.jpg"
                  alt="LINE Gaming Platform"
                  width={600}
                  height={600}
                  className="w-full h-full object-cover"
                  priority
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              {/* Floating NFT cards */}
              <div className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 w-24 sm:w-32 rounded-xl overflow-hidden border border-neon-magenta/50 shadow-lg animate-float">
                <Image
                  src="/cyberpunk-wolf-with-neon-blue-eyes-and-chrome-armo.jpg"
                  alt="Cyber Wolf NFT"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>

              <div
                className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8 w-24 sm:w-32 rounded-xl overflow-hidden border border-neon-purple/50 shadow-lg animate-float"
                style={{ animationDelay: "1s" }}
              >
                <Image
                  src="/chrome-mechanical-dragon-with-glowing-purple-eyes-.jpg"
                  alt="Chrome Dragon NFT"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
