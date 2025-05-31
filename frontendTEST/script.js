let ws = null
let isConnected = false
let isServerRunning = false
let serverStartTime = null
let uptimeInterval = null

// Tab Management
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active")
  })

  // Remove active class from all tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active")
  })

  // Show selected tab content
  document.getElementById(tabName + "Tab").classList.add("active")

  // Add active class to selected tab
  event.target.classList.add("active")
}

// Generate random token
function generateToken() {
  const token = "token_" + Math.random().toString(36).substr(2, 9)
  document.getElementById("userToken").value = token
}

// Update connection status
function updateConnectionStatus(connected) {
  const statusElement = document.getElementById("connectionStatus")
  const connectBtn = document.getElementById("connectBtn")
  const disconnectBtn = document.getElementById("disconnectBtn")

  if (connected) {
    statusElement.textContent = "Connected"
    statusElement.className = "status-badge connected"
    connectBtn.disabled = true
    disconnectBtn.disabled = false
  } else {
    statusElement.textContent = "Disconnected"
    statusElement.className = "status-badge disconnected"
    connectBtn.disabled = false
    disconnectBtn.disabled = true
  }
}

// Update server status
function updateServerStatus(running) {
  const statusElement = document.getElementById("serverStatus")
  const startBtn = document.getElementById("startServerBtn")
  const stopBtn = document.getElementById("stopServerBtn")

  if (running) {
    statusElement.textContent = "Server Running"
    statusElement.className = "status-badge server-running"
    startBtn.disabled = true
    stopBtn.disabled = false

    if (!serverStartTime) {
      serverStartTime = new Date()
      startUptimeCounter()
    }
  } else {
    statusElement.textContent = "Server Stopped"
    statusElement.className = "status-badge server-stopped"
    startBtn.disabled = false
    stopBtn.disabled = true

    if (uptimeInterval) {
      clearInterval(uptimeInterval)
      uptimeInterval = null
    }
    serverStartTime = null
    document.getElementById("serverUptime").value = "00:00:00"
  }

  isServerRunning = running
}

// Start uptime counter
function startUptimeCounter() {
  uptimeInterval = setInterval(() => {
    if (serverStartTime) {
      const now = new Date()
      const diff = now - serverStartTime
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      const uptime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      document.getElementById("serverUptime").value = uptime
    }
  }, 1000)
}

// Add message to log
function addMessage(content, type) {
  // Also log to console for debugging
  console.log(`[${type.toUpperCase()}] ${content}`)

  const container = document.getElementById("messagesContainer")
  if (!container) {
    console.error("Messages container not found!")
    return
  }

  const messageElement = document.createElement("div")
  messageElement.className = `message ${type}`

  const timestamp = document.createElement("div")
  timestamp.className = "message-timestamp"
  timestamp.textContent = `[${new Date().toLocaleTimeString()}]`

  const messageContent = document.createElement("div")
  messageContent.className = "message-content"
  messageContent.textContent = content

  messageElement.appendChild(timestamp)
  messageElement.appendChild(messageContent)
  container.appendChild(messageElement)
  container.scrollTop = container.scrollHeight
}

// Clear messages
function clearMessages() {
  document.getElementById("messagesContainer").innerHTML = ""
}

// Display token
function displayToken(token, type) {
  const tokenDisplay = document.getElementById("tokenDisplay")
  tokenDisplay.innerHTML = `<strong>${type}:</strong> ${token}`
  tokenDisplay.style.display = "block"
}

// Server Management Functions
function startServer() {
  const host = document.getElementById("serverHost").value
  const port = document.getElementById("serverPort").value
  const name = document.getElementById("serverName").value
  const maxLobbies = document.getElementById("maxLobbies").value
  const region = document.getElementById("serverRegion").value

  addMessage(`🚀 Starting server "${name}" on ${host}:${port}...`, "system")

  // Simulate server start
  setTimeout(() => {
    updateServerStatus(true)
    addMessage(`✅ Server started successfully!`, "incoming")

    const serverInfo = document.getElementById("serverInfo")
    serverInfo.innerHTML = `
            <strong>Server Info:</strong><br>
            Name: ${name}<br>
            Host: ${host}:${port}<br>
            Region: ${region}<br>
            Max Lobbies: ${maxLobbies}
        `
    serverInfo.style.display = "block"

    // Update API URL to match server
    document.getElementById("apiUrl").value = `http://${host}:${port}`
    document.getElementById("serverUrl").value = `ws://${host}:${port}/ws/lobby/`

    refreshStats()
  }, 2000)
}

function stopServer() {
  addMessage("🛑 Stopping server...", "system")

  setTimeout(() => {
    updateServerStatus(false)
    addMessage("❌ Server stopped", "error")

    document.getElementById("serverInfo").style.display = "none"

    // Reset stats
    document.getElementById("activeLobbies").value = "0"
    document.getElementById("connectedPlayers").value = "0"
    document.getElementById("memoryUsage").value = "0 MB"
  }, 1000)
}

function restartServer() {
  if (isServerRunning) {
    addMessage("🔄 Restarting server...", "system")
    stopServer()
    setTimeout(() => {
      startServer()
    }, 3000)
  } else {
    startServer()
  }
}

function refreshStats() {
  if (isServerRunning) {
    // Simulate stats
    document.getElementById("activeLobbies").value = Math.floor(Math.random() * 5) + 1
    document.getElementById("connectedPlayers").value = Math.floor(Math.random() * 20) + 1
    document.getElementById("memoryUsage").value = (Math.random() * 100 + 50).toFixed(1) + " MB"

    addMessage("📊 Server statistics refreshed", "system")
  }
}

