import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getUserByClerkId, spendTokensFromUser } from "@/lib/db-helpers"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const sortBy = searchParams.get("sortBy")
    const rarity = searchParams.get("rarity")

    // Build where clause
    const where: Record<string, unknown> = {}
    if (rarity && rarity !== "all") {
      where.rarity = rarity.toUpperCase()
    }

    // Build orderBy clause
    let orderBy: Record<string, string>[] = [{ likes: "desc" }]
    if (sortBy === "price_high") {
      orderBy = [{ currentPrice: "desc" }]
    } else if (sortBy === "price_low") {
      orderBy = [{ currentPrice: "asc" }]
    } else if (sortBy === "newest") {
      orderBy = [{ createdAt: "desc" }]
    }

    const nfts = await db.nFT.findMany({
      where,
      orderBy,
      include: {
        listings: {
          where: { status: "LISTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      take: 50,
    })

    // Format response to match frontend expectations
    const formattedNFTs = nfts.map((nft) => {
      const activeListing = nft.listings[0]
      return {
        id: nft.id,
        name: nft.name,
        creator: nft.creatorName,
        image: nft.image,
        currentBid: activeListing?.price || nft.currentPrice || 0,
        timeLeft: activeListing?.expiresAt
          ? formatTimeLeft(activeListing.expiresAt)
          : "No active listing",
        likes: nft.likes,
        rarity: nft.rarity.charAt(0) + nft.rarity.slice(1).toLowerCase(),
        description: nft.description,
      }
    })

    return NextResponse.json(formattedNFTs)
  } catch (error) {
    console.error("Error fetching NFTs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByClerkId(clerkId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { nftId, bidAmount, action } = await request.json()

    if (action === "bid") {
      const nft = await db.nFT.findUnique({
        where: { id: nftId },
        include: {
          listings: {
            where: { status: "LISTED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      if (!nft) {
        return NextResponse.json({ error: "NFT not found" }, { status: 404 })
      }

      const activeListing = nft.listings[0]
      if (!activeListing) {
        return NextResponse.json({ error: "No active listing" }, { status: 400 })
      }

      const currentHighestBid = await db.nFTBid.findFirst({
        where: { listingId: activeListing.id },
        orderBy: { amount: "desc" },
      })

      const minBid = currentHighestBid?.amount || activeListing.price
      if (bidAmount <= minBid) {
        return NextResponse.json(
          { error: `Bid must be higher than ${minBid}` },
          { status: 400 }
        )
      }

      // Create bid record
      await db.nFTBid.create({
        data: {
          listingId: activeListing.id,
          nftId: nft.id,
          bidderId: user.id,
          amount: bidAmount,
          tokenType: "LINE",
          isWinning: true,
        },
      })

      // Mark previous winning bid as not winning
      if (currentHighestBid) {
        await db.nFTBid.update({
          where: { id: currentHighestBid.id },
          data: { isWinning: false },
        })
      }

      // Update NFT current price
      await db.nFT.update({
        where: { id: nftId },
        data: { currentPrice: bidAmount },
      })

      return NextResponse.json({
        success: true,
        message: `Bid of ${bidAmount} LINE placed successfully!`,
        nftId,
        newBid: bidAmount,
      })
    }

    if (action === "like") {
      await db.nFT.update({
        where: { id: nftId },
        data: { likes: { increment: 1 } },
      })

      return NextResponse.json({ success: true, message: "NFT liked!" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing NFT action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function formatTimeLeft(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()

  if (diff <= 0) return "Expired"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}hrs ${minutes}min`
  if (hours > 0) return `${hours}hrs ${minutes}min`
  return `${minutes}min`
}
