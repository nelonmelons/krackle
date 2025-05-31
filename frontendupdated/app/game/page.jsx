"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"
import { Loader2, RefreshCw, LogOut, Users, Play, Crown, Heart } from "lucide-react"

const API_BASE_URL = "https://cd6f-202-28-7-4.ngrok-free.app"

export default function GamePage() {
  const [username, setUsername] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
  const [userToken, setUserToken] = useState("")
  const [role, setRole] = useState("player")
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [verifiedPlayers, setVerifiedPlayers] = useState([])
  const [videoUrl, setVideoUrl] = useState("")
  const [gameProgress, setGameProgress] = useState(0)
  const videoContainerRef = useRef(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Connect to WebSocket
  const { video_url, isConnected, players, connectionError, sendMessage, disconnect } = useWebSocket(
    lobbyCode,
    username,
    userToken,
    role,
  )

  // Simulate game progress for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      setGameProgress((prev) => {
        const newProgress = prev + Math.random() * 2
        return newProgress > 100 ? 0 : newProgress
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

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

  //  Handle video URL updates from WebSocket
  useEffect(() => {
    if (video_url) {
      load_video_from_url(video_url)
    }
  }, [video_url])

  // Request a new video from the server
  const requestNewVideo = async () => {
    setIsLoadingVideo(true)

    try {
      if (isConnected && sendMessage) {
        sendMessage("new_game_video")
        toast({
          title: "🎮 Requesting New Video",
          description: "Fetching an exciting new video for the game...",
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
          if (data.url) {
            load_video_from_url(data.url)
          }
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

  // Enhanced load video function with strict constraints and interaction control
  const load_video_from_url = (video_url) => {
    if (!video_url || !videoContainerRef.current) {
      console.warn("No video URL provided or container not found")
      return
    }

    // Clear any existing content
    const container = videoContainerRef.current
    container.innerHTML = ""

    // Create aesthetic loading overlay
    const loadingOverlay = document.createElement("div")
    loadingOverlay.className =
      "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm z-10 transition-opacity duration-500"
    loadingOverlay.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white text-lg font-medium">Loading video...</p>
        <div class="mt-2 flex justify-center space-x-1">
          <div class="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
          <div class="w-2 h-2 bg-white/60 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 bg-white/60 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    `
    container.appendChild(loadingOverlay)

    // Calculate responsive width constraints
    const getResponsiveWidth = () => {
      return "20%" // Exactly 20% of screen width
    }

    // Extract video ID and determine video type
    const videoId = getYouTubeVideoId(video_url)

    if (videoId) {
      // Create YouTube iframe with strict constraints
      const videoWrapper = document.createElement("div")
      videoWrapper.className = "relative w-full h-full flex items-center justify-center"

      // Create constrained container with fixed 20% width
      const constrainedContainer = document.createElement("div")
      constrainedContainer.style.width = "20%"
      constrainedContainer.style.height = "100%"
      constrainedContainer.style.maxHeight = "calc(100vh - 200px)"
      constrainedContainer.className = "relative mx-auto" // Center it horizontally

      // Create glassmorphism frame around video
      const videoFrame = document.createElement("div")
      videoFrame.className =
        "relative w-full h-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden"

      // Add decorative gradient border
      const gradientBorder = document.createElement("div")
      gradientBorder.className =
        "absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-blue-500/30 rounded-2xl"

      // Inner container for video with padding
      const innerContainer = document.createElement("div")
      innerContainer.className = "relative w-full h-full m-1 bg-black rounded-xl overflow-hidden"

      // Create iframe with interaction blocking
      const iframe = document.createElement("iframe")
      iframe.className = "absolute inset-0 w-full h-full"
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1&playsinline=1&mute=0`
      iframe.title = "Game Video Player"
      iframe.frameBorder = "0"
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      iframe.allowFullscreen = false // Disable fullscreen
      iframe.style.pointerEvents = "none" // Disable all interactions

      // Create invisible overlay to block all user interactions
      const interactionBlocker = document.createElement("div")
      interactionBlocker.className = "absolute inset-0 z-30 cursor-not-allowed"
      interactionBlocker.style.backgroundColor = "transparent"
      interactionBlocker.title = "Video controls are disabled during gameplay"

      // Add floating video info overlay
      const videoInfo = document.createElement("div")
      videoInfo.className =
        "absolute top-4 left-4 right-4 bg-black/50 backdrop-blur-md rounded-lg p-3 text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity duration-300 z-20"
      videoInfo.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-2">
            <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Now Playing
          </span>
          <span class="text-xs text-white/70">Lobby: ${lobbyCode}</span>
        </div>
        <div class="mt-1 text-xs text-white/50">
          🔒 Controls disabled for fair gameplay
        </div>
      `

      // Add aesthetic corner decorations
      const cornerDecorations = document.createElement("div")
      cornerDecorations.className = "absolute inset-0 pointer-events-none z-10"
      cornerDecorations.innerHTML = `
        <div class="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/30 rounded-tl-lg"></div>
        <div class="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/30 rounded-tr-lg"></div>
        <div class="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/30 rounded-bl-lg"></div>
        <div class="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/30 rounded-br-lg"></div>
      `

      // Add responsive resize handler
      // const handleResize = () => {
      //   constrainedContainer.style.width = getResponsiveWidth()
      // }
      // window.addEventListener("resize", handleResize)

      // Handle iframe load event
      iframe.onload = () => {
        // Fade out loading overlay
        loadingOverlay.style.opacity = "0"
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay)
          }
        }, 500)

        // Add entrance animation to video
        videoFrame.style.transform = "scale(0.9) translateY(20px)"
        videoFrame.style.opacity = "0"

        setTimeout(() => {
          videoFrame.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
          videoFrame.style.transform = "scale(1) translateY(0)"
          videoFrame.style.opacity = "1"
        }, 100)

        // Additional interaction blocking via JavaScript
        setTimeout(() => {
          try {
            // Block keyboard events on the iframe
            iframe.contentWindow?.document?.addEventListener("keydown", (e) => {
              e.preventDefault()
              e.stopPropagation()
              return false
            })

            // Block context menu
            iframe.contentWindow?.document?.addEventListener("contextmenu", (e) => {
              e.preventDefault()
              return false
            })
          } catch (error) {
            // Cross-origin restrictions prevent direct access, but the overlay will handle interactions
            console.log("Cross-origin restrictions apply, using overlay for interaction blocking")
          }
        }, 1000)

        // Show success toast
        if (toast) {
          toast({
            title: "🎬 Video Loaded Successfully",
            description: "Video is now playing in controlled mode",
          })
        }
      }

      iframe.onerror = () => {
        handleVideoError("Failed to load YouTube video")
      }

      // Assemble the video structure
      innerContainer.appendChild(iframe)
      innerContainer.appendChild(interactionBlocker) // Add interaction blocker on top
      videoFrame.appendChild(gradientBorder)
      videoFrame.appendChild(innerContainer)
      videoFrame.appendChild(videoInfo)
      videoFrame.appendChild(cornerDecorations)
      constrainedContainer.appendChild(videoFrame)
      videoWrapper.appendChild(constrainedContainer)
      container.appendChild(videoWrapper)

      // Cleanup function
      const cleanup = () => {
        // window.removeEventListener("resize", handleResize)
      }

      // Store cleanup function for later use
      container._cleanup = cleanup
    } else {
      // Handle direct video URLs with strict control
      const videoWrapper = document.createElement("div")
      videoWrapper.className = "relative w-full h-full flex items-center justify-center"

      const constrainedContainer = document.createElement("div")
      constrainedContainer.style.width = "20%"
      constrainedContainer.style.height = "100%"
      constrainedContainer.style.maxHeight = "calc(100vh - 200px)"
      constrainedContainer.className = "relative mx-auto" // Center it horizontally

      const videoFrame = document.createElement("div")
      videoFrame.className =
        "relative w-full h-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden"

      const video = document.createElement("video")
      video.className = "w-full h-full object-cover rounded-xl"
      video.src = video_url
      video.autoplay = true
      video.muted = true
      video.playsInline = true
      video.loop = false
      video.preload = "auto"

      // Disable all video controls and interactions
      video.controls = false
      video.disablePictureInPicture = true
      video.controlsList = "nodownload nofullscreen noremoteplayback"
      video.style.pointerEvents = "none"

      // Create interaction blocker overlay
      const interactionBlocker = document.createElement("div")
      interactionBlocker.className = "absolute inset-0 z-30 cursor-not-allowed"
      interactionBlocker.style.backgroundColor = "transparent"
      interactionBlocker.title = "Video controls are disabled during gameplay"

      // Prevent all video interactions
      const preventInteraction = (e) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      video.addEventListener("click", preventInteraction)
      video.addEventListener("dblclick", preventInteraction)
      video.addEventListener("contextmenu", preventInteraction)
      video.addEventListener("keydown", preventInteraction)
      video.addEventListener("keyup", preventInteraction)
      video.addEventListener("keypress", preventInteraction)

      // Prevent seeking and pausing
      video.addEventListener("seeking", () => {
        video.currentTime = video.currentTime // Reset to current time
      })

      video.addEventListener("pause", () => {
        video.play() // Force play if paused
      })

      // const handleResize = () => {
      //   constrainedContainer.style.width = getResponsiveWidth()
      // }
      // window.addEventListener("resize", handleResize)

      video.onloadeddata = () => {
        loadingOverlay.style.opacity = "0"
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay)
          }
        }, 500)

        if (toast) {
          toast({
            title: "🎬 Video Loaded Successfully",
            description: "Video is now playing in controlled mode",
          })
        }
      }

      video.onerror = () => {
        handleVideoError("Failed to load video file")
      }

      videoFrame.appendChild(video)
      videoFrame.appendChild(interactionBlocker)
      constrainedContainer.appendChild(videoFrame)
      videoWrapper.appendChild(constrainedContainer)
      container.appendChild(videoWrapper)

      // Cleanup function
      const cleanup = () => {
        // window.removeEventListener("resize", handleResize)
        video.removeEventListener("click", preventInteraction)
        video.removeEventListener("dblclick", preventInteraction)
        video.removeEventListener("contextmenu", preventInteraction)
        video.removeEventListener("keydown", preventInteraction)
        video.removeEventListener("keyup", preventInteraction)
        video.removeEventListener("keypress", preventInteraction)
      }

      container._cleanup = cleanup
    }

    // Helper function to handle video errors
    function handleVideoError(errorMessage) {
      loadingOverlay.innerHTML = `
        <div class="text-center">
          <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p class="text-red-400 text-lg font-medium mb-2">Video Load Error</p>
          <p class="text-white/70 text-sm">${errorMessage}</p>
          <button onclick="this.parentElement.parentElement.parentElement.innerHTML='<div class=\\'absolute inset-0 flex items-center justify-center\\'>
            <div class=\\'text-center\\'>
              <svg class=\\'w-12 h-12 mx-auto mb-4 text-gray-500\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'>
                <path strokeLinecap=\\'round\\' strokeLinejoin=\\'round\\' strokeWidth=\\'2\\' d=\\'M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\\' />
              </svg>
              <p class=\\'text-gray-500\\'>Waiting for video...</p>
            </div>
          </div>'" class="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors duration-200">
            Dismiss
          </button>
        </div>
      `

      if (toast) {
        toast({
          title: "Video Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    }
  }

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      if (videoContainerRef.current?._cleanup) {
        videoContainerRef.current._cleanup()
      }
    }
  }, [])

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
        <div className="w-[400px] flex flex-col">
          <div className="bg-white rounded-xl p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Game Video</h3>

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
              {!video_url && !videoUrl && (
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

        {/* Cute Progress Bar on the Right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-80 hidden md:block">
          <div className="relative w-full h-full">
            {/* Background track */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 shadow-lg">
              {/* Cute decorative elements */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-red-400 rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Progress fill */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500 via-pink-500 to-red-400 rounded-full transition-all duration-1000 ease-out shadow-inner"
              style={{ height: `${gameProgress}%` }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent rounded-full animate-pulse"></div>

              {/* Cute sparkles */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2">
                <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
              </div>
              <div className="absolute top-8 left-1/4">
                <div
                  className="w-0.5 h-0.5 bg-white/80 rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>
              <div className="absolute top-12 right-1/4">
                <div
                  className="w-0.5 h-0.5 bg-white/80 rounded-full animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
              </div>
            </div>

            {/* Progress percentage display */}
            <div className="absolute -right-12 top-1/2 -translate-y-1/2">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg border border-white/30">
                <span className="text-xs font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                  {Math.round(gameProgress)}%
                </span>
              </div>
            </div>

            {/* Cute floating hearts animation */}
            <div
              className="absolute -left-6 top-1/4 animate-bounce"
              style={{ animationDelay: "0s", animationDuration: "3s" }}
            >
              <Heart className="w-3 h-3 text-pink-300/60" />
            </div>
            <div
              className="absolute -left-4 top-3/4 animate-bounce"
              style={{ animationDelay: "1s", animationDuration: "2.5s" }}
            >
              <Heart className="w-2 h-2 text-red-300/60" />
            </div>
            <div
              className="absolute -left-8 top-1/2 animate-bounce"
              style={{ animationDelay: "2s", animationDuration: "3.5s" }}
            >
              <Heart className="w-2.5 h-2.5 text-pink-400/60" />
            </div>
          </div>

          {/* Progress label */}
          <div className="mt-4 text-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/30">
              <span className="text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                Game Progress
              </span>
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