function exportLogs() {
  const messages = document.getElementById("messagesContainer").innerText
  const blob = new Blob([messages], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `krackle-logs-${new Date().toISOString().slice(0, 19)}.txt`
  a.click()
  URL.revokeObjectURL(url)

  addMessage("📄 Logs exported successfully", "system")
}

// HTTP API Functions
async function createLobby() {
  const apiUrl = document.getElementById("apiUrl").value
  const username = document.getElementById("httpUsername").value
  const lobbyCode = document.getElementById("httpLobbyCode").value
  const lobbyName = document.getElementById("lobbyName").value
  const maxPlayers = Number.parseInt(document.getElementById("maxPlayersCreate").value)
  const rounds = Number.parseInt(document.getElementById("roundsCreate").value)

  if (!username || !lobbyCode) {
    alert("Please enter username and lobby code")
    return
  }

  try {
    addMessage("🔄 Creating lobby...", "outgoing")

    // Try both API endpoints
    let response
    try {
      response = await fetch(`${apiUrl}/join/create_lobby/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          username: username,
          max_players: maxPlayers,
          lobby_name: lobbyName,
          rounds: rounds,
        }),
      })
    } catch (e) {
      response = await fetch(`${apiUrl}/create-lobby/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          lobby_code: lobbyCode,
          lobby_name: lobbyName,
          max_players: maxPlayers,
          rounds: rounds,
          host_username: username,
        }),
      })
    }

    const data = await response.json()

    if (response.ok) {
      addMessage(`✅ Lobby created successfully!`, "incoming")
      addMessage(`Admin Token: ${data.admin_token || data.user_token}`, "incoming")

      // Auto-fill connection form
      document.getElementById("lobbyCode").value = data.lobby_code || lobbyCode
      document.getElementById("username").value = data.username || username
      document.getElementById("userToken").value = data.admin_token || data.user_token
      document.getElementById("role").value = "lobby-admin"

      displayToken(data.admin_token || data.user_token, "Admin Token")
    } else {
      addMessage(`❌ Error creating lobby: ${data.detail || data.error || "Unknown error"}`, "error")
    }
  } catch (error) {
    addMessage(`❌ Network error: ${error.message}`, "error")
  }
}

async function joinLobby() {
  const apiUrl = document.getElementById("apiUrl").value
  const username = document.getElementById("httpUsername").value
  const lobbyCode = document.getElementById("httpLobbyCode").value

  if (!username || !lobbyCode) {
    alert("Please enter username and lobby code")
    return
  }

  try {
    addMessage("🔄 Joining lobby...", "outgoing")

    const response = await fetch(`${apiUrl}/join/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        lobby_code: lobbyCode,
        username: username,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      addMessage(`✅ Joined lobby successfully!`, "incoming")
      addMessage(`Player Token: ${data.user_token}`, "incoming")

      // Auto-fill connection form
      document.getElementById("lobbyCode").value = lobbyCode
      document.getElementById("username").value = username
      document.getElementById("userToken").value = data.user_token
      document.getElementById("role").value = "player"

      displayToken(data.user_token, "Player Token")
    } else {
      addMessage(`❌ Error joining lobby: ${data.detail || data.error || "Unknown error"}`, "error")
    }
  } catch (error) {
    addMessage(`❌ Network error: ${error.message}`, "error")
  }
}

async function listLobbies() {
  const apiUrl = document.getElementById("apiUrl").value

  try {
    addMessage("🔄 Fetching lobby list...", "outgoing")

    const response = await fetch(`${apiUrl}/lobbies/`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    })

    const data = await response.json()

    if (response.ok) {
      const lobbyList = document.getElementById("lobbyList")
      lobbyList.innerHTML = ""

      if (data.lobbies && data.lobbies.length > 0) {
        data.lobbies.forEach((lobby) => {
          const lobbyElement = document.createElement("div")
          lobbyElement.className = "message incoming"
          lobbyElement.innerHTML = `
                        <div class="message-content">
                            <strong>${lobby.name}</strong> (${lobby.code})<br>
                            Players: ${lobby.current_players}/${lobby.max_players}<br>
                            Status: ${lobby.status}
                        </div>
                    `
          lobbyList.appendChild(lobbyElement)
        })
      } else {
        lobbyList.innerHTML = '<div class="message system"><div class="message-content">No lobbies found</div></div>'
      }

      addMessage(`✅ Found ${data.lobbies ? data.lobbies.length : 0} lobbies`, "incoming")
    } else {
      addMessage(`❌ Error fetching lobbies: ${data.detail || "Unknown error"}`, "error")
    }
  } catch (error) {
    addMessage(`❌ Network error: ${error.message}`, "error")
  }
}

function refreshLobbies() {
  listLobbies()
}

function quickJoinLobby() {
  // Auto-join first available lobby
  addMessage("🎯 Quick joining first available lobby...", "system")
  // Implementation would depend on lobby list data
}

// WebSocket Functions
function connectWebSocket() {
  const serverUrl = document.getElementById("serverUrl").value
  const lobbyCode = document.getElementById("lobbyCode").value
  const username = document.getElementById("username").value
  const userToken = document.getElementById("userToken").value
  const role = document.getElementById("role").value

  if (!lobbyCode || !username || !userToken) {
    alert("Please fill in all required fields")
    return
  }

  // Handle both WebSocket endpoint formats
  let wsUrl
  if (serverUrl.includes("/ws/connect/")) {
    const wsBase = serverUrl.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "")
    wsUrl = `wss://${wsBase}?lobby_code=${lobbyCode}&user_token=${userToken}&username=${username}&role=${role}`
  } else {
    wsUrl = `${serverUrl}?lobby_code=${lobbyCode}&username=${username}&user_token=${userToken}&role=${role}`
  }

  addMessage(`🔄 Connecting to: ${wsUrl}`, "outgoing")

  ws = new WebSocket(wsUrl)

  ws.onopen = (event) => {
    isConnected = true
    updateConnectionStatus(true)
    addMessage("✅ WebSocket connected successfully!", "incoming")
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)

      // Handle different message formats
      if (data.event === "chat_message") {
        addMessage(`[${data.sender_username}] ${data.message}`, "incoming")
      } else if (data.event === "user_connected" || data.event === "user_disconnected") {
        addMessage(
          `[LOBBY EVENT: ${data.event}] User: ${data.username}, Role: ${data.role}. Connected: ${JSON.stringify(data.connected_players)}`,
          "system",
        )
      } else if (data.event === "player_verified") {
        addMessage(
          `[VERIFICATION] ${data.data.verified_username} verified via ${data.data.verification_method || "image"}. Total verified: ${data.data.total_verified}/${data.data.total_players}`,
          "system",
        )
        updateVerificationStatus(data.data)
      } else if (data.event === "face_detection_update") {
        handleFaceDetectionUpdate(data.data)
      } else if (data.event === "face_detection_settings_update") {
        handleFaceDetectionSettingsUpdate(data.data)
      } else if (data.type === "private_message") {
        handlePrivateMessage(data.message_type, data.message)
      } else if (data.type === "system") {
        addMessage(`[SYSTEM] ${data.message}`, "system")
      } else {
        addMessage(`📨 Received: ${JSON.stringify(data, null, 2)}`, "incoming")
      }
    } catch (e) {
      addMessage(`📨 Received: ${event.data}`, "incoming")
    }
  }

  ws.onclose = (event) => {
    isConnected = false
    updateConnectionStatus(false)
    addMessage(`❌ WebSocket closed. Code: ${event.code}, Reason: ${event.reason || "N/A"}`, "error")
  }

  ws.onerror = (error) => {
    addMessage(`❌ WebSocket error: ${error}`, "error")
  }
}

