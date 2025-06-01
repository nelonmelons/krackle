"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Users, Crown, Loader2, RefreshCw, Play, LogOut } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket" 
import { set } from "date-fns"

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
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false); 
  const videoContainerRef = useRef(null)
  const videoElementRef = useRef(null); // Added ref for video element

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const {
    isConnected,
    messages,
    players,
    lobbyInfo,
    connectionError,
    verified_usernames,
    game_started,
    video_url,
    laughMeters,
    data,
    sendChatMessage,
    leaveLobby,
    kickPlayer,
    startGame,
    closeLobby,
    disbandLobby,
    mutePlayer,
    unmutePlayer,
    changeSettings,
    sendMessage,
    disconnect,
  } = useWebSocket(
    lobbyCode,
    username,
    userToken,
    role,
  )

  useEffect(() => {
    if (window.faceapi) {
      setFaceApiLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
    script.async = true;
    script.onload = () => {
      setFaceApiLoaded(true);
      toast({ title: "FaceAPI Script Loaded", description: "Face detection capabilities are now active." });
    };
    script.onerror = () => {
      toast({ title: "FaceAPI Load Error", description: "Failed to load face detection script.", variant: "destructive" });
    };
    document.body.appendChild(script);

    // No cleanup needed for CDN script that might be used by other pages
  }, [toast]);

  useEffect(() => {
    const storedUsername = localStorage.getItem("krackle_username")
    const storedLobby = localStorage.getItem("krackle_lobby")
    const storedAdminToken = localStorage.getItem("krackle_admin_token")
    const storedToken = localStorage.getItem("krackle_user_token")
    const storedRole = localStorage.getItem("krackle_role")

    if (!storedUsername ||!storedLobby) {
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

    const websocketRole = storedRole === "admin" ? "lobby-admin" : storedRole || "player"
    setRole(websocketRole)

    if (storedRole === "admin") {
      setUserToken(storedAdminToken)
    } else if (storedRole === "player") {
      setUserToken(storedToken)
    } else {
      toast({
        title: "Invalid session",
        description: "Missing authentication token",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    if (storedRole === "admin") {
      requestNewVideo()
    }

    if (!faceApiLoaded || modelsLoaded) return;

    const loadModels = async () => {
      const MODEL_URL = '/models';
      if (!window.faceapi) {
        toast({ title: "FaceAPI Not Ready", description: "Cannot load models yet.", variant: "warning" });
        return;
      }
      try {
        toast({ title: "Loading Face Models", description: "Please wait..." });
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setFaceApiLoaded(true);
        toast({ title: "Face Models Loaded", description: "Ready for face detection." });
      } catch (error) {
        console.error("Error loading face detection models:", error);
        toast({
          title: "Model Load Error",
          description: "Could not load face detection models.",
          variant: "destructive",
        });
      }
    };
    loadModels();
  }, [router, searchParams, toast, faceApiLoaded, modelsLoaded]);

  useEffect(() => {
    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        toast({
          title: "Webcam Error",
          description: "Could not access webcam. Please check permissions.",
          variant: "destructive",
        });
      }
    };
    initWebcam();
    // Cleanup function to stop webcam tracks when component unmounts
    return () => {
      if (videoElementRef.current && videoElementRef.current.srcObject) {
        const stream = videoElementRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoElementRef.current.srcObject = null;
      }
    };
  }, [toast]);

  const requestNewVideo = async () => {
    setIsLoadingVideo(true)
    try {
      if (isConnected && sendMessage) {
        sendMessage("new_game_video")
      } else {
        toast({
          title: "Connection error",
          description: "Not connected to server to request video.",
          variant: "destructive",
        })
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

  const getYouTubeVideoId = (url) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const load_video_from_url = (video_url_from_ws) => {
    if (!video_url_from_ws || !videoContainerRef.current) {
      console.warn("No video URL provided or container not found")
      return
    }
    setVideoUrl(video_url_from_ws); // Update the videoUrl state

    const container = videoContainerRef.current
    container.innerHTML = ""

    const loadingOverlay = document.createElement("div")
    loadingOverlay.className =
      "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm z-10 transition-opacity duration-500"
    loadingOverlay.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white text-lg font-medium">Loading video...</p>
      </div>
    `
    container.appendChild(loadingOverlay)

    const videoId = getYouTubeVideoId(video_url_from_ws)

    if (videoId) {
      const iframe = document.createElement("iframe")
      iframe.className = "absolute inset-0 w-full h-full"
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1&playsinline=1&mute=0`
      iframe.title = "Game Video Player"
      iframe.frameBorder = "0"
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      iframe.allowFullscreen = false
      iframe.style.pointerEvents = "none"

      iframe.onload = () => {
        loadingOverlay.style.opacity = "0"
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay)
          }
        }, 500)
        toast({ title: "YouTube Video Loaded", description: "Playback started." });
      }
      iframe.onerror = () => {
        handleVideoError("Failed to load YouTube video")
      }
      container.appendChild(iframe)
    } else {
      const video = document.createElement("video")
      video.className = "w-full h-full object-cover rounded-xl"
      video.src = video_url_from_ws
      video.autoplay = true
      video.muted = true 
      video.playsInline = true
      video.loop = false
      video.preload = "auto"
      video.controls = false
      video.style.pointerEvents = "none"

      video.onloadeddata = () => {
        loadingOverlay.style.opacity = "0"
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay)
          }
        }, 500)
        toast({ title: "Video File Loaded", description: "Playback started." });
      }
      video.onerror = () => {
        handleVideoError("Failed to load video file")
      }
      container.appendChild(video)
    }

    function handleVideoError(errorMessage) {
      if (loadingOverlay.parentNode) {
         loadingOverlay.innerHTML = `
        <div class="text-center">
          <p class="text-red-400 text-lg font-medium mb-2">Video Load Error</p>
          <p class="text-white/70 text-sm">${errorMessage}</p>
        </div>
      `
      }
      toast({ title: "Video Error", description: errorMessage, variant: "destructive" })
    }
  }

  useEffect(() => {
    if (video_url) {
      load_video_from_url(video_url);
    }
  }, [video_url]);

  async function detectAndSendFace() {
    const currentVideoElement = videoElementRef.current;
    if (!currentVideoElement || currentVideoElement.paused || currentVideoElement.readyState < 3) {
      return;
    }

    if (!window.faceapi) {
      return;
    }

    try {
      const options = new window.faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
      });

      const detections = await window.faceapi.detectAllFaces(currentVideoElement, options);

      if (detections.length === 0) {
        return;
      }

      if (detections.length > 1) {
        // toast({ title: "Multiple faces detected", description: "Please ensure only one person is visible.", variant: "warning" });
        return;
      }

      const detection = detections[0];
      const box = detection.detection ? detection.detection.box : detection.box;

      if (!box) {
        return;
      }

      const tempCanvas = document.createElement("canvas");
      const tempContext = tempCanvas.getContext("2d");

      const padding = 0.1;
      const paddedWidth = box.width * (1 + padding * 2);
      const paddedHeight = box.height * (1 + padding * 2);
      const paddedX = box.x - box.width * padding;
      const paddedY = box.y - box.height * padding;

      const cropX = Math.max(0, paddedX);
      const cropY = Math.max(0, paddedY);
      const cropWidth = Math.min(paddedWidth, currentVideoElement.videoWidth - cropX);
      const cropHeight = Math.min(paddedHeight, currentVideoElement.videoHeight - cropY);
      
      if (cropWidth <= 0 || cropHeight <= 0) {
        return;
      }

      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;

      tempContext.drawImage(
        currentVideoElement,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      const imageDataUrl = tempCanvas.toDataURL("image/jpeg", 0.7);
      const base64Data = imageDataUrl.split(",")[1];

      
      if (sendMessage) {
        sendMessage("upload_image", { image_data: base64Data })
      }

    } catch (error) {
      console.error("Face crop and send error:", error);
      // toast({
      //   title: "Face Detection Error",
      //   description: `Failed to crop and send face: ${error.message}`,
      //   variant: "destructive",
      // });
    }
  }

  // Renamed to avoid conflict with detectAndSendFace which is async
  function triggerFaceImageSend() { 
    if (!isConnected) {
      return;
    }
    const currentVideoElement = videoElementRef.current;
    if (!currentVideoElement || currentVideoElement.paused) {
      return;
    }
    if (!modelsLoaded || !faceApiLoaded) { // Check both flags
      return;
    }
    detectAndSendFace(); // Call the async function
  }

  useEffect(() => {
    let intervalId;
    console.log("Setting up interval for face detection and sending image: VARABLES", {
      isConnected,
      modelsLoaded,
      faceApiLoaded
    });
    if (isConnected && modelsLoaded && faceApiLoaded) {
      intervalId = setInterval(() => {
        triggerFaceImageSend(); // Use the renamed wrapper function
      }, 500);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isConnected, modelsLoaded, faceApiLoaded, lobbyCode, username, sendMessage]); // Added relevant dependencies

  useEffect(() => {
    return () => {
      if (videoContainerRef.current?._cleanup) {
        videoContainerRef.current._cleanup()
      }
    }
  }, [])

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
      <div className="text-center py-4">
        <h1 className="text-white text-4xl font-bold tracking-wide">
          KRACKLE<span className="text-yellow-300">.CO</span>
        </h1>
        <h2 className="text-white text-xl mt-1">Game: {lobbyCode}</h2>
      </div>

      <div className="flex flex-col md:flex-row flex-1 p-4 gap-4">
        <div className="w-full md:w-64 bg-white/10 backdrop-blur-md rounded-xl p-4">
          <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Players
          </h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {players.length > 0 ? (
              players.map((player, index) => {
                const isVerified = verifiedPlayers.includes(player) // REVERTED: Check directly against player string

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
                    {/* REVERTED: Original admin check (first player) */}
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

        <div className="flex-1 flex items-center justify-center">
          <div className="w-[400px] bg-white rounded-xl p-4 h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Game Video</h3>
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

            <div className="mt-4 flex justify-center">
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

      <div className="fixed bottom-6 right-6 z-20">
        <div className="relative flex flex-col items-center">
          <div className="relative w-8 h-40 mb-0">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"></div>
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ease-out"
              style={{
                height: `${gameProgress}%`,
                background: `linear-gradient(to top, #22c55e, #eab308, #ef4444)`,
                margin: "2px",
                width: "calc(100% - 4px)",
              }}
            ></div>
            <div className="absolute -right-10 top-1/2 -translate-y-1/2">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                <span className="text-white font-bold text-xs">{Math.round(gameProgress)}%</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-xl">
              {/* MODIFIED: Use videoElementRef for the webcam video element */}
              <video ref={videoElementRef} id="webcam" className="absolute w-full h-full object-cover" autoPlay playsInline muted></video>
            </div>
            <div className="absolute top-1 right-1 z-10">
              <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white text-xs font-medium">LIVE</span>
              </div>
            </div>
            {/* Add laugh meter bar here */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-pink-500/20 backdrop-blur-sm">
              {laughMeters && laughMeters[username] && (
                <div
                  className="h-full bg-pink-500"
                  style={{ width: `${laughMeters[username]}%` }}
                ></div>
              )}
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
