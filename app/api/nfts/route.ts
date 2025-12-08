import { NextResponse } from "next/server"

const mockNFTs = [
  {
    id: "nft_1",
    name: "Cyber Phantom",
    creator: "NeonArtist",
    image: "/cyberpunk-phantom-warrior-neon-purple.jpg",
    currentBid: 15.6,
    timeLeft: "2d 10hrs 45min",
    likes: 234,
    rarity: "Legendary",
    description: "A legendary phantom warrior from the neon-lit streets of Neo Tokyo.",
  },
  {
    id: "nft_2",
    name: "Digital Dragon",
    creator: "CryptoMaster",
    image: "/digital-dragon-creature-neon-scales.jpg",
    currentBid: 8.2,
    timeLeft: "1d 5hrs 20min",
    likes: 189,
    rarity: "Epic",
    description: "A majestic digital dragon with scales that shimmer with blockchain energy.",
  },
  {
    id: "nft_3",
    name: "Neon Samurai",
    creator: "ArtBlock79",
    image: "/neon-samurai-warrior-cyberpunk-helmet.jpg",
    currentBid: 66.4,
    timeLeft: "4d 12hrs 8min",
    likes: 567,
    rarity: "Mythic",
    description: "The rarest samurai in the collection, wielding a blade of pure light.",
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const sortBy = searchParams.get("sortBy")

  const filteredNFTs = [...mockNFTs]

  if (sortBy === "price_high") {
    filteredNFTs.sort((a, b) => b.currentBid - a.currentBid)
  } else if (sortBy === "price_low") {
    filteredNFTs.sort((a, b) => a.currentBid - b.currentBid)
  }

  return NextResponse.json(filteredNFTs)
}

export async function POST(request: Request) {
  const { nftId, bidAmount } = await request.json()

  const nft = mockNFTs.find((n) => n.id === nftId)
  if (!nft) {
    return NextResponse.json({ error: "NFT not found" }, { status: 404 })
  }

  if (bidAmount <= nft.currentBid) {
    return NextResponse.json({ error: "Bid must be higher than current bid" }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: `Bid of ${bidAmount} ETH placed successfully!`,
    nftId,
    newBid: bidAmount,
  })
}