function disconnectWebSocket() {
  if (ws) {
    ws.close()
    ws = null
  }
}

function testConnection() {
  const serverUrl = document.getElementById("serverUrl").value
  addMessage(`🔍 Testing connection to: ${serverUrl}`, "system")

  // Simple connection test
  const testWs = new WebSocket(serverUrl.replace(/\?.*/, ""))

  testWs.onopen = () => {
    addMessage("✅ Connection test successful!", "incoming")
    testWs.close()
  }

  testWs.onerror = () => {
    addMessage("❌ Connection test failed!", "error")
  }
}

function saveConnectionSettings() {
  const settings = {
    reconnectAttempts: document.getElementById("reconnectAttempts").value,
    heartbeatInterval: document.getElementById("heartbeatInterval").value,
    connectionTimeout: document.getElementById("connectionTimeout").value,
  }

  localStorage.setItem("krackleConnectionSettings", JSON.stringify(settings))
  addMessage("💾 Connection settings saved", "system")
}

// Message Functions
function sendMessage(type, payload = {}) {
  if (!isConnected || !ws) {
    alert("WebSocket is not connected")
    return
  }

  const message = {
    type: type,
    payload: payload,
  }

  ws.send(JSON.stringify(message))
  addMessage(`📤 Sent: ${JSON.stringify(message, null, 2)}`, "outgoing")
}

function sendChatMessage() {
  const message = document.getElementById("chatMessage").value
  if (!message.trim()) {
    alert("Please enter a message")
    return
  }

  sendMessage("chat_message", { text: message })
  document.getElementById("chatMessage").value = ""
}

function leaveLobby() {
  if (confirm("Are you sure you want to leave the lobby?")) {
    sendMessage("leave_lobby")
  }
}

// Admin Functions
function kickPlayer() {
  const username = document.getElementById("targetUsername").value
  const reason = document.getElementById("kickReason").value

  if (!username) {
    alert("Please enter a username to kick")
    return
  }

  sendMessage("kick_player", {
    username: username,
    reason: reason || "No reason provided",
  })
}

function mutePlayer() {
  const username = document.getElementById("targetUsername").value

  if (!username) {
    alert("Please enter a username to mute")
    return
  }

  sendMessage("mute_player", { username: username })
}

function unmutePlayer() {
  const username = document.getElementById("targetUsername").value

  if (!username) {
    alert("Please enter a username to unmute")
    return
  }

  sendMessage("unmute_player", { username: username })
}

function startGame() {
  if (confirm("Start the game?")) {
    sendMessage("start_game")
  }
}

function closeLobby() {
  if (confirm("Close lobby for new connections?")) {
    sendMessage("close_lobby")
  }
}

function disbandLobby() {
  if (confirm("Disband the entire lobby? This cannot be undone!")) {
    sendMessage("disband_lobby")
  }
}

function changeSettings() {
  const maxPlayers = Number.parseInt(document.getElementById("maxPlayers").value)
  const rounds = Number.parseInt(document.getElementById("rounds").value)
  const textDisabled = document.getElementById("textDisabled").value === "true"

  const settings = {}

  if (maxPlayers >= 2 && maxPlayers <= 50) {
    settings.max_players = maxPlayers
  }

  if (rounds >= 1 && rounds <= 10) {
    settings.rounds = rounds
  }

  settings.text_disabled = textDisabled

  sendMessage("change_settings", settings)
}

// Face Detection Admin Functions
function updateFaceDetectionSettings() {
  const broadcast = document.getElementById("faceDetectionBroadcast").checked
  const frequency = Number.parseInt(document.getElementById("adminDetectionFrequency").value)
  const requiredMode = document.getElementById("requiredDetectionMode").value

  const settings = {
    enabled: true,
    broadcast_to_all: broadcast,
    detection_frequency: frequency,
    required_mode: requiredMode,
  }

  sendMessage("face_detection_admin_settings", settings)
}

function getFaceDetectionStats() {
  sendMessage("get_face_detection_stats")
}

// Face Detection Response Handlers
function handlePrivateMessage(messageType, message) {
  if (messageType === "success") {
    addMessage(`✅ ${message}`, "system")
    updateFaceDetectionStatus("success", message)
  } else if (messageType === "warning") {
    addMessage(`⚠️ ${message}`, "system")
    updateFaceDetectionStatus("warning", message)
  } else if (messageType === "error") {
    addMessage(`❌ ${message}`, "error")
    updateFaceDetectionStatus("error", message)
  } else if (messageType === "face_detection_stats") {
    updateAdminFaceStats(message)
  }
}

function handleFaceDetectionUpdate(data) {
  addMessage(
    `[FACE DETECTION] ${data.username}: ${data.faces_detected} face(s) detected (${data.detection_mode}) - Status: ${data.verification_status}`,
    "system",
  )

  // Update live statistics if this is the current user
  const currentUsername = document.getElementById("username").value
  if (data.username === currentUsername) {
    updateFaceDetectionStats(data)
  }
}

function handleFaceDetectionSettingsUpdate(settings) {
  addMessage(
    `[ADMIN] Face detection settings updated - Required: ${settings.required_mode}, Frequency: ${settings.detection_frequency}s`,
    "system",
  )

  // Update frontend controls to match server settings
  if (document.getElementById("faceDetectionBroadcast")) {
    document.getElementById("faceDetectionBroadcast").checked = settings.broadcast_to_all
  }
  if (document.getElementById("adminDetectionFrequency")) {
    document.getElementById("adminDetectionFrequency").value = settings.detection_frequency
  }
  if (document.getElementById("requiredDetectionMode")) {
    document.getElementById("requiredDetectionMode").value = settings.required_mode
  }
}

