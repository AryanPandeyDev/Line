import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const games = await db.game.findMany({
      orderBy: [
        { status: "asc" }, // Active games first
        { playerCount: "desc" },
      ],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        coverImage: true,
        category: true,
        playerCount: true,
        rating: true,
        rewardMin: true,
        rewardMax: true,
        status: true,
        releaseDate: true,
      },
    })

    // Format response to match frontend expectations
    const formattedGames = games.map((game) => ({
      id: game.id,
      name: game.name,
      description: game.description,
      image: game.coverImage,
      category: game.category.charAt(0) + game.category.slice(1).toLowerCase(),
      players: game.playerCount,
      rating: game.rating,
      rewards: { min: game.rewardMin, max: game.rewardMax },
      status: game.status.toLowerCase().replace("_", "-"),
      releaseDate: game.releaseDate?.toISOString().split("T")[0] || null,
    }))

    return NextResponse.json(formattedGames)
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
