import { UserPlus, Wallet, Gamepad2, Trophy } from "lucide-react"

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Account",
    description: "Sign up with email or connect your social accounts. It takes less than 30 seconds.",
  },
  {
    icon: Wallet,
    step: "02",
    title: "Connect Wallet",
    description: "Link your Vara wallet to start earning and trading. We support all major wallets.",
  },
  {
    icon: Gamepad2,
    step: "03",
    title: "Play Games",
    description: "Dive into immersive games, complete missions, and earn LINE tokens as rewards.",
  },
  {
    icon: Trophy,
    step: "04",
    title: "Collect & Trade",
    description: "Use tokens to buy NFTs, trade with others, and build your ultimate collection.",
  },
]

export function LandingHowItWorks() {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            How It <span className="text-neon-cyan">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get started in minutes and begin your journey in the LINE universe
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-neon-cyan/50 to-transparent" />
              )}

              {/* Step number */}
              <div className="text-6xl font-black text-muted/20 mb-4">{step.step}</div>

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-neon-cyan/30">
                <step.icon className="w-8 h-8 text-neon-cyan" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
