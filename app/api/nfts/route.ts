import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { nftService } from "@/src/lib/services/nftService"

/**
 * GET /api/nfts
 * 
 * Returns NFT marketplace listings with optional filters.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const sortBy = searchParams.get("sortBy")
    const rarity = searchParams.get("rarity")

    const nfts = await nftService.getNFTs({
      category: category || undefined,
      sortBy: sortBy || undefined,
      rarity: rarity || undefined,
    })

    return NextResponse.json(nfts)
  } catch (error) {
    console.error("Error fetching NFTs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/nfts
 * 
 * Actions: bid, like
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { nftId, bidAmount, action } = await request.json()

    if (!nftId) {
      return NextResponse.json({ error: "nftId is required" }, { status: 400 })
    }

    if (action === "bid") {
      if (!bidAmount || typeof bidAmount !== "number") {
        return NextResponse.json({ error: "bidAmount is required" }, { status: 400 })
      }

      const result = await nftService.placeBid(clerkId, nftId, bidAmount)

      if (!result.success) {
        if (result.message === "NFT not found") {
          return NextResponse.json({ error: result.message }, { status: 404 })
        }
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        nftId: result.nftId,
        newBid: result.newBid,
      })
    }

    if (action === "like") {
      const result = await nftService.likeNFT(nftId)
      return NextResponse.json({ success: result.success, message: result.message })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing NFT action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
