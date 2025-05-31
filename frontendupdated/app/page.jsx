"use client"

import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"
import { Loader2, Play, Plus, Sparkles, Users } from "lucide-react"

// Dynamically import the 3D background to avoid SSR issues
const VideoBackground = dynamic(() => import("@/components/video-background"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 gradient-fallback flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-white animate-spin" />
    </div>
  ),
})

const API_BASE_URL = "https://cd6f-202-28-7-4.ngrok-free.app"

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
      const response = await fetch(`${API_BASE_URL}/join/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          username: name,
          lobby_code: lobbyCode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store the lobby code and username in localStorage
        localStorage.setItem("krackle_username", name)
        localStorage.setItem("krackle_lobby", lobbyCode)
        localStorage.setItem("krackle_user_token", data.player_token)
        localStorage.setItem("krackle_role", "player")

        // Redirect to the lobby page
        router.push(`/lobby?lobby_code=${encodeURIComponent(lobbyCode)}`)
      } else {
        toast({
          title: "Error joining lobby",
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

  //==========CREATE GAME HANDLER==========
  const handleCreateGame = async () => {
    if (!name) {
      toast({
        title: "Missing information",
        description: "Please enter your name to create a game",
        variant: "destructive",
      })
      return
    }

    localStorage.setItem("krackle_username", name)
    router.push("/join/create_lobby")
  }

  return (
    <>
      {/* 3D Background with CSS fallback */}
      <VideoBackground />

      {/* Content - Single page layout */}
      <div className="relative min-h-screen flex flex-col justify-between z-10 px-4 py-6">
        {/* Header Section - Compact */}
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
          <p className="text-white/90 text-lg md:text-xl mt-2 font-medium drop-shadow-lg">
            Where laughter meets competition
          </p>
          <div className="flex items-center justify-center gap-2 mt-1 text-white/70">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Join thousands of players worldwide</span>
          </div>
        </div>

        {/* Main Content Area - Centered */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          {/* Main Form Card - Compact */}
          <div className="relative group">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

            <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-5 w-full max-w-xl shadow-2xl border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Input */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                    Your Name
                  </label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your display name"
                      className="h-11 px-4 text-base rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium placeholder:text-gray-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Lobby Code Input */}
                <div className="space-y-2">
                  <label htmlFor="lobbyCode" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                    Lobby Code
                    <span className="text-xs text-gray-500 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="lobbyCode"
                      value={lobbyCode}
                      onChange={(e) => setLobbyCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="h-11 px-4 text-base rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium placeholder:text-gray-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            {/* Join Game Button */}
            <Button
              className="relative group h-14 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 border-0 overflow-hidden"
              onClick={handleJoinGame}
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                <span>{isLoading ? "JOINING..." : "JOIN GAME"}</span>
              </div>
            </Button>

            {/* Create Game Button */}
            <Button
              className="relative group h-14 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 border-0 overflow-hidden"
              onClick={handleCreateGame}
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span>CREATE LOBBY</span>
              </div>
            </Button>
          </div>

          {/* Features Section - Horizontal and Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            {[
              { icon: "🎮", title: "Instant Play", desc: "Jump into games in seconds" },
              { icon: "😂", title: "Hilarious Fun", desc: "Guaranteed laughs with friends" },
              { icon: "🏆", title: "Compete", desc: "Climb the global leaderboards" },
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

        {/* Footer - Compact */}
        <div className="text-center">
          <div className="text-white/60 text-sm font-medium">
            Crafted with ❤️ by <span className="text-white/80 font-semibold">Hayson, Nelson & Boya</span>
          </div>
          <div className="text-white/40 text-xs mt-1">© 2024 Krackle.co - All rights reserved</div>
        </div>
      </div>
    </>
  )
}
