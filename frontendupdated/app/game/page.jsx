"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "https://cd6f-202-28-7-4.ngrok-free.app"

export default function GamePage() {
  const [username, setUsername] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [players, setPlayers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    // Check if we have the required data in localStorage or URL params
    const storedUsername = localStorage.getItem("krackle_username")
    const storedLobby = localStorage.getItem("krackle_lobby")

    // Get parameters from URL if available
    const urlLobbyCode = searchParams.get("lobby_code")
    const urlVideoUrl = searchParams.get("video_url")
    const urlPlayers = searchParams.get("players")

    // Use URL params if available, otherwise use localStorage
    const finalLobbyCode = urlLobbyCode || storedLobby

    if (!storedUsername || !finalLobbyCode) {
      toast({
        title: "Session expired",
        description: "Please join a game again",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setUsername(storedUsername)
    setLobbyCode(finalLobbyCode)

    // If video URL is provided in URL params, use it
    if (urlVideoUrl) {
      setVideoUrl(urlVideoUrl)
    }

    // If players are provided in URL params, parse and use them
    if (urlPlayers) {
      try {
        const parsedPlayers = JSON.parse(decodeURIComponent(urlPlayers))
        setPlayers(Array.isArray(parsedPlayers) ? parsedPlayers : [])
      } catch (error) {
        console.error("Error parsing players:", error)
        setPlayers([])
      }
    }

    // If URL params are not available, fetch game data from API
    if (!urlVideoUrl || !urlPlayers) {
      fetchGameData(finalLobbyCode)
    } else {
      setIsLoading(false)
    }
  }, [router, searchParams])

  const fetchGameData = async (lobby) => {
    try {
      const response = await fetch(`${API_BASE_URL}/game?lobby_code=${encodeURIComponent(lobby)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Lobby-Code": lobby,
          "video-url": videoUrl || "",
          "ngrok-skip-browser-warning": "true",
          "players": JSON.stringify(players) || "[]",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVideoUrl(data.video_url || "")
        setPlayers(data.players || [])
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

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null

    // Handle different YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)

    return match && match[2].length === 11 ? match[2] : null
  }

  const videoId = getYouTubeVideoId(videoUrl)

  const handleLeaveGame = () => {
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-500 to-purple-800">
      <div className="text-center py-4">
        <h1 className="text-white text-4xl font-bold tracking-wide">
          KRACKLE.CO <span className="text-3xl">😂</span>
        </h1>
        <h2 className="text-white text-xl mt-1">Game: {lobbyCode}</h2>
      </div>

      <div className="flex flex-col md:flex-row flex-1 p-4 gap-4">
        {/* Players sidebar */}
        <div className="w-full md:w-64 bg-white bg-opacity-10 rounded-xl p-4">
          <h3 className="text-white text-xl font-bold mb-4">Players</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {players.length > 0 ? (
              players.map((player, index) => (
                <div key={index} className="p-3 rounded-lg bg-gray-200 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center mr-3">
                    {player.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">
                    {player} {player === username && "(You)"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-white">No players found</div>
            )}
          </div>
        </div>

        {/* Main content with video */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-xl p-4 flex-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">YouTube Video</h3>

            <div className="flex-1 relative w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
              {videoId ? (
                <div className="w-full max-w-3xl aspect-video">
                  <iframe
                    className="w-full h-full rounded-lg"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">No video URL provided or invalid YouTube URL</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                className="bg-red-400 hover:bg-red-500 text-white rounded-full px-6 py-2 text-lg font-bold"
                onClick={handleLeaveGame}
              >
                LEAVE GAME
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-white text-xs">
        MADE WITH LOVE BY HAYSON, NELSON, AND BOYA <span className="ml-1">❤️</span>
      </div>
    </div>
  )
}