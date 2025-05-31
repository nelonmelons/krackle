"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Users, Play, LogOut, Copy, Check } from "lucide-react"

const API_BASE_URL = "https://cd6f-202-28-7-4.ngrok-free.app"

export default function LobbyPage() {
  const [players, setPlayers] = useState([])
  const [username, setUsername] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
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
      const response = await fetch(`${API_BASE_URL}/play/?lobby_code=${encodeURIComponent(lobby)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Lobby-Code": lobby,
          "ngrok-skip-browser-warning": "true",
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

  const copyLobbyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Lobby code copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy lobby code",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-4">
      {/* Header */}
      <div className="text-center my-8">
        <h1 className="text-white text-5xl md:text-6xl font-black tracking-tight drop-shadow-2xl">
          KRACKLE<span className="text-yellow-300">.CO</span>
        </h1>

        {/* Lobby Code Display */}
        <div className="mt-6 inline-flex items-center gap-3 bg-white/20 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/30">
          <span className="text-white/80 font-medium">Lobby:</span>
          <span className="text-white font-bold text-xl tracking-wider">{lobbyCode}</span>
          <Button
            onClick={copyLobbyCode}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-lg"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Players Card */}
      <div className="relative group w-full max-w-md mb-8">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-purple-600" />
            <h3 className="text-2xl font-bold text-gray-800">Players in Lobby</h3>
            <div className="ml-auto bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
              {players.length}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading players...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {players.length > 0 ? (
                players.map((player, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-2xl flex items-center transition-all duration-300 ${
                      player === username
                        ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 font-bold text-white ${
                        player === username
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gradient-to-r from-gray-400 to-gray-500"
                      }`}
                    >
                      {player.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="text-lg font-semibold text-gray-800">{player}</span>
                      {player === username && <span className="ml-2 text-sm text-purple-600 font-medium">(You)</span>}
                    </div>
                    {player === username && <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-gray-500">Waiting for other players to join...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button
          className="relative group h-16 px-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 border-0 overflow-hidden"
          disabled={players.length < 2}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="relative flex items-center gap-3">
            <Play className="w-5 h-5" />
            <span>START GAME</span>
          </div>
        </Button>

        <Button
          className="relative group h-16 px-8 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 border-0 overflow-hidden"
          onClick={handleLeaveGame}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="relative flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>LEAVE LOBBY</span>
          </div>
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-auto py-8 text-center">
        <div className="text-white/60 text-sm font-medium">
          Crafted with ❤️ by <span className="text-white/80 font-semibold">Hayson, Nelson & Boya</span>
        </div>
      </div>
    </div>
  )
}
