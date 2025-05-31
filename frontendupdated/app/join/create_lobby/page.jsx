"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Users, Clock, Trophy, Sparkles } from "lucide-react"

const API_BASE_URL = "https://cd6f-202-28-7-4.ngrok-free.app"

export default function CreateLobbyPage() {
  const [username, setUsername] = useState("")
  const [maxPlayers, setMaxPlayers] = useState("")
  const [lobbyName, setLobbyName] = useState("")
  const [rounds, setRounds] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState("admin")
  
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

      console.log("lobby_name:", lobbyName);

      const data = await response.json()

      if (response.ok) {        // Store the lobby code and admin token
        localStorage.setItem("krackle_lobby", data.lobby_code || data.lobby_id)
        localStorage.setItem("krackle_admin_token", data.admin_token)

        toast({
          title: "Lobby created!",
          description: `Your lobby "${lobbyName}" has been created successfully`,
        })

        localStorage.setItem("krackle_role", role)
        
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex flex-col justify-between px-4 py-6">
      {/* Header Section */}
      <div className="text-center">
        <div className="relative inline-block">
          <h1 className="text-white text-5xl md:text-6xl font-black tracking-tight drop-shadow-2xl relative z-10">
            KRACKLE
            <span className="text-yellow-300 animate-pulse">.CO</span>
          </h1>
          <div className="absolute -top-1 -right-1 text-2xl animate-bounce">
            <Sparkles className="text-yellow-300 drop-shadow-lg" />
          </div>
        </div>
        <p className="text-white/90 text-lg md:text-xl mt-2 font-medium drop-shadow-lg">Create Your Game Lobby</p>
        <div className="flex items-center justify-center gap-2 mt-1 text-white/70">
          <Trophy className="w-4 h-4" />
          <span className="text-sm font-medium">Welcome back, {username}!</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        {/* Main Form Card */}
        <div className="relative group w-full max-w-2xl">
          {/* Glow effect behind card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

          <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lobby Name */}
              <div className="space-y-2">
                <label htmlFor="lobbyName" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  Lobby Name
                </label>
                <div className="relative">
                  <Input
                    id="lobbyName"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    placeholder="Enter a fun lobby name"
                    className="h-12 px-4 text-base rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium placeholder:text-gray-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Max Players */}
              <div className="space-y-2">
                <label htmlFor="maxPlayers" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                  Max Players
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="maxPlayers"
                    type="number"
                    min="2"
                    max="10"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    placeholder="2-10 players"
                    className="h-12 pl-12 pr-4 text-base rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium placeholder:text-gray-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Rounds */}
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="rounds" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                  Number of Rounds
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="rounds"
                    type="number"
                    min="1"
                    max="20"
                    value={rounds}
                    onChange={(e) => setRounds(e.target.value)}
                    placeholder="How many rounds to play?"
                    className="h-12 pl-12 pr-4 text-base rounded-xl border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium placeholder:text-gray-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          {/* Create Lobby Button */}
          <Button
            className="relative group h-14 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 border-0 overflow-hidden"
            onClick={handleCreateLobby}
            disabled={isLoading}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="relative flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <span>{isLoading ? "CREATING..." : "CREATE LOBBY"}</span>
            </div>
          </Button>

          {/* Go Back Button */}
          <Button
            className="relative group h-14 px-6 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 border-0 overflow-hidden"
            onClick={handleGoBack}
            disabled={isLoading}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="relative flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span>GO BACK</span>
            </div>
          </Button>
        </div>

        {/* Game Settings Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {[
            { icon: "🎮", title: "Quick Setup", desc: "Get your game running in seconds" },
            { icon: "👥", title: "Multiplayer Fun", desc: "Play with 2-10 friends" },
            { icon: "🏆", title: "Customizable", desc: "Set your own rules and rounds" },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition-all duration-300 group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-white font-bold text-base mb-1">{feature.title}</h3>
              <p className="text-white/70 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <div className="text-white/60 text-sm font-medium">
          Crafted with ❤️ by <span className="text-white/80 font-semibold">Hayson, Nelson & Boya</span>
        </div>
        <div className="text-white/40 text-xs mt-1">© 2024 Krackle.co - All rights reserved</div>
      </div>
    </div>
  )
}
