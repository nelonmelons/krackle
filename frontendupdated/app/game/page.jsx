"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"
import { Loader2, RefreshCw, LogOut, Users, Play, Crown } from "lucide-react"

const API_BASE_URL = "https://cd6f-202-28-7-4.ngrok-free.app"

export default function GamePage() {
  const [username, setUsername] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
  const [userToken, setUserToken] = useState("")
  const [role, setRole] = useState("player")
  const [videoUrl, setVideoUrl] = useState("")
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [verifiedPlayers, setVerifiedPlayers] = useState([])
  const videoContainerRef = useRef(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Connect to WebSocket
  const { isConnected, players, connectionError, sendMessage, disconnect } = useWebSocket(
    lobbyCode,
    username,
    userToken,
    role,
  )

  useEffect(() => {
    // Get data from localStorage
    const storedUsername = localStorage.getItem("krackle_username")
    const storedLobby = localStorage.getItem("krackle_lobby")
    const storedToken = localStorage.getItem("krackle_user_token")
    const storedAdminToken = localStorage.getItem("krackle_admin_token")
    const storedRole = localStorage.getItem("krackle_role")
    const urlLobbyCode = searchParams.get("lobby_code")

    if (!storedUsername || (!storedLobby && !urlLobbyCode)) {
      toast({
        title: "Session expired",
        description: "Please join a lobby again",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setUsername(storedUsername)
    setLobbyCode(storedLobby || urlLobbyCode)

    // Map "admin" to "lobby-admin" for WebSocket connection
    const websocketRole = storedRole === "admin" ? "lobby-admin" : storedRole || "player"
    setRole(websocketRole)

    // Determine token based on role
    if (storedRole === "admin") {
      setUserToken(storedAdminToken)
    } else {
      setUserToken(storedToken)
    }

    // Request a video when the component mounts (if admin)
    if (storedRole === "admin") {
      requestNewVideo()
    }
  }, [router, searchParams, toast])

  // Handle WebSocket messages
  useEffect(() => {
    // Custom message handler for game-specific events
    const handleGameMessage = (event) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "lobby.message" && data.event === "game_started") {
            // Handle game started event
            if (data.verified_players) {
              setVerifiedPlayers(data.verified_players)
            }

            toast({
              title: "Game Started!",
              description: data.message,
            })

            // If admin, request a video
            if (role === "lobby-admin") {
              requestNewVideo()
            }
          }

          // Handle video URL response
          if (data.type === "video_url") {
            setVideoUrl(data.url)
            setIsLoadingVideo(false)

            toast({
              title: "Video Loaded",
              description: "New video has been loaded",
            })
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }
    }

    // Add event listener for WebSocket messages
    if (typeof window !== "undefined") {
      window.addEventListener("message", handleGameMessage)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("message", handleGameMessage)
      }
    }
  }, [role, toast])

  // Request a new video from the server
  const requestNewVideo = async () => {
    setIsLoadingVideo(true)

    try {
      if (isConnected && sendMessage) {
        sendMessage("new_game_video")
        toast({
          title: "Requesting Video",
          description: "Fetching a new video...",
        })
      } else {
        // Fallback to REST API if WebSocket is not connected
        const response = await fetch(`${API_BASE_URL}/game/new_video`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Lobby-Code": lobbyCode,
            "X-User-Token": userToken,
            "ngrok-skip-browser-warning": "true",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setVideoUrl(data.video_url || "")
          toast({
            title: "Video Loaded",
            description: "New video has been loaded",
          })
        } else {
          toast({
            title: "Error loading video",
            description: "Could not load a new video. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Could not connect to the game server.",
        variant: "destructive",
      })
      console.error("Error fetching video:", error)
    } finally {
      setIsLoadingVideo(false)
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
    disconnect()
    router.push("/lobby")
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-700 mb-4">{connectionError}</p>
          <Button onClick={() => router.push("/lobby")} className="bg-purple-600 hover:bg-purple-700">
            Return to Lobby
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-white text-4xl font-bold tracking-wide">
          KRACKLE<span className="text-yellow-300">.CO</span>
        </h1>
        <h2 className="text-white text-xl mt-1">Game: {lobbyCode}</h2>
      </div>

      <div className="flex flex-col md:flex-row flex-1 p-4 gap-4">
        {/* Players sidebar */}
        <div className="w-full md:w-64 bg-white/10 backdrop-blur-md rounded-xl p-4">
          <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Players
          </h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {players.length > 0 ? (
              players.map((player, index) => {
                const isVerified = verifiedPlayers.includes(player)

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      isVerified
                        ? "bg-gradient-to-r from-green-200/80 to-green-100/80 backdrop-blur-md"
                        : "bg-gray-200/80 backdrop-blur-md"
                    } flex items-center`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full ${
                        isVerified ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gray-500"
                      } text-white flex items-center justify-center mr-3`}
                    >
                      {player.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {player} {player === username && "(You)"}
                    </span>
                    {index === 0 && <Crown className="w-4 h-4 text-yellow-500 ml-2" />}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-4 text-white">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading players...</p>
              </div>
            )}
          </div>
        </div>

        {/* Main content with video */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-xl p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">YouTube Video</h3>

              {/* Admin controls */}
              {role === "lobby-admin" && (
                <Button
                  onClick={requestNewVideo}
                  disabled={isLoadingVideo}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLoadingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      New Video
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex-1 relative w-full rounded-lg overflow-hidden bg-black" ref={videoContainerRef}>
              {isLoadingVideo ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-500" />
                    <p className="text-gray-300 text-lg">Loading video...</p>
                  </div>
                </div>
              ) : videoId ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Portrait mode container with max width */}
                  <div className="relative w-full max-w-md h-full">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-500">
                      {role === "lobby-admin"
                        ? "Click 'New Video' to start the game"
                        : "Waiting for the host to start a video..."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                className="bg-red-400 hover:bg-red-500 text-white rounded-full px-6 py-2 text-lg font-bold"
                onClick={handleLeaveGame}
              >
                <LogOut className="w-5 h-5 mr-2" />
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
