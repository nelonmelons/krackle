import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from "@/hooks/use-toast"
import { set } from 'date-fns'

const WEBSOCKET_BASE_URL = "wss://cd6f-202-28-7-4.ngrok-free.app"

export function useWebSocket(lobbyCode, username, userToken, role) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [players, setPlayers] = useState([])
  const [lobbyInfo, setLobbyInfo] = useState({})
  const [connectionError, setConnectionError] = useState(null)
  const [verified_usernames, setVerifiedUsername] = useState(null)
  const [game_started, setGameStarted] = useState(false)
  const [video_url, setVideoUrl] = useState(null)
  const [laughMeters, setLaughMeters] = useState({}) // Added laughMeters state
  
  const [data, setData] = useState({})
  const socketRef = useRef(null)
  const { toast } = useToast()

  const connect = useCallback(() => {
    if (!lobbyCode || !username || !userToken || !role) {
      setConnectionError("Missing connection parameters")
      return
    }

    try {
      const wsURL = `${WEBSOCKET_BASE_URL}/ws/connect/?lobby_code=${lobbyCode}&user_token=${userToken}&username=${username}&role=${role}`
      socketRef.current = new WebSocket(wsURL)

      socketRef.current.onopen = () => {
        console.log("✅ WebSocket connected")
        setIsConnected(true)
        setConnectionError(null)
      }

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleMessage(data)
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error)
        setConnectionError("Connection error occurred")
      }

      socketRef.current.onclose = (event) => {
        console.log("❌ WebSocket closed", event.code, event.reason)
        setIsConnected(false)
        
        // Handle different close codes
        const errorMessages = {
          4001: "Missing required connection parameters",
          4003: "Authentication failed",
          4004: "Lobby not found",
          4009: "Token already in use",
          4010: "Lobby is full",
          4011: "Lobby is closed for new connections"
        }
        
        if (errorMessages[event.code]) {
          setConnectionError(errorMessages[event.code])
          toast({
            title: "Connection Error",
            description: errorMessages[event.code],
            variant: "destructive",
          })
        }
        
        // Auto-reconnect logic (unless it's an auth error)
      
      }
    } catch (error) {
      setConnectionError("Failed to create WebSocket connection")
      console.error("WebSocket connection error:", error)
    }
  }, [lobbyCode, username, userToken, role, toast])

  const handleMessage = (data) => {
    console.log("Received WebSocket message:", data)
    setData(data)

    if (data.type === 'lobby.message') {
      console.log("Data Event:", data.event)
      // Handle different lobby events
      switch (data.event) {
        case 'chat_message':
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'chat',
            message: data.message,
            sender: data.sender_username,
            senderRole: data.sender_role,
            timestamp: new Date()
          }])
          break

        case 'user_left':
          setPlayers(data.players_in_lobby || [])
          setLobbyInfo({
            code: data.lobby_code,
            name: data.lobby_name,
            host: data.host,
            playersInLobby: data.players_in_lobby
          })
          
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: `${data.username} ${data.event.replace('_', ' ')}`,
            timestamp: new Date()
          }])
          break
        
        case 'user_connected':
          console.log("User connected:", data.players_in_lobby)
          setPlayers(data.players_in_lobby || [])
          
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: `${data.player} entered the lobby`,
            timestamp: new Date()
          }])
          break

        case 'player_kicked':
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: `${data.kicked_username} was kicked from the lobby. Reason: ${data.reason}`,
            timestamp: new Date()
          }])
          break

        case 'game_started':
          setVideoUrl(data.url)
          setGameStarted(true)
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: `Game started by ${data.started_by}!`,
            timestamp: new Date()
          }])
          toast({
            title: "Game Started!",
            description: data.message,
          })
          break

        case 'lobby_closed':
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: data.message,
            timestamp: new Date()
          }])
          toast({
            title: "Lobby Closed",
            description: data.message,
            variant: "destructive",
          })
          break

        case 'lobby_disbanded':
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: data.message,
            timestamp: new Date()
          }])
          toast({
            title: "Lobby Disbanded",
            description: data.message,
            variant: "destructive",          })
          break

        case 'settings_changed':
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: data.message,
            timestamp: new Date()
          }])
          toast({
            title: "Settings Updated",
            description: data.message,
          })
          break

        // Face detection events
        case 'face_detection_update':
          // Handle face detection updates from other players
          console.log("Face detection update:", data)
          break

        case 'player_verified':
          setVerifiedUsername(data.verified_usernames || data.username)
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: `${data.verified_usernames} has been verified via ${data.verification_method || 'face detection'}`,
            timestamp: new Date()
          }])
          toast({
            title: "Player Verified",
            description: `${data.verified_usernames} has been verified`,
          })
          break

        case 'game_video':
          setVideoUrl(data.url)
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: `Game video available at ${data.url}`,
            timestamp: new Date()
          }])
          toast({
            title: "Game Video Available",
            description: `Game video available at ${data.url}`,
          })
          break

        case 'emotion_prediction_update':
          break

        default:
          console.log("Unhandled lobby event:", data.event)
      }
    } else if (data.type === 'private_message' && data.message_type !== 'emotion_prediction_update') {
      toast({
        title: data.message_type === 'error' ? "Error" : "Success",
        description: data.message,
        variant: data.message_type === 'error' ? "destructive" : "default",
      })
    } else if(data.type === 'private_message' && data.message_type === 'emotion_prediction_update'){
          console.log("Checking LAUGH METER IN SOCKET") // Added case for emotion_prediction_update
          if (data.message) {
            setLaughMeters(data.message)
          }
    }
    else if (data.type === 'kicked') {
      toast({
        title: "Kicked from Lobby",
        description: data.message,
        variant: "destructive",
      })
      // Handle being kicked (maybe redirect)
      setTimeout(() => {
        window.location.href = "/"
      }, 3000)
    } else if (data.type === 'muted') {
      toast({
        title: "Muted",
        description: data.message,
        variant: "destructive",
      })
    } else if (data.type === 'unmuted') {
      toast({
        title: "Unmuted",
        description: data.message,
      })
    }
  }

  const sendMessage = useCallback((type, payload = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type,
        payload
      }))
    } else {
      toast({
        title: "Connection Error",
        description: "Not connected to the server",
        variant: "destructive",
      })
    }
  }, [toast])

  // Convenience methods for common actions
  const sendChatMessage = useCallback((text) => {
    sendMessage('chat_message', { text })
  }, [sendMessage])

  const leaveLobby = useCallback(() => {
    sendMessage('leave_lobby')
  }, [sendMessage])

  const kickPlayer = useCallback((username, reason = '') => {
    sendMessage('kick_player', { username, reason })
  }, [sendMessage])

  const startGame = useCallback(() => {
    sendMessage('start_game')
  }, [sendMessage])

  const closeLobby = useCallback(() => {
    sendMessage('close_lobby')
  }, [sendMessage])

  const disbandLobby = useCallback(() => {
    sendMessage('disband_lobby')
  }, [sendMessage])

  const mutePlayer = useCallback((username) => {
    sendMessage('mute_player', { username })
  }, [sendMessage])

  const unmutePlayer = useCallback((username) => {
    sendMessage('unmute_player', { username })
  }, [sendMessage])

  const changeSettings = useCallback((settings) => {
    sendMessage('change_settings', settings)
  }, [sendMessage])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
    }
  }, [])

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])
  console.log("Laugh Meters from websocket:", laughMeters) // Log laughMeters for debugging
  return {
    isConnected,
    messages,
    players,
    lobbyInfo,
    connectionError,
    verified_usernames,
    game_started,
    video_url,
    laughMeters, // Return laughMeters
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
  }
}
