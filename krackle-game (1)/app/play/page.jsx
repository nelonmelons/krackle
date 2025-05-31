"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "https://92ac-171-7-106-182.ngrok-free.app"

export default function PlayPage() {
  const [username, setUsername] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
  const [gameData, setGameData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Check if we have the required data in localStorage
    const storedUsername = localStorage.getItem("krackle_username")
    const storedLobby = localStorage.getItem("krackle_lobby")

    if (!storedUsername || !storedLobby) {
      toast({
        title: "Session expired",
        description: "Please join a game again",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setUsername(storedUsername)
    setLobbyCode(storedLobby)

    // Fetch game data
    fetchGameData(storedLobby)
  }, [router])

  const fetchGameData = async (lobby) => {
    try {
      const response = await fetch(`${API_BASE_URL}/play`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Lobby-Code": JSON.stringify(lobby),
        },
      })

      if (response.ok) {
        const data = await response.json()
        setGameData(data)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error loading game",
          description: errorData.message || "Could not load the game. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Could not connect to the game server.",
        variant: "destructive",
      })
      console.error("Error fetching game data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveGame = () => {
    localStorage.removeItem("krackle_username")
    localStorage.removeItem("krackle_lobby")
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-500 to-purple-800">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-purple-500 to-purple-800 p-4">
      <div className="text-center my-8">
        <h1 className="text-white text-4xl font-bold tracking-wide">
          KRACKLE.CO <span className="text-3xl">😂</span>
        </h1>
        <h2 className="text-white text-2xl mt-2">Game: {lobbyCode}</h2>
        <p className="text-white text-lg mt-1">Player: {username}</p>
      </div>

      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mb-8">
        <h3 className="text-2xl font-bold mb-4 text-center">Game Screen</h3>

        {gameData ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg">Game Status: {gameData.status || "In Progress"}</p>
              {gameData.current_round && <p className="text-md text-gray-600">Round: {gameData.current_round}</p>}
            </div>

            {gameData.players && (
              <div>
                <h4 className="font-semibold mb-2">Players:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {gameData.players.map((player, index) => (
                    <div key={index} className="p-2 rounded bg-purple-100 text-center">
                      {player} {player === username && "(You)"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gameData.message && (
              <div className="p-4 rounded-lg bg-blue-100 text-center">
                <p className="text-lg">{gameData.message}</p>
              </div>
            )}

            {/* Game content will be displayed here based on the game data */}
            <div className="text-center py-8">
              <p className="text-gray-600">Game interface will be implemented here</p>
              <p className="text-sm text-gray-500 mt-2">Game data: {JSON.stringify(gameData, null, 2)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No game data available</p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          className="bg-red-400 hover:bg-red-500 text-white rounded-full px-8 py-6 text-xl font-bold"
          onClick={handleLeaveGame}
        >
          LEAVE GAME
        </Button>
      </div>

      <div className="mt-auto py-6 text-white text-xs">
        MADE WITH LOVE BY HAYSON, NELSON, AND BOYA <span className="ml-1">❤️</span>
      </div>
    </div>
  )
}
