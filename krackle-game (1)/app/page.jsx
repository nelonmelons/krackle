"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "https://92ac-171-7-106-182.ngrok-free.app"

export default function KrackleLobby() {
  const [name, setName] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleJoinGame = async () => {
    if (!name || !lobbyCode) {
      toast({
        title: "Missing information",
        description: "Please enter both your name and a lobby code",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Send GET request to /play endpoint with lobby code in JSON header
      const response = await fetch(`${API_BASE_URL}/play?username=${encodeURIComponent(name)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Lobby-Data": JSON.stringify({ lobby_code: lobbyCode }),
        },
      })

      const data = await response.json()

      if (response.ok) {
        // Store the lobby code and username in localStorage
        localStorage.setItem("krackle_username", name)
        localStorage.setItem("krackle_lobby", lobbyCode)

        // Redirect to the play page
        router.push(`/play`)
      } else {
        // Show error message
        toast({
          title: "Error joining game",
          description: data.message || "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Could not connect to the game server. Please try again later.",
        variant: "destructive",
      })
      console.error("Error joining game:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGame = async () => {
    if (!name) {
      toast({
        title: "Missing information",
        description: "Please enter your name to create a game",
        variant: "destructive",
      })
      return
    }

    // Store the username and redirect to create lobby page
    localStorage.setItem("krackle_username", name)
    router.push("/join/create_lobby")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-500 to-purple-800">
      <div className="text-center mb-8">
        <h1 className="text-white text-6xl font-bold tracking-wide">
          KRACKLE.CO <span className="text-5xl">😂</span>
        </h1>
      </div>

      <div className="bg-white rounded-3xl p-8 w-full max-w-md">
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xl font-medium">
              Name:
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="rounded-full border-2 border-pink-200 h-14 px-6 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lobbyCode" className="text-xl font-medium">
              Lobby Code:
            </label>
            <Input
              id="lobbyCode"
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value)}
              placeholder="Enter lobby code"
              className="rounded-full border-2 border-pink-200 h-14 px-6 text-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button
          className="bg-green-400 hover:bg-green-500 text-white rounded-full px-12 py-6 text-xl font-bold"
          onClick={handleJoinGame}
          disabled={isLoading}
        >
          {isLoading ? "JOINING..." : "PLAY!"}
        </Button>

        <Button
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8 py-6 text-xl font-bold"
          onClick={handleCreateGame}
          disabled={isLoading}
        >
          CREATE A NEW GAME
        </Button>
      </div>

      <div className="mt-auto py-6 text-white text-xs">
        MADE WITH LOVE BY HAYSON, NELSON, AND BOYA <span className="ml-1">❤️</span>
      </div>
    </div>
  )
}