function updateVerificationStatus(data) {
  const statusDiv = document.getElementById("verificationStatus")
  if (statusDiv) {
    statusDiv.innerHTML = `Verified Players: ${data.total_verified}/${data.total_players}`

    if (data.verification_method === "face_detection") {
      statusDiv.innerHTML += ` (via ${data.verification_method})`
    }
  }
}

function updateFaceDetectionStatus(type, message) {
  const statusElement = document.getElementById("faceDetectionStatus")
  if (statusElement) {
    statusElement.className = `detection-status ${type}`
    statusElement.textContent = message

    // Clear status after 3 seconds
    setTimeout(() => {
      statusElement.className = "detection-status"
      statusElement.textContent = "Ready"
    }, 3000)
  }
}

function updateFaceDetectionStats(data) {
  detectionStats.facesDetected = data.faces_detected
  detectionStats.verificationStatus = data.verification_status

  // Update UI elements
  const statsElement = document.getElementById("faceStats")
  if (statsElement) {
    statsElement.innerHTML = `
            <div>Faces Detected: ${data.faces_detected}</div>
            <div>Status: ${data.verification_status}</div>
            <div>Total Detections: ${data.total_detections}</div>
        `
  }
}

function updateAdminFaceStats(stats) {
  const statsContainer = document.getElementById("adminFaceStats")
  if (statsContainer) {
    let html = `
            <h4>Face Detection Statistics</h4>
            <p>Total Players: ${stats.total_players}</p>
            <p>Players with Detection: ${stats.players_with_detection}</p>
            <p>Verified via Face: ${stats.verified_via_face}</p>
            <p>Pending: ${stats.pending_verification}</p>
            <p>Failed: ${stats.failed_verification}</p>
            <h5>Player Details:</h5>
        `

    for (const [username, playerStats] of Object.entries(stats.player_stats)) {
      html += `
                <div class="player-stat">
                    <strong>${username}</strong>: ${playerStats.detection_count} detections, 
                    Status: ${playerStats.verification_status}
                </div>
            `
    }

    statsContainer.innerHTML = html
  }
}

// Face Detection Variables
let videoElement = null
let canvasElement = null
let canvasContext = null
let cameraStream = null
let faceDetectionInterval = null
let isDetecting = false
let modelsLoaded = false
let detectionStats = {
  facesDetected: 0,
  lastConfidence: 0,
  fps: 0,
  frameCount: 0,
  lastTime: Date.now(),
}

// Face Detection Functions
async function loadFaceDetectionModels() {
  try {
    addMessage("system", "Loading face detection models...")
    console.log("Starting to load face detection models...")

    // Always load basic face detection first
    try {
      addMessage("info", "Loading basic face detection model...")
      await faceapi.nets.tinyFaceDetector.loadFromUri("./models")

      modelsLoaded = true
      addMessage("success", "Basic face detection model loaded successfully!")
      console.log("Basic face detection model loaded successfully")

      return true
    } catch (localError) {
      console.error("Failed to load local models:", localError)
      addMessage("warning", `Failed to load local models: ${localError.message}`)
      addMessage("info", "Falling back to CDN models...")

      // Fallback to CDN for basic face detection
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(
          "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights",
        )

        modelsLoaded = true
        addMessage("success", "Basic face detection model loaded from CDN!")
        console.log("Basic face detection model loaded from CDN")

        return true
      } catch (cdnError) {
        console.error("Failed to load CDN models:", cdnError)
        addMessage("error", `Failed to load models from CDN: ${cdnError.message}`)
        return false
      }
    }
  } catch (error) {
    console.error("Unexpected error loading models:", error)
    addMessage("error", `Unexpected error: ${error.message}`)
    return false
  }
}

// Load emotion detection models separately when needed
async function loadEmotionModels() {
  try {
    addMessage("info", "Loading emotion detection models...")

    try {
      await faceapi.nets.faceExpressionNet.loadFromUri("./models")
      addMessage("success", "Emotion detection models loaded from local directory!")
      return true
    } catch (localError) {
      console.warn("Failed to load local emotion models:", localError)

      try {
        await faceapi.nets.faceExpressionNet.loadFromUri(
          "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights",
        )
        addMessage("success", "Emotion detection models loaded from CDN!")
        return true
      } catch (cdnError) {
        addMessage("error", "Failed to load emotion detection models")
        return false
      }
    }
  } catch (error) {
    addMessage("error", `Error loading emotion models: ${error.message}`)
    return false
  }
}

async function getCameraDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter((device) => device.kind === "videoinput")

    const cameraSelect = document.getElementById("cameraSelect")
    cameraSelect.innerHTML = ""

    if (videoDevices.length === 0) {
      cameraSelect.innerHTML = '<option value="">No cameras found</option>'
      return
    }

    videoDevices.forEach((device, index) => {
      const option = document.createElement("option")
      option.value = device.deviceId
      option.textContent = device.label || `Camera ${index + 1}`
      cameraSelect.appendChild(option)
    })

    addMessage("info", `Found ${videoDevices.length} camera(s)`)
  } catch (error) {
    addMessage("error", `Failed to get camera devices: ${error.message}`)
  }
}

