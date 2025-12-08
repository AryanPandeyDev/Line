import { NextResponse } from "next/server"

const mockGames = [
  {
    id: "game_1",
    name: "Neon Racers",
    description: "High-speed racing through neon-lit cyberpunk cities",
    image: "/cyberpunk-racing-game-neon.jpg",
    category: "Racing",
    players: 15420,
    rewards: { min: 50, max: 500 },
    status: "coming_soon",
    releaseDate: "2025-01-15",
  },
  {
    id: "game_2",
    name: "Battle Royale X",
    description: "Last player standing wins in this intense battle arena",
    image: "/battle-royale-cyberpunk-arena.jpg",
    category: "Action",
    players: 28900,
    rewards: { min: 100, max: 1000 },
    status: "coming_soon",
    releaseDate: "2025-02-01",
  },
  {
    id: "game_3",
    name: "Cosmic Explorers",
    description: "Explore the galaxy and discover rare NFT planets",
    image: "/space-exploration-game-neon.jpg",
    category: "Adventure",
    players: 8750,
    rewards: { min: 25, max: 250 },
    status: "coming_soon",
    releaseDate: "2025-02-15",
  },
]

export async function GET() {
  return NextResponse.json(mockGames)
}
