"use client"

import { useRef, Suspense, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"
import { useMediaQuery } from "@/hooks/use-media-query"

// Create animated gradient texture function with the specific colors
function createGradientTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext("2d")

  const texture = new THREE.CanvasTexture(canvas)

  // Define the specific colors from the CSS
  const colors = [
    { r: 72, g: 52, b: 212 }, // #4834d4 - Darker purple
    { r: 104, g: 109, b: 224 }, // #686de0 - Bright purple-blue
    { r: 190, g: 46, b: 221 }, // #be2edd - Vibrant pink-purple
    { r: 255, g: 71, b: 87 }, // #ff4757 - Red
  ]

  // Animation function for changing gradient
  const animate = () => {
    const time = Date.now() * 0.001

    // Create the animated gradient effect similar to CSS animation
    const progress = (Math.sin(time * 0.785) + 1) / 2 // 8s cycle = 2π/8 ≈ 0.785

    // Calculate gradient position (0% to 100% and back)
    const gradientPosition = progress * 100

    // Create diagonal gradient (-45deg equivalent)
    const gradient = context.createLinearGradient(0, canvas.height, canvas.width, 0)

    // Animate through the color stops based on position
    const offset = gradientPosition / 100

    // Create multiple color stops to simulate the 300% background-size effect
    for (let i = 0; i < 3; i++) {
      const baseOffset = i - 1 + offset

      colors.forEach((color, colorIndex) => {
        const stopPosition = Math.max(0, Math.min(1, baseOffset + colorIndex * 0.25))
        if (stopPosition >= 0 && stopPosition <= 1) {
          gradient.addColorStop(stopPosition, `rgb(${color.r}, ${color.g}, ${color.b})`)
        }
      })
    }

    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)

    texture.needsUpdate = true
    requestAnimationFrame(animate)
  }

  animate()
  return texture
}

// Create simple logo textures
function createLogoTexture(platform) {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext("2d")

  const texture = new THREE.CanvasTexture(canvas)

  // Platform configurations
  const platforms = {
    youtube: {
      bgColor: "#FF0000",
      logoColor: "#FFFFFF",
    },
    instagram: {
      bgColor: "#E4405F",
      logoColor: "#FFFFFF",
    },
    tiktok: {
      bgColor: "#000000",
      logoColor: "#FFFFFF",
    },
  }

  const config = platforms[platform]

  // Draw background
  ctx.fillStyle = config.bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw logo based on platform
  ctx.fillStyle = config.logoColor
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  if (platform === "youtube") {
    // YouTube play button
    ctx.beginPath()
    ctx.moveTo(canvas.width * 0.35, canvas.height * 0.3)
    ctx.lineTo(canvas.width * 0.7, canvas.height * 0.5)
    ctx.lineTo(canvas.width * 0.35, canvas.height * 0.7)
    ctx.closePath()
    ctx.fill()

    // YouTube text
    ctx.font = "bold 24px Arial"
    ctx.fillText("YouTube", canvas.width / 2, canvas.height * 0.85)
  } else if (platform === "instagram") {
    // Instagram camera icon
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Outer rounded square
    ctx.strokeStyle = config.logoColor
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.roundRect(centerX - 60, centerY - 60, 120, 120, 25)
    ctx.stroke()

    // Inner circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 35, 0, Math.PI * 2)
    ctx.stroke()

    // Top right dot
    ctx.beginPath()
    ctx.arc(centerX + 35, centerY - 35, 8, 0, Math.PI * 2)
    ctx.fill()

    // Instagram text
    ctx.font = "bold 20px Arial"
    ctx.fillText("Instagram", canvas.width / 2, canvas.height * 0.85)
  } else if (platform === "tiktok") {
    // Modern TikTok logo (2023 version)
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Draw the modern TikTok icon (stylized "d" shape)
    ctx.save()

    // Create the main shape
    ctx.beginPath()
    ctx.moveTo(centerX - 40, centerY - 40)
    ctx.lineTo(centerX + 10, centerY - 40)
    ctx.lineTo(centerX + 10, centerY + 40)
    ctx.lineTo(centerX - 40, centerY + 40)
    ctx.closePath()
    ctx.fill()

    // Create the cyan overlay effect (right side)
    ctx.globalCompositeOperation = "screen"
    ctx.fillStyle = "#00f2ea" // TikTok cyan
    ctx.beginPath()
    ctx.moveTo(centerX - 10, centerY - 40)
    ctx.lineTo(centerX + 40, centerY - 40)
    ctx.lineTo(centerX + 40, centerY + 40)
    ctx.lineTo(centerX - 10, centerY + 40)
    ctx.closePath()
    ctx.fill()

    // Create the red overlay effect (left side)
    ctx.fillStyle = "#ff0050" // TikTok red
    ctx.beginPath()
    ctx.moveTo(centerX - 40, centerY - 10)
    ctx.lineTo(centerX + 40, centerY - 10)
    ctx.lineTo(centerX + 40, centerY + 20)
    ctx.lineTo(centerX - 40, centerY + 20)
    ctx.closePath()
    ctx.fill()

    ctx.restore()

    // TikTok text
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 24px Arial"
    ctx.fillText("TikTok", canvas.width / 2, canvas.height * 0.85)
  }

  texture.needsUpdate = true
  return texture
}

