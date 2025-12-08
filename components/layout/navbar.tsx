"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, Wallet, User, LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, useUser, SignOutButton } from "@clerk/nextjs"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { selectIsWalletConnected, selectShortAddress } from "@/lib/redux/slices/wallet-slice"
import { openModal } from "@/lib/redux/slices/ui-slice"
import { cn } from "@/lib/utils"

interface NavbarProps {
  isLanding?: boolean
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/games", label: "Games" },
  { href: "/earn", label: "Earn" },
  { href: "/nft-market", label: "NFT Market" },
  { href: "/wallet", label: "Wallet" },
]

export function Navbar({ isLanding = false }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const dispatch = useAppDispatch()
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const isWalletConnected = useAppSelector(selectIsWalletConnected)
  const shortAddress = useAppSelector(selectShortAddress)

  const handleWalletClick = () => {
    dispatch(openModal({ type: "wallet-connect" }))
  }

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isLanding ? "bg-transparent" : "bg-background/80 backdrop-blur-xl border-b border-border",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center neon-glow-cyan">
              <span className="text-xl font-bold text-background">L</span>
            </div>
            <span className="text-xl font-bold tracking-wider neon-text-cyan">LINE</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {!isLanding &&
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={isSignedIn ? link.href : "#"}
                  onClick={(e) => {
                    if (!isSignedIn) {
                      e.preventDefault()
                    }
                  }}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    !isSignedIn && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {link.label}
                </Link>
              ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <>
                {/* Wallet Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWalletClick}
                  className={cn("neon-border", isWalletConnected && "border-neon-green")}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isWalletConnected ? shortAddress : "Connect Wallet"}
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-magenta to-neon-purple flex items-center justify-center overflow-hidden">
                        {user?.imageUrl ? (
                          <img
                            src={user.imageUrl || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/referral" className="flex items-center gap-2">
                        Referrals
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <SignOutButton>
                      <DropdownMenuItem className="text-destructive cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </SignOutButton>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-semibold hover:opacity-90"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="flex flex-col gap-2">
              {!isLanding &&
                navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={isSignedIn ? link.href : "#"}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted",
                      !isSignedIn && "opacity-50",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}

              <div className="border-t border-border my-2" />

              {isSignedIn ? (
                <>
                  <Button variant="outline" onClick={handleWalletClick} className="mx-4 neon-border bg-transparent">
                    <Wallet className="w-4 h-4 mr-2" />
                    {isWalletConnected ? shortAddress : "Connect Wallet"}
                  </Button>
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start px-4">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <SignOutButton>
                    <Button variant="ghost" className="justify-start px-4 text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </SignOutButton>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-4">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full bg-transparent">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple text-background">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