async function startCamera() {
  try {
    addMessage("info", "Starting camera...")

    const cameraSelect = document.getElementById("cameraSelect")
    const selectedCamera = cameraSelect.value

    addMessage("info", `Selected camera: ${selectedCamera || "default"}`)

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
      },
    }

    if (selectedCamera) {
      constraints.video.deviceId = { exact: selectedCamera }
    }

    addMessage("info", "Requesting camera access...")
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints)
    addMessage("success", "Camera stream obtained!")

    videoElement = document.getElementById("videoElement")
    canvasElement = document.getElementById("canvasElement")

    if (!videoElement || !canvasElement) {
      throw new Error("Video or canvas element not found")
    }

    canvasContext = canvasElement.getContext("2d")

    videoElement.srcObject = cameraStream

    // Always show video first - prioritize video display
    videoElement.style.display = "block"
    canvasElement.style.display = "none"

    videoElement.onloadedmetadata = () => {
      addMessage("info", "Video metadata loaded, starting playback...")
      videoElement
        .play()
        .then(() => {
          addMessage("success", "Video playback started!")

          // Set canvas dimensions to match video
          canvasElement.width = videoElement.videoWidth || 640
          canvasElement.height = videoElement.videoHeight || 480

          updateCameraControls(true)
          updateCameraStatus("Recording - Video Mode", true)
          addMessage("success", "Camera started successfully in video mode")

          // Load basic face detection models in background (non-blocking)
          if (!modelsLoaded) {
            loadFaceDetectionModels().catch((err) => {
              addMessage("warning", "Face detection models failed to load, camera will work in video-only mode")
            })
          }
        })
        .catch((playError) => {
          addMessage("error", `Failed to start video playback: ${playError.message}`)
        })
    }
  } catch (error) {
    addMessage("error", `Failed to start camera: ${error.message}`)
    console.error("Camera start error:", error)
    updateCameraControls(false)
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop())
    cameraStream = null
  }

  // Stop face detection
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval)
    faceDetectionInterval = null
  }

  isDetecting = false

  if (videoElement) {
    videoElement.srcObject = null
  }

  if (canvasContext) {
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
  }

  // Switch back to video view
  toggleToVideoView()

  updateCameraControls(false)
  updateCameraStatus("Camera stopped", false)

  // Reset detection status
  document.getElementById("faceDetectionStatus").textContent = "Ready"
  document.getElementById("faceDetectionStatus").className = "detection-status"

  addMessage("info", "Camera and face detection stopped")
}

// Toggle between video and canvas display
function toggleCameraDisplay() {
  const videoElement = document.getElementById("videoElement")
  const canvasElement = document.getElementById("canvasElement")

  if (videoElement.style.display === "none") {
    // Show video, hide canvas
    videoElement.style.display = "block"
    canvasElement.style.display = "none"
    addMessage("info", "Switched to video view")
  } else {
    // Show canvas, hide video
    videoElement.style.display = "none"
    canvasElement.style.display = "block"
    addMessage("info", "Switched to canvas view (with face detection overlay)")
  }
}

function toggleToCanvasView() {
  const cameraContainer = document.querySelector(".camera-container")
  const videoElement = document.getElementById("videoElement")
  const canvasElement = document.getElementById("canvasElement")

  cameraContainer.classList.add("face-detection-active")
  videoElement.style.display = "none"
  canvasElement.style.display = "block"
  addMessage("info", "Switched to canvas view (with face detection overlay)")
}

function toggleToVideoView() {
  const cameraContainer = document.querySelector(".camera-container")
  const videoElement = document.getElementById("videoElement")
  const canvasElement = document.getElementById("canvasElement")

  cameraContainer.classList.remove("face-detection-active")
  videoElement.style.display = "block"
  canvasElement.style.display = "none"
  addMessage("info", "Switched to video view")
}

// Enhanced start face detection with proper canvas drawing
function startFaceDetection() {
  if (isDetecting) return

  if (!modelsLoaded) {
    addMessage("warning", "Basic face detection models not loaded yet")
    loadFaceDetectionModels().then(() => {
      if (modelsLoaded) {
        setTimeout(() => startFaceDetection(), 500)
      }
    })
    return
  }

  if (!videoElement || !canvasElement) {
    addMessage("error", "Video or canvas element not available")
    return
  }

  // Wait for video to be ready
  if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    addMessage("info", "Waiting for video to load...")
    setTimeout(() => startFaceDetection(), 500)
    return
  }

  // Ensure canvas is properly set up
  if (!canvasContext) {
    canvasContext = canvasElement.getContext("2d")
  }

  // Set canvas dimensions to match video
  canvasElement.width = videoElement.videoWidth
  canvasElement.height = videoElement.videoHeight

  // Only switch to canvas view when detection actually starts
  toggleToCanvasView()

  isDetecting = true
  const frequency = Number.parseInt(document.getElementById("sendDataFrequency").value) || 1000

  addMessage(
    "success",
    `Starting face detection (${frequency}ms interval) - Canvas: ${canvasElement.width}x${canvasElement.height}`,
  )
  document.getElementById("faceDetectionStatus").textContent = "Detecting..."
  document.getElementById("faceDetectionStatus").className = "detection-status warning"
  updateCameraStatus("Recording - Detection Mode", true)

  // Reset detection stats
  detectionStats.frameCount = 0
  detectionStats.lastTime = Date.now()

  faceDetectionInterval = setInterval(async () => {
    await detectFaces()
  }, frequency)
}