// Logo square component
function LogoSquare({ position, rotation, scale, platform, index }) {
  const meshRef = useRef()
  const glowRef = useRef()

  // Create logo texture
  const logoTexture = useMemo(() => createLogoTexture(platform), [platform])

  // Platform glow colors
  const glowColors = {
    youtube: "#FF4444",
    instagram: "#E4405F",
    tiktok: "#00f2ea",
  }

  const size = 8 // Square size

  // Enhanced movement and animation
  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return

    const time = state.clock.elapsedTime

    // Floating movement
    meshRef.current.position.y += Math.sin(time * 1.2 + index) * 0.008
    meshRef.current.position.x += Math.cos(time * 0.8 + index) * 0.006
    meshRef.current.position.z += Math.sin(time * 0.5 + index) * 0.004

    // Rotation
    meshRef.current.rotation.y = Math.sin(time * 0.6 + index) * 0.2
    meshRef.current.rotation.x = Math.cos(time * 0.4 + index) * 0.1
    meshRef.current.rotation.z = Math.sin(time * 0.3 + index) * 0.05

    // Pulsing scale effect
    const pulseScale = 1 + Math.sin(time * 2 + index) * 0.05
    meshRef.current.scale.setScalar(pulseScale)

    // Animated glow intensity
    const glowIntensity = 0.3 + Math.sin(time * 3 + index) * 0.2
    glowRef.current.material.opacity = glowIntensity
  })

  return (
    <group position={position} rotation={rotation} scale={scale} ref={meshRef}>
      {/* Glow effect */}
      <mesh position={[0, 0, -0.1]} ref={glowRef}>
        <planeGeometry args={[size * 1.3, size * 1.3]} />
        <meshBasicMaterial color={glowColors[platform]} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Main square with logo */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={logoTexture} />
      </mesh>
    </group>
  )
}

// Scene component
function Scene() {
  const { viewport } = useThree()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Create gradient texture for background
  const gradientTexture = useMemo(() => createGradientTexture(), [])

  // Generate random positions for logo squares
  // Increased count and weighted distribution to favor YouTube
  const logoCount = isMobile ? 18 : 30
  const logos = useMemo(() => {
    const gridCols = isMobile ? 4 : 6
    const gridRows = Math.ceil(logoCount / gridCols)
    const spreadX = 90
    const spreadY = 70
    const spreadZ = 40

    return Array.from({ length: logoCount }, (_, i) => {
      const col = i % gridCols
      const row = Math.floor(i / gridCols)

      // Calculate grid position with some randomness
      const baseX = (col / (gridCols - 1) - 0.5) * spreadX
      const baseY = (row / (gridRows - 1) - 0.5) * spreadY
      const baseZ = -20 - Math.random() * spreadZ

      // Add some random offset to avoid perfect grid
      const offsetX = (Math.random() - 0.5) * 15
      const offsetY = (Math.random() - 0.5) * 15
      const offsetZ = (Math.random() - 0.5) * 10

      // Weighted platform selection - 50% YouTube, 25% Instagram, 25% TikTok
      let platform
      const rand = Math.random()
      if (rand < 0.5) {
        platform = "youtube"
      } else if (rand < 0.75) {
        platform = "instagram"
      } else {
        platform = "tiktok"
      }

      return {
        position: [baseX + offsetX, baseY + offsetY, baseZ + offsetZ],
        rotation: [Math.random() * 0.4 - 0.2, Math.random() * 0.4 - 0.2, Math.random() * 0.4 - 0.2],
        scale: 0.8 + Math.random() * 0.6,
        platform: platform,
        index: i,
      }
    })
  }, [logoCount, isMobile])

  // Enhanced camera movement
  const cameraRef = useRef()
  useFrame((state) => {
    if (!cameraRef.current) return

    const time = state.clock.elapsedTime

    // Camera movement
    cameraRef.current.position.x = Math.sin(time * 0.2) * 3
    cameraRef.current.position.y = Math.cos(time * 0.15) * 2
    cameraRef.current.position.z = 10 + Math.sin(time * 0.1) * 1

    // Look at center with slight offset
    cameraRef.current.lookAt(Math.sin(time * 0.1) * 2, Math.cos(time * 0.1) * 1, -15)
  })

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={70} ref={cameraRef} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} />
      <pointLight position={[0, 0, 5]} intensity={0.8} color="#ffffff" />

      {/* Background gradient */}
      <mesh position={[0, 0, -35]}>
        <planeGeometry args={[300, 250]} />
        <meshBasicMaterial map={gradientTexture} />
      </mesh>

      {/* Logo squares */}
      {logos.map((logo, index) => (
        <LogoSquare
          key={index}
          position={logo.position}
          rotation={logo.rotation}
          scale={logo.scale}
          platform={logo.platform}
          index={index}
        />
      ))}
    </>
  )
}

// Main component
export default function VideoBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
