"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"
import { Users, Play, LogOut, Copy, Check, Send, Settings, UserX, VolumeX, Crown, Shield } from "lucide-react"

export default function LobbyPage() {
  const [username, setUsername] = useState("")
  const [lobbyCode, setLobbyCode] = useState("")
  const [userToken, setUserToken] = useState("")
  const [role, setRole] = useState("player")
  const [copied, setCopied] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [rounds, setRounds] = useState(5)
  const [textDisabled, setTextDisabled] = useState(false) // Face detection state
  const [faceDetectionLoaded, setFaceDetectionLoaded] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [detectionActive, setDetectionActive] = useState(false)
  const [showFaceVerificationModal, setShowFaceVerificationModal] = useState(true)
  const [faceVerificationComplete, setFaceVerificationComplete] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceCount, setFaceCount] = useState(0)
  const [lastFaceDetectedTime, setLastFaceDetectedTime] = useState(null)
  const [faceDetectionMessage, setFaceDetectionMessage] = useState("Position your face in the camera view")
  const [faceDetectionConfidence, setFaceDetectionConfidence] = useState(0)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const messagesEndRef = useRef(null)
  // Get WebSocket connection
  const {
    game_started,
    verified_usernames,
    isConnected,
    messages,
    players,
    lobbyInfo,
    connectionError,
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
    data, // Add this to access WebSocket messages
  } = useWebSocket(lobbyCode, username, userToken, role)

  // Handle image upload
  const handleImageUploaded = useCallback(
    (base64Data) => {
      if (isConnected && sendMessage) {
        sendMessage("upload_image", { image_data: base64Data })
        toast({
          title: "Image Sent",
          description: "Face image has been sent for verification",
        })
        // Mark face verification as complete and close modal
        setFaceVerificationComplete(true)
        setShowFaceVerificationModal(false)
        // Stop camera after successful capture
        if (window.stopCamera) {
          window.stopCamera()
        }
      }
    },
    [isConnected, sendMessage, toast],
  )
  useEffect(() => {
    // Get data from localStorage and URL params
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
  }, [router, searchParams, toast])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Log current players every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        console.log("Current players in lobby:", players.map((p) => p.username).join(", "))
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [isConnected, players])

  // Face detection initialization useEffect
  useEffect(() => {
    // Load face-api.js script
    const loadFaceApiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.faceapi) {
          resolve()
          return
        }

        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    // Initialize face detection variables and functions
    const initializeFaceDetection = () => {
      // Define global variables similar to script.js
      window.videoElement = null
      window.canvasElement = null
      window.canvasContext = null
      window.cameraStream = null
      window.faceDetectionInterval = null
      window.isDetecting = false
      window.modelsLoaded = false
      window.detectionStats = {
        facesDetected: 0,
        lastConfidence: 0,
        fps: 0,
        frameCount: 0,
        lastTime: Date.now(),
      }

      // Load face detection models function
      window.loadFaceDetectionModels = async () => {
        try {
          console.log("Loading face detection models...")
          await window.faceapi.nets.tinyFaceDetector.loadFromUri("/models")
          window.modelsLoaded = true
          console.log("Face detection models loaded successfully!")
          return true
        } catch (error) {
          console.error("Failed to load models:", error)
          toast({
            title: "Face Detection Error",
            description: "Failed to load face detection models",
            variant: "destructive",
          })
          return false
        }
      } // Start camera function
      window.startCamera = async () => {
        try {
          console.log("Starting camera...")
          setFaceDetectionMessage("Starting camera...")

          const constraints = {
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 },
            },
          }

          window.cameraStream = await navigator.mediaDevices.getUserMedia(constraints)
          console.log("Camera stream obtained!")

          window.videoElement = document.getElementById("videoElement")
          window.canvasElement = document.getElementById("canvasElement")

          if (!window.videoElement || !window.canvasElement) {
            throw new Error("Video or canvas element not found")
          }

          window.canvasContext = window.canvasElement.getContext("2d")
          window.videoElement.srcObject = window.cameraStream

          window.videoElement.style.display = "block"
          window.canvasElement.style.display = "none"

          window.videoElement.onloadedmetadata = () => {
            window.videoElement.play().then(() => {
              console.log("Video playback started!")
              setCameraActive(true)
              setFaceDetectionMessage("Camera active. Click 'Start Detection' to begin face scanning.")

              window.canvasElement.width = window.videoElement.videoWidth || 640
              window.canvasElement.height = window.videoElement.videoHeight || 480

              // Load models in background
              if (!window.modelsLoaded) {
                window.loadFaceDetectionModels().then(() => {
                  // Auto-start face detection when models are loaded and camera is active
                  setTimeout(() => {
                    if (window.startFaceDetection && !window.isDetecting) {
                      window.startFaceDetection()
                    }
                  }, 1000)
                })
              } else {
                // Auto-start face detection if models are already loaded
                setTimeout(() => {
                  if (window.startFaceDetection && !window.isDetecting) {
                    window.startFaceDetection()
                  }
                }, 1000)
              }
            })
          }
        } catch (error) {
          console.error("Failed to start camera:", error)
          setFaceDetectionMessage("Failed to access camera. Please check permissions.")
          toast({
            title: "Camera Error",
            description: "Failed to access camera. Please check permissions and try again.",
            variant: "destructive",
          })
        }
      }

      // Stop camera function
      window.stopCamera = () => {
        if (window.cameraStream) {
          window.cameraStream.getTracks().forEach((track) => track.stop())
          window.cameraStream = null
        }

        if (window.faceDetectionInterval) {
          clearInterval(window.faceDetectionInterval)
          window.faceDetectionInterval = null
        }

        window.isDetecting = false
        setCameraActive(false)
        setDetectionActive(false)

        if (window.videoElement) {
          window.videoElement.srcObject = null
        }

        console.log("Camera stopped")
      } // Start face detection function
      window.startFaceDetection = () => {
        if (window.isDetecting) return

        if (!window.modelsLoaded) {
          toast({
            title: "Face Detection",
            description: "Face detection models not loaded yet",
            variant: "destructive",
          })
          return
        }

        if (!window.videoElement || !window.canvasElement) {
          toast({
            title: "Face Detection Error",
            description: "Video or canvas element not available",
            variant: "destructive",
          })
          return
        }

        window.canvasElement.width = window.videoElement.videoWidth
        window.canvasElement.height = window.videoElement.videoHeight

        window.videoElement.style.display = "none"
        window.canvasElement.style.display = "block"

        window.isDetecting = true
        setDetectionActive(true)
        setFaceDetectionMessage("Face detection is now active. Looking for your face...")
        console.log("Starting face detection...")

        window.faceDetectionInterval = setInterval(async () => {
          await window.detectFaces()
        }, 500) // Increased frequency for better responsiveness
      } // Stop face detection function
      window.stopFaceDetection = () => {
        if (window.faceDetectionInterval) {
          clearInterval(window.faceDetectionInterval)
          window.faceDetectionInterval = null
        }

        window.isDetecting = false
        setDetectionActive(false)
        setFaceDetected(false)
        setFaceCount(0)
        setFaceDetectionConfidence(0)
        setFaceDetectionMessage("Face detection stopped")

        if (window.videoElement && window.canvasElement) {
          window.videoElement.style.display = "block"
          window.canvasElement.style.display = "none"
        }

        console.log("Face detection stopped")
      }

      // Initialize frame counters for reduced logging
      window.detectionFrameCount = 0
      window.noFaceFrameCount = 0 // Detect faces function
      window.detectFaces = async () => {
        if (!window.isDetecting || !window.videoElement || window.videoElement.paused) return

        try {
          const options = new window.faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.3,
          })

          const detections = await window.faceapi.detectAllFaces(window.videoElement, options)

          // Clear canvas and redraw
          window.canvasContext.clearRect(0, 0, window.canvasElement.width, window.canvasElement.height)
          window.canvasContext.drawImage(
            window.videoElement,
            0,
            0,
            window.canvasElement.width,
            window.canvasElement.height,
          )

          if (detections && detections.length > 0) {
            const displaySize = { width: window.canvasElement.width, height: window.canvasElement.height }
            const resizedDetections = window.faceapi.resizeResults(detections, displaySize)

            let highestConfidence = 0
            resizedDetections.forEach((detection) => {
              const box = detection.detection ? detection.detection.box : detection.box
              const score = detection.detection ? detection.detection.score : detection.score

              if (!box) return

              highestConfidence = Math.max(highestConfidence, score)

              // Draw green rectangle
              window.canvasContext.strokeStyle = "#22c55e"
              window.canvasContext.lineWidth = 2
              window.canvasContext.strokeRect(box.x, box.y, box.width, box.height)

              // Draw confidence
              const confidence = Math.round(score * 100)
              window.canvasContext.fillStyle = "#22c55e"
              window.canvasContext.fillRect(box.x, box.y - 20, 60, 20)
              window.canvasContext.fillStyle = "white"
              window.canvasContext.font = "12px Arial"
              window.canvasContext.fillText(`${confidence}%`, box.x + 5, box.y - 6)
            })

            // Update face detection state
            setFaceDetected(true)
            setFaceCount(detections.length)
            setLastFaceDetectedTime(Date.now())
            setFaceDetectionConfidence(Math.round(highestConfidence * 100))

            if (detections.length === 1) {
              if (highestConfidence > 0.7) {
                setFaceDetectionMessage("Perfect! Face detected with high confidence. Ready to capture.")
              } else if (highestConfidence > 0.5) {
                setFaceDetectionMessage("Good! Face detected. Move closer for better detection.")
              } else {
                setFaceDetectionMessage("Face detected but unclear. Please adjust lighting or position.")
              }
            } else if (detections.length > 1) {
              setFaceDetectionMessage("Multiple faces detected. Please ensure only one person is visible.")
            }

            // Only log occasionally to avoid spam
            window.detectionFrameCount++
            if (window.detectionFrameCount % 10 === 0) {
              console.log(`${detections.length} face(s) detected (confidence: ${Math.round(highestConfidence * 100)}%)`)
            }
            window.noFaceFrameCount = 0 // Reset no face counter
          } else {
            // No faces detected - update state
            setFaceDetected(false)
            setFaceCount(0)
            setFaceDetectionConfidence(0)

            // Provide guidance based on how long no face has been detected
            window.noFaceFrameCount++
            if (window.noFaceFrameCount > 5) {
              setFaceDetectionMessage("No face detected. Please position your face in the camera view.")
            }

            // Only log "no faces" occasionally
            if (window.noFaceFrameCount % 20 === 0) {
              console.log("No faces detected")
            }
            window.detectionFrameCount = 0 // Reset detection counter
          }
        } catch (error) {
          console.error("Face detection error:", error)
          setFaceDetectionMessage("Face detection error. Please restart camera.")
        }
      } // Send face image function
      window.sendFaceImage = async () => {
        if (!isConnected) {
          toast({
            title: "Connection Error",
            description: "WebSocket not connected",
            variant: "destructive",
          })
          return
        }

        if (!window.videoElement || window.videoElement.paused) {
          toast({
            title: "Camera Error",
            description: "Camera not active",
            variant: "destructive",
          })
          return
        }

        if (!window.modelsLoaded) {
          toast({
            title: "Face Detection Error",
            description: "Face detection models not loaded",
            variant: "destructive",
          })
          return
        }

        try {
          console.log("Detecting and capturing face...")

          const options = new window.faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.3,
          })

          const detections = await window.faceapi.detectAllFaces(window.videoElement, options)

          if (detections.length === 0) {
            toast({
              title: "No Face Detected",
              description: "Please position your face in view of the camera",
              variant: "destructive",
            })
            return
          }

          if (detections.length > 1) {
            toast({
              title: "Multiple Faces",
              description: "Please ensure only one person is visible",
              variant: "destructive",
            })
            return
          }

          const detection = detections[0]
          const box = detection.detection ? detection.detection.box : detection.box

          if (!box) {
            toast({
              title: "Detection Error",
              description: "Could not get face bounding box",
              variant: "destructive",
            })
            return
          }

          // Create temp canvas for cropping
          const tempCanvas = document.createElement("canvas")
          const tempContext = tempCanvas.getContext("2d")

          const padding = 0.1
          const paddedWidth = box.width * (1 + padding * 2)
          const paddedHeight = box.height * (1 + padding * 2)
          const paddedX = Math.max(0, box.x - box.width * padding)
          const paddedY = Math.max(0, box.y - box.height * padding)

          const cropX = Math.max(0, paddedX)
          const cropY = Math.max(0, paddedY)
          const cropWidth = Math.min(paddedWidth, window.videoElement.videoWidth - cropX)
          const cropHeight = Math.min(paddedHeight, window.videoElement.videoHeight - cropY)

          tempCanvas.width = cropWidth
          tempCanvas.height = cropHeight

          tempContext.drawImage(window.videoElement, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

          const imageDataUrl = tempCanvas.toDataURL("image/jpeg", 0.8)
          const base64Data = imageDataUrl.split(",")[1]

          // Call the existing handleImageUploaded callback
          handleImageUploaded(base64Data)
        } catch (error) {
          console.error("Failed to crop and send face:", error)
          toast({
            title: "Upload Error",
            description: "Failed to capture and send face image",
            variant: "destructive",
          })
        }
      }
    }

    loadFaceApiScript()
      .then(() => {
        console.log("face-api.js loaded successfully")
        setFaceDetectionLoaded(true)
        initializeFaceDetection()
      })
      .catch((error) => {
        console.error("Failed to load face-api.js:", error)
        toast({
          title: "Face Detection Error",
          description: "Failed to load face detection library",
          variant: "destructive",
        })
      })

    return () => {
      if (window.stopCamera) {
        window.stopCamera()
      }
    }
  }, [handleImageUploaded, isConnected, toast])

  // Monitor face detection status and provide timeout guidance
  useEffect(() => {
    if (!detectionActive) return

    const timeoutDuration = 15000 // 15 seconds
    const timeout = setTimeout(() => {
      if (detectionActive && !faceDetected) {
        setFaceDetectionMessage(
          "Having trouble detecting your face? Try adjusting lighting or moving closer to the camera.",
        )
        toast({
          title: "Face Detection Help",
          description: "Make sure you're in good lighting and facing the camera directly",
          variant: "default",
        })
      }
    }, timeoutDuration)

    return () => clearTimeout(timeout)
  }, [detectionActive, faceDetected, toast])

  // Auto-update detection message based on time since last face detected
  useEffect(() => {
    if (!detectionActive || !lastFaceDetectedTime) return

    const interval = setInterval(() => {
      const timeSinceLastDetection = Date.now() - lastFaceDetectedTime
      if (timeSinceLastDetection > 5000 && !faceDetected) {
        setFaceDetectionMessage("No face detected recently. Please check your position and lighting.")
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [detectionActive, lastFaceDetectedTime, faceDetected])

  // Handle game_started event and redirect to game page
  useEffect(() => {
    console.log("WebSocket data received (Game_started):", game_started)
    if (game_started && verified_usernames && verified_usernames.includes(username)) {
      console.log("Game started event received for verified user:", data)
      // Redirect to game page after a short delay
      setTimeout(() => {
      router.push("/game")
      }, 1500)
    }
  }, [data, router, toast])

  const handleLeaveGame = () => {
    leaveLobby()
    localStorage.removeItem("krackle_username")
    localStorage.removeItem("krackle_lobby")
    localStorage.removeItem("krackle_user_token")
    localStorage.removeItem("krackle_admin_token")
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

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (chatMessage.trim() && isConnected) {
      sendChatMessage(chatMessage.trim())
      setChatMessage("")
    }
  }

  const handleKickPlayer = (playerName) => {
    if (window.confirm(`Are you sure you want to kick ${playerName}?`)) {
      const reason = prompt("Reason (optional):")
      kickPlayer(playerName, reason || "No reason provided")
    }
  }

  const handleMutePlayer = (playerName) => {
    mutePlayer(playerName)
  }

  const handleUnmutePlayer = (playerName) => {
    unmutePlayer(playerName)
  }

  const handleStartGame = () => {
    if (players.length < 2) {
      toast({
        title: "Cannot start game",
        description: "At least 2 players are required",
        variant: "destructive",
      })
      return
    }

    // Send start_game message through WebSocket
    if (isConnected && sendMessage) {
      sendMessage("start_game")
      toast({
        title: "Starting Game",
        description: "Initializing the game...",
      })
    } else {
      toast({
        title: "Connection Error",
        description: "Not connected to the server",
        variant: "destructive",
      })
    }
  }

  const handleSaveSettings = () => {
    const settings = {}
    if (maxPlayers !== lobbyInfo.maxPlayers) settings.max_players = maxPlayers
    if (rounds !== lobbyInfo.rounds) settings.rounds = rounds
    if (textDisabled !== lobbyInfo.textDisabled) settings.text_disabled = textDisabled

    if (Object.keys(settings).length > 0) {
      changeSettings(settings)
    }
    setShowSettings(false)
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-700 mb-4">{connectionError}</p>
          <Button onClick={() => router.push("/")} className="bg-purple-600 hover:bg-purple-700">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-4">
      {/* Face Verification Modal */}
      {showFaceVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blurred Background */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-lg"></div>

          {/* Modal Content */}
          <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Face Verification Required</h2>
              <p className="text-gray-600">Please verify your identity to join the lobby</p>
            </div>{" "}
            {/* Status Indicators */}
            <div className="mb-4">
              {/* Model and Connection Status */}
              <div className="flex flex-wrap gap-2 justify-center mb-3">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    faceDetectionLoaded ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {faceDetectionLoaded ? "✓ Models Loaded" : "⏳ Loading Models..."}
                </div>
                {cameraActive && (
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📹 Camera Active
                  </div>
                )}
                {detectionActive && (
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 animate-pulse">
                    🔍 Detecting...
                  </div>
                )}
              </div>

              {/* Face Detection Status */}
              {detectionActive && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Face Detection Status:</span>
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        faceDetected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {faceDetected
                        ? `✓ ${faceCount} Face${faceCount !== 1 ? "s" : ""} Detected`
                        : "✗ No Face Detected"}
                    </div>
                  </div>

                  {faceDetected && faceDetectionConfidence > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Confidence:</span>
                        <span
                          className={`font-medium ${
                            faceDetectionConfidence > 70
                              ? "text-green-600"
                              : faceDetectionConfidence > 50
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {faceDetectionConfidence}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            faceDetectionConfidence > 70
                              ? "bg-green-500"
                              : faceDetectionConfidence > 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(faceDetectionConfidence, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <p
                    className={`text-sm ${
                      faceDetected && faceCount === 1 && faceDetectionConfidence > 70
                        ? "text-green-700"
                        : faceDetected && faceCount > 1
                          ? "text-orange-700"
                          : faceDetected
                            ? "text-yellow-700"
                            : "text-red-700"
                    }`}
                  >
                    {faceDetectionMessage}
                  </p>
                </div>
              )}
            </div>{" "}
            {/* Circular Video/Canvas Container */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                {/* Circular mask container */}
                <div className="w-64 h-64 rounded-full overflow-hidden bg-gray-800 border-4 border-white shadow-xl">
                  <video
                    id="videoElement"
                    autoPlay
                    muted
                    playsInline
                    width="320"
                    height="320"
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <canvas
                    id="canvasElement"
                    width="320"
                    height="320"
                    className="w-full h-full object-cover absolute inset-0"
                    style={{ transform: "scaleX(-1)", display: "none" }}
                  />
                </div>

                {/* Dynamic overlay ring based on face detection status */}
                <div
                  className={`absolute inset-0 rounded-full border-4 transition-all duration-300 ${
                    detectionActive
                      ? faceDetected && faceCount === 1 && faceDetectionConfidence > 70
                        ? "border-green-400 opacity-80 animate-pulse"
                        : faceDetected && faceCount === 1
                          ? "border-yellow-400 opacity-60 animate-pulse"
                          : faceDetected && faceCount > 1
                            ? "border-orange-400 opacity-60 animate-pulse"
                            : "border-red-400 opacity-60 animate-pulse"
                      : "border-purple-400 opacity-50 animate-pulse"
                  }`}
                ></div>

                {/* Camera status indicator */}
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full">
                    <div className="text-white text-center">
                      <div className="text-4xl mb-2">📹</div>
                      <div className="text-sm">Camera Off</div>
                    </div>
                  </div>
                )}
              </div>
            </div>{" "}
            {/* Instructions */}
            <div className="mb-6 text-center">
              {!cameraActive ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Click "Start Camera" to begin face verification.</p>
                  <p className="text-xs text-gray-500">
                    Make sure you're in a well-lit area and the only person visible.
                  </p>
                </div>
              ) : !detectionActive ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Camera is active. Click "Start Detection" to begin scanning for your face.
                  </p>
                  <p className="text-xs text-gray-500">Position your face in the center of the circular frame.</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {faceDetected && faceCount === 1 && faceDetectionConfidence > 70
                      ? "Perfect! You can now capture and send your face."
                      : "Follow the guidance above to improve face detection."}
                  </p>
                  <p className="text-xs text-gray-500">
                    {faceDetected && faceCount === 1
                      ? "Great positioning! Face detected successfully."
                      : faceDetected && faceCount > 1
                        ? "Multiple faces detected - please ensure only you are visible."
                        : "Adjust your position until your face is clearly detected."}
                  </p>
                </div>
              )}
            </div>{" "}
            {/* Controls */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.startCamera && window.startCamera()}
                  disabled={!isConnected || cameraActive}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {cameraActive ? "✓ Camera On" : "Start Camera"}
                </button>
                <button
                  onClick={() => window.stopCamera && window.stopCamera()}
                  disabled={!isConnected || !cameraActive}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Stop Camera
                </button>
              </div>

              {/* Detection Controls */}
              {cameraActive && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.startFaceDetection && window.startFaceDetection()}
                    disabled={!isConnected || !cameraActive || !faceDetectionLoaded || detectionActive}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    {detectionActive ? "🔍 Detecting..." : "Start Detection"}
                  </button>
                  <button
                    onClick={() => window.stopFaceDetection && window.stopFaceDetection()}
                    disabled={!isConnected || !detectionActive}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Stop Detection
                  </button>
                </div>
              )}

              <button
                onClick={() => window.sendFaceImage && window.sendFaceImage()}
                disabled={!isConnected || !cameraActive || !faceDetectionLoaded || !faceDetected || faceCount !== 1}
                className={`w-full px-4 py-3 font-bold transition-all duration-300 transform hover:scale-105 rounded-lg ${
                  faceDetected && faceCount === 1 && faceDetectionConfidence > 50
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                }`}
              >
                {faceDetected && faceCount === 1
                  ? "✅ Capture & Send Face"
                  : faceDetected && faceCount > 1
                    ? "⚠️ Multiple Faces Detected"
                    : "📸 Capture & Send Face"}
              </button>

              {/* Skip button for testing (can be removed in production) */}
              <button
                onClick={() => {
                  setFaceVerificationComplete(true)
                  setShowFaceVerificationModal(false)
                  if (window.stopCamera) {
                    window.stopCamera()
                  }
                }}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Skip Verification (Testing)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Lobby Content - Only show after face verification */}
      {faceVerificationComplete && (
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center my-8">
            <h1 className="text-white text-4xl md:text-5xl font-black tracking-tight drop-shadow-2xl">
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
              {lobbyInfo.name && <span className="text-white/70 text-sm ml-2">({lobbyInfo.name})</span>}
            </div>

            {/* Connection Status */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"} animate-pulse`}
              ></div>
              <span className="text-white/70 text-sm">{isConnected ? "Connected" : "Connecting..."}</span>
            </div>
          </div>{" "}
          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Players Panel */}
            <div className="xl:col-span-1">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h3 className="text-xl font-bold text-gray-800">Players</h3>
                    <div className="ml-auto bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {players.length}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {players.length > 0 ? (
                      players.map((player, index) => {
                        const isVerified =
                          verified_usernames &&
                          (Array.isArray(verified_usernames)
                            ? verified_usernames.includes(player)
                            : verified_usernames === player)

                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-xl flex items-center transition-all duration-300 ${
                              player === username
                                ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300"
                                : "bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 font-bold text-white text-sm relative ${
                                player === username
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                  : "bg-gradient-to-r from-gray-400 to-gray-500"
                              }`}
                            >
                              {player.charAt(0).toUpperCase()}
                              {/* Verification badge */}
                              {isVerified && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800 truncate">{player}</span>
                                {index == 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                                {player === username && (
                                  <span className="text-xs text-purple-600 font-medium">(You)</span>
                                )}
                                {/* Verification text indicator */}
                                {isVerified && (
                                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                                    Verified
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Admin Controls */}
                            {role === "lobby-admin" && player !== username && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 hover:bg-red-100"
                                  onClick={() => handleKickPlayer(player)}
                                  title="Kick player"
                                >
                                  <UserX className="w-3 h-3 text-red-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 hover:bg-orange-100"
                                  onClick={() => handleMutePlayer(player)}
                                  title="Mute player"
                                >
                                  <VolumeX className="w-3 h-3 text-orange-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-3">👥</div>
                        <p className="text-gray-500">Waiting for players...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>{" "}
            {/* Chat Panel */}
            <div className="xl:col-span-2">
              <div className="relative group h-[500px] flex flex-col">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-5 h-5 bg-green-400 rounded-full animate-pulse"></div>
                    <h3 className="text-xl font-bold text-gray-800">Live Chat</h3>
                    {role === "lobby-admin" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => setShowSettings(!showSettings)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-80">
                    {messages.length > 0 ? (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.type === "chat"
                              ? msg.sender === username
                                ? "bg-purple-100 ml-8"
                                : "bg-gray-100 mr-8"
                              : "bg-blue-50 text-center text-sm text-blue-700"
                          }`}
                        >
                          {msg.type === "chat" ? (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-gray-800">{msg.sender}</span>
                                {msg.senderRole === "lobby-admin" && <Crown className="w-3 h-3 text-yellow-500" />}
                                <span className="text-xs text-gray-500">{msg.timestamp.toLocaleTimeString()}</span>
                              </div>
                              <p className="text-gray-700">{msg.message}</p>
                            </div>
                          ) : (
                            <p>{msg.message}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder={textDisabled ? "Chat is disabled" : "Type a message..."}
                      disabled={!isConnected || textDisabled}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!isConnected || !chatMessage.trim() || textDisabled}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>{" "}
                  </form>
                </div>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 mb-8">
            {role === "lobby-admin" && (
              <>
                <Button
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className="h-14 px-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105"
                >
                  <Play className="w-5 h-5 mr-2" />
                  START GAME
                </Button>
                <Button
                  onClick={closeLobby}
                  className="h-14 px-8 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  CLOSE LOBBY
                </Button>
                <Button
                  onClick={disbandLobby}
                  className="h-14 px-8 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105"
                >
                  <UserX className="w-5 h-5 mr-2" />
                  DISBAND
                </Button>
              </>
            )}

            <Button
              onClick={handleLeaveGame}
              className="h-14 px-8 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105"
            >
              <LogOut className="w-5 h-5 mr-2" />
              LEAVE
            </Button>
          </div>
          {/* Settings Modal */}
          {showSettings && role === "lobby-admin" && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Lobby Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Players (2-50)</label>
                    <Input
                      type="number"
                      min="2"
                      max="50"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number.parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Rounds (1-10)</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={rounds}
                      onChange={(e) => setRounds(Number.parseInt(e.target.value))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="textDisabled"
                      checked={textDisabled}
                      onChange={(e) => setTextDisabled(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="textDisabled" className="text-sm font-medium">
                      Disable text chat
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleSaveSettings} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Save Changes
                  </Button>
                  <Button onClick={() => setShowSettings(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
