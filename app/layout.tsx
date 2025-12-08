import type React from "react"
import type { Metadata, Viewport } from "next"
import { Orbitron, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { ReduxProvider } from "@/lib/redux/provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "LINE | Web3 Game Center",
  description:
    "The ultimate neon cyberpunk gaming platform. Play games, earn LINE tokens, collect NFTs, and connect with the Vara Network.",
  generator: "v0.app",
  keywords: ["Web3", "Gaming", "NFT", "Vara Network", "LINE tokens", "Play to Earn"],
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a12",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#00f0ff",
          colorBackground: "#0a0a12",
          colorInputBackground: "#1a1a2e",
          colorInputText: "#ffffff",
          borderRadius: "0.75rem",
        },
        elements: {
          formButtonPrimary: "bg-gradient-to-r from-[#00f0ff] to-[#a855f7] hover:opacity-90 text-black font-semibold",
          card: "bg-[#0a0a12] border border-[#2a2a4a]",
          headerTitle: "text-white",
          headerSubtitle: "text-gray-400",
          socialButtonsBlockButton: "border-[#2a2a4a] hover:bg-[#1a1a2e]",
          formFieldInput: "bg-[#1a1a2e] border-[#2a2a4a] text-white",
          footerActionLink: "text-[#00f0ff] hover:text-[#00f0ff]/80",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${orbitron.variable} ${inter.variable} font-sans antialiased min-h-screen`}>
          <ReduxProvider>
            {children}
            <Toaster />
          </ReduxProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
