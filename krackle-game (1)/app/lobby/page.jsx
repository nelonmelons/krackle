"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "https://92ac-171-7-106-182.ngrok-free.app"

export default function LobbyPage() {
  const [players, setPlayers] = useState([])
  const [username, setUsername] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
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
        description: "Please join a lobby again",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setUsername(storedUsername)
    setLobbyCode(storedLobby)

    // Fetch the player list
    fetchPlayers(storedLobby)

    // Set up polling to refresh the player list every 5 seconds
    const interval = setInterval(() => {
      fetchPlayers(storedLobby)
    }, 5000)

    return () => clearInterval(interval)
  }, [router])

  const fetchPlayers = async (lobby) => {
    try {
      const response = await fetch(`${API_BASE_URL}/play/?lobby=${encodeURIComponent(lobby)}`, {
        method: "GET",
        headers: {
          "X-Lobby-Code": lobby,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPlayers(data.players || [])
      } else {
        toast({
          title: "Error fetching players",
          description: "Could not get the player list. The lobby might have been closed.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching players:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveGame = () => {
    localStorage.removeItem("krackle_username")
    localStorage.removeItem("krackle_lobby")
    router.push("/")
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-purple-500 to-purple-800 p-4">
      <div className="text-center my-8">
        <h1 className="text-white text-4xl font-bold tracking-wide">
          KRACKLE.CO <span className="text-3xl">😂</span>
        </h1>
        <h2 className="text-white text-2xl mt-2">Lobby: {lobbyCode}</h2>
      </div>

      <div className="bg-white rounded-3xl p-8 w-full max-w-md mb-8">
        <h3 className="text-2xl font-bold mb-4">Players in Lobby</h3>

        {isLoading ? (
          <div className="text-center py-8">Loading players...</div>
        ) : (
          <div className="space-y-2">
            {players.length > 0 ? (
              players.map((player, index) => (
                <div key={index} className="p-4 rounded-lg bg-purple-100 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center mr-3">
                    {player.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-lg font-medium">
                    {player} {player === username && "(You)"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">No other players have joined yet</div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          className="bg-green-400 hover:bg-green-500 text-white rounded-full px-8 py-6 text-xl font-bold"
          disabled={players.length < 2}
        >
          START GAME
        </Button>

        <Button
          className="bg-red-400 hover:bg-red-500 text-white rounded-full px-8 py-6 text-xl font-bold"
          onClick={handleLeaveGame}
        >
          LEAVE LOBBY
        </Button>
      </div>

      <div className="mt-auto py-6 text-white text-xs">
        MADE WITH LOVE BY HAYSON, NELSON, AND BOYA <span className="ml-1">❤️</span>
      </div>
    </div>
  )
}
