"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "https://92ac-171-7-106-182.ngrok-free.app"

export default function CreateLobbyPage() {
  const [username, setUsername] = useState("")
  const [maxPlayers, setMaxPlayers] = useState("")
  const [lobbyName, setLobbyName] = useState("")
  const [rounds, setRounds] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Get the username from localStorage
    const storedUsername = localStorage.getItem("krackle_username")
    if (!storedUsername) {
      toast({
        title: "Session expired",
        description: "Please enter your name first",
        variant: "destructive",
      })
      router.push("/")
      return
    }
    setUsername(storedUsername)
  }, [router])

  const handleCreateLobby = async () => {
    if (!maxPlayers || !lobbyName || !rounds) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (isNaN(maxPlayers) || Number.parseInt(maxPlayers) < 2) {
      toast({
        title: "Invalid max players",
        description: "Max players must be a number and at least 2",
        variant: "destructive",
      })
      return
    }

    if (isNaN(rounds) || Number.parseInt(rounds) < 1) {
      toast({
        title: "Invalid rounds",
        description: "Rounds must be a number and at least 1",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/join/create_lobby/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          max_players: Number.parseInt(maxPlayers),
          lobby_name: lobbyName,
          rounds: Number.parseInt(rounds),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store the lobby code and redirect to lobby page
        localStorage.setItem("krackle_lobby", data.lobby_code || data.lobby_id)

        toast({
          title: "Lobby created!",
          description: `Your lobby "${lobbyName}" has been created successfully`,
        })

        // Redirect to the lobby page
        router.push("/lobby")
      } else {
        toast({
          title: "Error creating lobby",
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
      console.error("Error creating lobby:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-500 to-purple-800">
      <div className="text-center mb-8">
        <h1 className="text-white text-6xl font-bold tracking-wide">
          KRACKLE.CO <span className="text-5xl">😂</span>
        </h1>
        <h2 className="text-white text-2xl mt-4">Create New Game</h2>
        <p className="text-white text-lg mt-2">Welcome, {username}!</p>
      </div>

      <div className="bg-white rounded-3xl p-8 w-full max-w-md">
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="lobbyName" className="text-xl font-medium">
              Lobby Name:
            </label>
            <Input
              id="lobbyName"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="Enter lobby name"
              className="rounded-full border-2 border-pink-200 h-14 px-6 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="maxPlayers" className="text-xl font-medium">
              Max Players:
            </label>
            <Input
              id="maxPlayers"
              type="number"
              min="2"
              max="10"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              placeholder="Enter max players (2-10)"
              className="rounded-full border-2 border-pink-200 h-14 px-6 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rounds" className="text-xl font-medium">
              Rounds:
            </label>
            <Input
              id="rounds"
              type="number"
              min="1"
              max="20"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              placeholder="Enter number of rounds"
              className="rounded-full border-2 border-pink-200 h-14 px-6 text-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button
          className="bg-green-400 hover:bg-green-500 text-white rounded-full px-12 py-6 text-xl font-bold"
          onClick={handleCreateLobby}
          disabled={isLoading}
        >
          {isLoading ? "CREATING..." : "CREATE LOBBY"}
        </Button>

        <Button
          className="bg-gray-400 hover:bg-gray-500 text-white rounded-full px-8 py-6 text-xl font-bold"
          onClick={handleGoBack}
          disabled={isLoading}
        >
          GO BACK
        </Button>
      </div>

      <div className="mt-auto py-6 text-white text-xs">
        MADE WITH LOVE BY HAYSON, NELSON, AND BOYA <span className="ml-1">❤️</span>
      </div>
    </div>
  )
}