async function detectFaces() {
  if (!isDetecting || !videoElement || videoElement.paused) return

  try {
    const detectionMode = document.getElementById("detectionMode").value
    let detections
    let emotionModelsNeeded = detectionMode === "emotion" || detectionMode === "both"

    // Configure detection options
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.3,
    })

    // Always do basic face detection first
    detections = await faceapi.detectAllFaces(videoElement, options)

    // Only try emotion detection if specifically requested and models are available
    if (emotionModelsNeeded && detections.length > 0) {
      try {
        // Check if emotion models are loaded
        if (!faceapi.nets.faceExpressionNet.params) {
          addMessage("info", "Loading emotion models for first time...")
          const emotionLoaded = await loadEmotionModels()
          if (!emotionLoaded) {
            addMessage("warning", "Emotion detection unavailable, using basic face detection")
            emotionModelsNeeded = false
          }
        }

        if (emotionModelsNeeded && faceapi.nets.faceExpressionNet.params) {
          // Re-detect with emotions
          detections = await faceapi.detectAllFaces(videoElement, options).withFaceExpressions()
        }
      } catch (emotionError) {
        console.warn("Emotion detection failed, using basic face detection:", emotionError)
        addMessage("warning", "Emotion detection failed, using basic face detection")
        // Keep the basic detections we already have
      }
    }

    // Clear canvas and redraw video frame
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
    canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

    if (detections && detections.length > 0) {
      // Create display size object
      const displaySize = { width: canvasElement.width, height: canvasElement.height }

      // Resize all detections to match canvas
      const resizedDetections = faceapi.resizeResults(detections, displaySize)

      // Draw simple face rectangles (more efficient)
      resizedDetections.forEach((detection, index) => {
        const box = detection.detection ? detection.detection.box : detection.box
        const score = detection.detection ? detection.detection.score : detection.score

        if (!box) return

        // Draw green rectangle around face
        canvasContext.strokeStyle = "#22c55e"
        canvasContext.lineWidth = 2
        canvasContext.strokeRect(box.x, box.y, box.width, box.height)

        // Draw simple confidence label
        const confidence = Math.round(score * 100)
        canvasContext.fillStyle = "#22c55e"
        canvasContext.fillRect(box.x, box.y - 20, 60, 20)
        canvasContext.fillStyle = "white"
        canvasContext.font = "12px Arial"
        canvasContext.fillText(`${confidence}%`, box.x + 5, box.y - 6)

        // Show emotion only if available and requested
        if (detection.expressions && emotionModelsNeeded) {
          const topEmotion = Object.entries(detection.expressions).reduce(
            (max, [emotion, score]) => (score > max.score ? { emotion, score } : max),
            { emotion: "none", score: 0 },
          )

          if (topEmotion.score > 0.3) {
            // Only show if confident
            canvasContext.fillStyle = "#3b82f6"
            canvasContext.fillRect(box.x, box.y + box.height, 80, 20)
            canvasContext.fillStyle = "white"
            canvasContext.fillText(topEmotion.emotion, box.x + 5, box.y + box.height + 14)
          }
        }
      })

      // Find largest face for statistics
      const largestFace = detections.reduce((max, current) => {
        const currentBox = current.detection ? current.detection.box : current.box
        const maxBox = max.detection ? max.detection.box : max.box

        if (!currentBox || !maxBox) return max

        const currentArea = currentBox.width * currentBox.height
        const maxArea = maxBox.width * maxBox.height
        return currentArea > maxArea ? current : max
      })

      // Update stats with largest face
      if (largestFace) {
        const largestFaceScore = largestFace.detection ? largestFace.detection.score : largestFace.score
        const expressions = largestFace.expressions || null
        updateDetectionStats(detections.length, largestFaceScore, expressions)

        // Send data to backend if enabled
        if (document.getElementById("sendToBackend").checked) {
          sendFaceDataToBackend(largestFace, detectionMode)
        }
      } else {
        updateDetectionStats(0, 0)
      }

      // Update detection status
      document.getElementById("faceDetectionStatus").textContent = `${detections.length} face(s) detected`
      document.getElementById("faceDetectionStatus").className = "detection-status success"
    } else {
      updateDetectionStats(0, 0)

      // Update detection status
      document.getElementById("faceDetectionStatus").textContent = "No faces detected"
      document.getElementById("faceDetectionStatus").className = "detection-status warning"

      // Send "no face detected" data to backend if enabled
      if (document.getElementById("sendToBackend").checked) {
        sendFaceDataToBackend(null, detectionMode)
      }
    }
  } catch (error) {
    console.error("Face detection error:", error)
    addMessage("error", `Face detection error: ${error.message}`)
    document.getElementById("faceDetectionStatus").textContent = "Detection error"
    document.getElementById("faceDetectionStatus").className = "detection-status error"
  }
}

function updateDetectionStats(faceCount, confidence, expressions = null) {
  detectionStats.frameCount++
  detectionStats.facesDetected = faceCount
  detectionStats.lastConfidence = confidence

  // Calculate FPS
  const now = Date.now()
  if (now - detectionStats.lastTime >= 1000) {
    detectionStats.fps = detectionStats.frameCount
    detectionStats.frameCount = 0
    detectionStats.lastTime = now
  }

  // Update UI with better formatting
  document.getElementById("facesDetected").value = faceCount
  document.getElementById("faceConfidence").value = `${(confidence * 100).toFixed(1)}%`
  document.getElementById("detectionFPS").value = `${detectionStats.fps} fps`

  if (expressions) {
    const topEmotion = Object.entries(expressions).reduce(
      (max, [emotion, score]) => (score > max.score ? { emotion, score } : max),
      { emotion: "none", score: 0 },
    )
    document.getElementById("currentEmotion").value = `${topEmotion.emotion} (${(topEmotion.score * 100).toFixed(1)}%)`
  } else {
    document.getElementById("currentEmotion").value = "None detected"
  }

  // Update face stats display
  const faceStatsDiv = document.getElementById("faceStats")
  if (faceStatsDiv) {
    faceStatsDiv.innerHTML = `
            <div><strong>Live Stats:</strong></div>
            <div>Faces: ${faceCount}</div>
            <div>Confidence: ${(confidence * 100).toFixed(1)}%</div>
            <div>FPS: ${detectionStats.fps}</div>
            <div>Total Frames: ${detectionStats.frameCount + detectionStats.fps * Math.floor((now - detectionStats.lastTime) / 1000)}</div>
        `
  }
}

function sendFaceDataToBackend(faceData, mode) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  // Prepare face detection data in the format expected by backend
  const detectionData = {
    faces_detected: faceData ? 1 : 0,
    timestamp: Date.now(),
  }

  if (faceData) {
    // Handle both possible face data structures
    const box = faceData.detection ? faceData.detection.box : faceData.box
    const score = faceData.detection ? faceData.detection.score : faceData.score

    if (box) {
      detectionData.face_box = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      }
    }

    if (score !== undefined) {
      detectionData.detection_score = score
    }

    if (faceData.expressions && mode === "emotion") {
      detectionData.expressions = faceData.expressions
    }
  }

  const message = {
    type: "face_detection_data",
    payload: {
      face_data: detectionData,
      detection_mode: mode,
    },
  }

  ws.send(JSON.stringify(message))
}

