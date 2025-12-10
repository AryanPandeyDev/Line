import { NextResponse } from "next/server"
import { gameService } from "@/src/lib/services/gameService"

/**
 * GET /api/games
 * 
 * Returns all games in the catalog, formatted for frontend.
 */
export async function GET() {
  try {
    const games = await gameService.getAllGames()
    return NextResponse.json(games)
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
