import { Gamepad2, Coins, ImageIcon, Wallet, Users, Shield } from "lucide-react"
import { NeonCard } from "@/components/ui/neon-card"

const features = [
  {
    icon: Gamepad2,
    title: "Play & Earn",
    description: "Immersive Web3 games designed for fun and rewards. Complete missions, level up, earn LINE tokens.",
    color: "cyan",
  },
  {
    icon: Coins,
    title: "LINE Tokens",
    description: "Earn tokens through gameplay, daily tasks, and referrals. Spend them on NFTs and exclusive items.",
    color: "magenta",
  },
  {
    icon: ImageIcon,
    title: "NFT Collection",
    description: "Collect, trade, and showcase unique digital art. Each piece unlocks special in-game benefits.",
    color: "purple",
  },
  {
    icon: Wallet,
    title: "Vara Network",
    description: "Built on Vara for lightning-fast transactions, low fees, and true digital ownership.",
    color: "cyan",
  },
  {
    icon: Users,
    title: "Community",
    description: "Join a thriving community of gamers and collectors. Compete, collaborate, and grow together.",
    color: "magenta",
  },
  {
    icon: Shield,
    title: "Secure & Safe",
    description: "Your assets are protected with industry-leading security. Full control, zero compromises.",
    color: "purple",
  },
]

export function LandingFeatures() {
  return (
    <section className="py-24 relative">
      {/* Background effect */}
      <div className="absolute inset-0 gradient-radial-glow opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Why Choose <span className="neon-text-cyan">LINE</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need for the ultimate Web3 gaming experience
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <NeonCard key={index} glowColor={feature.color as "cyan" | "magenta" | "purple"} className="p-6 group">
              <div
                className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110 ${
                  feature.color === "cyan"
                    ? "bg-neon-cyan/10 text-neon-cyan"
                    : feature.color === "magenta"
                      ? "bg-neon-magenta/10 text-neon-magenta"
                      : "bg-neon-purple/10 text-neon-purple"
                }`}
              >
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </NeonCard>
          ))}
        </div>
      </div>
    </section>
  )
}