async function detectAndSendFace() {
  if (!videoElement || videoElement.paused) {
    addMessage("error", "Video not ready")
    return
  }

  try {
    addMessage("info", "Starting face detection for image capture...")

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.3,
    })

    // Detect faces to get current face box
    const detections = await faceapi.detectAllFaces(videoElement, options)

    addMessage("info", `Found ${detections.length} face(s)`)

    if (detections.length === 0) {
      addMessage("warning", "No face detected for image capture")
      return
    }

    if (detections.length > 1) {
      addMessage("warning", "Multiple faces detected. Please ensure only one person is visible.")
      return
    }

    // Get the face
    const detection = detections[0]
    // Handle both possible face data structures
    const box = detection.detection ? detection.detection.box : detection.box

    if (!box) {
      addMessage("error", "Could not get face bounding box")
      console.log("Detection object:", detection)
      return
    }

    addMessage(
      "info",
      `Face detected at: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`,
    )

    // Create a temporary canvas to crop the face
    const tempCanvas = document.createElement("canvas")
    const tempContext = tempCanvas.getContext("2d")

    // Add some padding around the face (10% on each side)
    const padding = 0.1
    const paddedWidth = box.width * (1 + padding * 2)
    const paddedHeight = box.height * (1 + padding * 2)
    const paddedX = Math.max(0, box.x - box.width * padding)
    const paddedY = Math.max(0, box.y - box.height * padding)

    // Ensure we don't go outside video bounds
    const cropX = Math.max(0, paddedX)
    const cropY = Math.max(0, paddedY)
    const cropWidth = Math.min(paddedWidth, videoElement.videoWidth - cropX)
    const cropHeight = Math.min(paddedHeight, videoElement.videoHeight - cropY)

    addMessage(
      "info",
      `Cropping area: ${Math.round(cropWidth)}x${Math.round(cropHeight)} at (${Math.round(cropX)}, ${Math.round(cropY)})`,
    )

    // Set canvas size to the cropped area
    tempCanvas.width = cropWidth
    tempCanvas.height = cropHeight

    // Draw the cropped face area from the video
    tempContext.drawImage(
      videoElement,
      cropX,
      cropY,
      cropWidth,
      cropHeight, // Source rectangle
      0,
      0,
      cropWidth,
      cropHeight, // Destination rectangle
    )

    // Convert to base64
    const imageDataUrl = tempCanvas.toDataURL("image/jpeg", 0.8)
    const base64Data = imageDataUrl.split(",")[1] // Remove data:image/jpeg;base64, prefix

    addMessage("info", `Image data size: ${Math.round(base64Data.length / 1024)}KB`)

    // Send to backend via WebSocket
    const message = {
      type: "upload_image",
      payload: {
        image_data: base64Data,
      },
    }

    addMessage("info", "Sending image to backend...")
    ws.send(JSON.stringify(message))
    addMessage(
      "success",
      `Face image sent to backend (${Math.round(cropWidth)}x${Math.round(cropHeight)}px, ${Math.round(base64Data.length / 1024)}KB)`,
    )

    // Optional: Show preview of what was sent
    const previewImg = document.createElement("img")
    previewImg.src = imageDataUrl
    previewImg.style.maxWidth = "200px"
    previewImg.style.border = "2px solid green"
    previewImg.title = "Sent to backend"

    // You can uncomment this to see a preview of the sent image
    // document.body.appendChild(previewImg)
  } catch (error) {
    console.error("Face crop and send error:", error)
    addMessage("error", `Failed to crop and send face: ${error.message}`)
  }
}

function captureFrame() {
  if (!canvasElement) {
    addMessage("error", "No camera feed available to capture")
    return
  }

  // Create a temporary canvas to capture the current frame
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = canvasElement.width
  tempCanvas.height = canvasElement.height
  const tempContext = tempCanvas.getContext("2d")
  tempContext.drawImage(canvasElement, 0, 0)

  // Convert to blob and download
  tempCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `face_capture_${new Date().toISOString().replace(/[:.]/g, "-")}.png`
    a.click()
    URL.revokeObjectURL(url)
    addMessage("success", "Frame captured and downloaded")
  })
}

function sendFaceImage() {
  console.log("=== SEND FACE IMAGE STARTED ===")

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    const msg = "WebSocket not connected"
    console.error(msg)
    addMessage(msg, "error")
    return
  }
  console.log("✓ WebSocket is connected")

  if (!videoElement || videoElement.paused) {
    const msg = "Camera not active"
    console.error(msg)
    addMessage(msg, "error")
    return
  }
  console.log("✓ Camera is active")

  // Check if face detection models are loaded
  if (!modelsLoaded) {
    const msg = "Face detection models not loaded. Please start face detection first."
    console.error(msg)
    addMessage(msg, "error")
    return
  }
  console.log("✓ Face detection models loaded")

  console.log("Starting face detection and capture...")
  addMessage("Detecting and capturing face...", "info")

  // Perform face detection and send image
  detectAndSendFace()
}

function updateCameraControls(isActive) {
  const startBtn = document.getElementById("startCameraBtn")
  const stopBtn = document.getElementById("stopCameraBtn")

  startBtn.disabled = isActive
  stopBtn.disabled = !isActive
}

function updateCameraStatus(status, isRecording) {
  const statusElement = document.querySelector(".status-text")
  const container = document.querySelector(".camera-container")

  statusElement.textContent = status

  if (isRecording) {
    container.classList.add("recording")
  } else {
    container.classList.remove("recording")
  }
}

function resetStats() {
  detectionStats = {
    facesDetected: 0,
    lastConfidence: 0,
    fps: 0,
    frameCount: 0,
    lastTime: Date.now(),
  }

  updateDetectionStats(0, 0)
  addMessage("info", "Detection statistics reset")
}

