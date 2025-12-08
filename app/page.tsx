import { LandingHero } from "@/components/landing/hero"
import { LandingFeatures } from "@/components/landing/features"
import { LandingNFTShowcase } from "@/components/landing/nft-showcase"
import { LandingHowItWorks } from "@/components/landing/how-it-works"
import { LandingCTA } from "@/components/landing/cta"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <Navbar isLanding />
      <LandingHero />
      <LandingFeatures />
      <LandingNFTShowcase />
      <LandingHowItWorks />
      <LandingCTA />
      <Footer />
    </main>
  )
}
