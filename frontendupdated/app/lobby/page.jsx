"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"
import { Users, Play, LogOut, Copy, Check, Send, Settings, UserX, VolumeX, Volume2, Crown, Shield } from "lucide-react"

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
  const [textDisabled, setTextDisabled] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const messagesEndRef = useRef(null)

  // Get WebSocket connection
  const {
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
  } = useWebSocket(lobbyCode, username, userToken, role)

  useEffect(() => {
    // Get data from localStorage and URL params
    const storedUsername = localStorage.getItem("krackle_username")
    const storedLobby = localStorage.getItem("krackle_lobby")
    const storedToken = localStorage.getItem("krackle_user_token")
    const storedAdminToken = localStorage.getItem("krackle_admin_token")
    const urlLobbyCode = searchParams.get("lobby_code")

    setRole(localStorage.getItem("krackle_role"))

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
    
    // Determine role and token
    if (role === "admin") {
      setUserToken(storedAdminToken)
    } else if (role === "player") {
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
        console.log("Current players in lobby:", players.map(p => p.username).join(", "))
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [isConnected, players])

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
    startGame()
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
            {lobbyInfo.name && (
              <span className="text-white/70 text-sm ml-2">({lobbyInfo.name})</span>
            )}
          </div>

          {/* Connection Status */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            <span className="text-white/70 text-sm">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players Panel */}
          <div className="lg:col-span-1">
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
                    players.map((player, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-xl flex items-center transition-all duration-300 ${
                          player.username === username
                            ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 font-bold text-white text-sm ${
                            player.username === username
                              ? "bg-gradient-to-r from-purple-500 to-pink-500"
                              : "bg-gradient-to-r from-gray-400 to-gray-500"
                          }`}
                        >
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 truncate">
                              {player.username}
                            </span>
                            {player.role === 'lobby-admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                            {player.username === username && (
                              <span className="text-xs text-purple-600 font-medium">(You)</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Admin Controls */}
                        {role === 'lobby-admin' && player.username !== username && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-red-100"
                              onClick={() => handleKickPlayer(player.username)}
                              title="Kick player"
                            >
                              <UserX className="w-3 h-3 text-red-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-orange-100"
                              onClick={() => handleMutePlayer(player.username)}
                              title="Mute player"
                            >
                              <VolumeX className="w-3 h-3 text-orange-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">👥</div>
                      <p className="text-gray-500">Waiting for players...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2">
            <div className="relative group h-[500px] flex flex-col">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-5 bg-green-400 rounded-full animate-pulse"></div>
                  <h3 className="text-xl font-bold text-gray-800">Live Chat</h3>
                  {role === 'lobby-admin' && (
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
                          msg.type === 'chat'
                            ? msg.sender === username
                              ? 'bg-purple-100 ml-8'
                              : 'bg-gray-100 mr-8'
                            : 'bg-blue-50 text-center text-sm text-blue-700'
                        }`}
                      >
                        {msg.type === 'chat' ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-800">
                                {msg.sender}
                              </span>
                              {msg.senderRole === 'lobby-admin' && (
                                <Crown className="w-3 h-3 text-yellow-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {msg.timestamp.toLocaleTimeString()}
                              </span>
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
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-8 mb-8">
          {role === 'lobby-admin' && (
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
        {showSettings && role === 'lobby-admin' && (
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
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Rounds (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value))}
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
                <Button
                  onClick={handleSaveSettings}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