function exportDetectionData() {
  const data = {
    timestamp: new Date().toISOString(),
    stats: detectionStats,
    settings: {
      mode: document.getElementById("detectionMode").value,
      frequency: document.getElementById("sendDataFrequency").value,
      sendToBackend: document.getElementById("sendToBackend").checked,
    },
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `face_detection_data_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  a.click()
  URL.revokeObjectURL(url)

  addMessage("success", "Detection data exported")
}

// Simple camera test function for debugging
async function testCameraOnly() {
  try {
    addMessage("info", "Testing basic camera access...")

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    addMessage("success", "Camera access successful!")

    const videoElement = document.getElementById("videoElement")
    const canvasElement = document.getElementById("canvasElement")

    if (videoElement && canvasElement) {
      videoElement.srcObject = stream
      videoElement.style.display = "block"
      canvasElement.style.display = "none"

      videoElement.onloadedmetadata = () => {
        videoElement
          .play()
          .then(() => {
            addMessage("success", "Video playback started - basic camera test complete!")
            updateCameraControls(true)
            updateCameraStatus("Testing - Basic Camera", true)
          })
          .catch((err) => {
            addMessage("error", `Video play failed: ${err.message}`)
          })
      }

      // Store stream for cleanup
      cameraStream = stream
    } else {
      addMessage("error", "Video or canvas element not found")
      stream.getTracks().forEach((track) => track.stop())
    }
  } catch (error) {
    addMessage("error", `Camera test failed: ${error.message}`)
    console.error("Camera test error:", error)
  }
}

// Debug and test functions for face detection
function debugFaceDetection() {
  addMessage("system", "=== FACE DETECTION DEBUG ===")

  // Check if face-api.js is loaded
  if (typeof faceapi === "undefined") {
    addMessage("error", "face-api.js library not loaded!")
    return
  }
  addMessage("success", "face-api.js library loaded")

  // Check models
  addMessage("info", `Models loaded: ${modelsLoaded}`)
  if (faceapi.nets.tinyFaceDetector.params) {
    addMessage("success", "TinyFaceDetector model loaded")
  } else {
    addMessage("error", "TinyFaceDetector model NOT loaded")
  }

  if (faceapi.nets.faceExpressionNet.params) {
    addMessage("success", "FaceExpressionNet model loaded")
  } else {
    addMessage("warning", "FaceExpressionNet model NOT loaded")
  }

  // Check video element
  if (videoElement && videoElement.srcObject) {
    addMessage("success", `Video element ready: ${videoElement.videoWidth}x${videoElement.videoHeight}`)
  } else {
    addMessage("error", "Video element not ready")
  }

  // Check canvas element
  if (canvasElement && canvasContext) {
    addMessage("success", `Canvas element ready: ${canvasElement.width}x${canvasElement.height}`)
  } else {
    addMessage("error", "Canvas element not ready")
  }

  addMessage("info", `Detection active: ${isDetecting}`)
  addMessage("system", "=== END DEBUG ===")
}

// Debugging functions for face detection
async function debugDetectionObject() {
  if (!videoElement || videoElement.paused) {
    addMessage("warning", "Video not ready for debugging")
    return
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.3,
    })

    // Test basic detection
    console.log("Testing basic face detection...")
    const basicDetections = await faceapi.detectAllFaces(videoElement, options)
    console.log("Basic detections:", basicDetections)

    if (basicDetections.length > 0) {
      const firstDetection = basicDetections[0]
      console.log("First detection structure:", firstDetection)
      console.log("Detection properties:", Object.keys(firstDetection))

      // Check for box property
      if (firstDetection.box) {
        console.log("Direct box:", firstDetection.box)
        console.log("Box properties:", Object.keys(firstDetection.box))
      }

      // Check for detection.box property
      if (firstDetection.detection && firstDetection.detection.box) {
        console.log("Nested detection box:", firstDetection.detection.box)
        console.log("Nested box properties:", Object.keys(firstDetection.detection.box))
      }
    }

    // Test emotion detection if possible
    try {
      console.log("Testing emotion detection...")
      const emotionDetections = await faceapi.detectAllFaces(videoElement, options).withFaceExpressions()
      console.log("Emotion detections:", emotionDetections)

      if (emotionDetections.length > 0) {
        const firstEmotionDetection = emotionDetections[0]
        console.log("First emotion detection structure:", firstEmotionDetection)
        console.log("Emotion detection properties:", Object.keys(firstEmotionDetection))
      }
    } catch (emotionError) {
      console.log("Emotion detection not available:", emotionError.message)
    }

    addMessage("info", "Detection object debugging complete - check console")
  } catch (error) {
    console.error("Debug detection error:", error)
    addMessage("error", `Debug error: ${error.message}`)
  }
}

// Test single face detection with detailed logging
async function testSingleFaceDetection() {
  if (!videoElement || videoElement.paused) {
    addMessage("warning", "Video not ready for testing")
    return
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.3,
    })

    const detections = await faceapi.detectAllFaces(videoElement, options)

    console.log(`Detected ${detections.length} faces`)

    detections.forEach((detection, index) => {
      console.log(`Face ${index + 1}:`, detection)

      const box = detection.detection ? detection.detection.box : detection.box
      const score = detection.detection ? detection.detection.score : detection.score

      if (box) {
        console.log(`  Box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`)
        console.log(`  Area: ${box.width * box.height}`)
      } else {
        console.log("  No box found")
      }

      if (score !== undefined) {
        console.log(`  Score: ${score}`)
      } else {
        console.log("  No score found")
      }
    })

    addMessage("info", `Single detection test complete - found ${detections.length} faces`)
  } catch (error) {
    console.error("Test detection error:", error)
    addMessage("error", `Test error: ${error.message}`)
  }
}

// Force reload models with verbose logging
async function forceReloadModels() {
  try {
    addMessage("info", "Force reloading face detection models...")

    // Clear any existing models
    if (window.faceapi) {
      console.log("Clearing existing models...")
    }

    await loadFaceDetectionModels()
    addMessage("success", "Models force reloaded successfully")
  } catch (error) {
    console.error("Force reload error:", error)
    addMessage("error", `Force reload failed: ${error.message}`)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  generateToken()
  addMessage("🚀 Krackle WebSocket Test Interface - Complete Edition loaded", "system")
  updateConnectionStatus(false)
  updateServerStatus(false)

  // Load saved connection settings
  const savedSettings = localStorage.getItem("krackleConnectionSettings")
  if (savedSettings) {
    const settings = JSON.parse(savedSettings)
    document.getElementById("reconnectAttempts").value = settings.reconnectAttempts || 3
    document.getElementById("heartbeatInterval").value = settings.heartbeatInterval || 30
    document.getElementById("connectionTimeout").value = settings.connectionTimeout || 10
  }

  // Get available cameras
  getCameraDevices()

  // Request camera permissions
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop())
      addMessage("info", "Camera permissions granted")
    })
    .catch((error) => {
      addMessage("warning", "Camera permissions not granted. Some features may not work.")
    })
})

// Allow Enter key to send chat messages
document.getElementById("chatMessage").addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    sendChatMessage()
  }
})

function stopFaceDetection() {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval)
    faceDetectionInterval = null
  }

  isDetecting = false

  // Always switch back to video view when stopping detection
  toggleToVideoView()

  // Reset detection status
  document.getElementById("faceDetectionStatus").textContent = "Stopped"
  document.getElementById("faceDetectionStatus").className = "detection-status"
  updateCameraStatus("Recording - Video Mode", true)

  // Clear canvas
  if (canvasContext) {
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
  }

  addMessage("info", "Face detection stopped - returned to video mode")
}

function testMessageLogging() {
  console.log("Testing message logging...")
  addMessage("Test message - info", "info")
  addMessage("Test message - success", "success")
  addMessage("Test message - warning", "warning")
  addMessage("Test message - error", "error")
  addMessage("Test message - system", "system")
  console.log("Message logging test complete")
}
