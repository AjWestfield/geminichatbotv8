'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wifi, WifiOff } from 'lucide-react'

interface LiveBrowserViewEnhancedProps {
  sessionId: string | null
  onSessionChange: (id: string | null) => void
  browserAgentUrl?: string
}

export function LiveBrowserViewEnhanced({
  sessionId,
  onSessionChange,
  browserAgentUrl = 'localhost:8002'
}: LiveBrowserViewEnhancedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [fps, setFps] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // FPS calculation
  const frameCountRef = useRef(0)
  const lastFpsUpdateRef = useRef(Date.now())

  // Handle canvas click for browser interaction
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!wsRef.current || !canvasRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    
    wsRef.current.send(JSON.stringify({
      type: 'interaction',
      x: Math.round(x),
      y: Math.round(y)
    }))
  }, [])

  // Handle keyboard input
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    
    // Only capture when canvas is focused
    if (document.activeElement !== canvasRef.current) return
    
    e.preventDefault()
    
    wsRef.current.send(JSON.stringify({
      type: 'interaction',
      text: e.key
    }))
  }, [])

  // Handle mouse wheel for scrolling
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    
    e.preventDefault()
    
    wsRef.current.send(JSON.stringify({
      type: 'interaction',
      deltaY: e.deltaY
    }))
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setError(null)
      setIsConnected(false)
      return
    }
    
    setIsConnecting(true)
    setError(null)
    
    // Connect to browser stream
    const ws = new WebSocket(`ws://${browserAgentUrl}/ws/stream/${sessionId}`)
    wsRef.current = ws
    
    ws.onopen = () => {
      console.log('Browser stream connected')
      setIsConnected(true)
      setIsConnecting(false)
      setError(null)
    }
    
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'frame' && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d')
          if (!ctx) return
          
          // Create image from base64 data
          const img = new Image()
          img.onload = () => {
            // Clear and draw new frame
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
            ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height)
            
            // Update FPS counter
            frameCountRef.current++
            const now = Date.now()
            if (now - lastFpsUpdateRef.current > 1000) {
              setFps(frameCountRef.current)
              frameCountRef.current = 0
              lastFpsUpdateRef.current = now
            }
          }
          img.src = `data:image/jpeg;base64,${data.data}`
        } else if (data.type === 'status') {
          console.log('Stream status:', data.message)
        } else if (data.type === 'error') {
          setError(data.message)
          console.error('Stream error:', data.message)
        }
      } catch (err) {
        console.error('Failed to process message:', err)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setError('Connection error')
      setIsConnected(false)
      setIsConnecting(false)
    }
    
    ws.onclose = () => {
      console.log('Browser stream disconnected')
      setIsConnected(false)
      setIsConnecting(false)
    }
    
    // Cleanup
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [sessionId, browserAgentUrl])

  // Add event listeners when connected
  useEffect(() => {
    if (!isConnected || !canvasRef.current) return
    
    const canvas = canvasRef.current
    canvas.addEventListener('keypress', handleKeyPress)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      canvas.removeEventListener('keypress', handleKeyPress)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [isConnected, handleKeyPress, handleWheel])

  // Render loading state
  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/10">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">No Active Session</h3>
          <p className="text-sm text-muted-foreground">
            Start a deep research session to view the browser
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full bg-black">
      {/* Canvas for browser display */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleCanvasClick}
        tabIndex={0}
        style={{ outline: 'none' }}
      />
      
      {/* Loading overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-background p-4 rounded-lg shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Connecting to browser...</p>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Card className="p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-500 mb-2">Connection Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        </div>
      )}
      
      {/* Status bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Disconnected
            </>
          )}
        </Badge>
        {isConnected && fps > 0 && (
          <Badge variant="outline">{fps} FPS</Badge>
        )}
      </div>
      
      {/* Instructions */}
      {isConnected && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
          Click to interact • Tab to focus • Scroll with mouse wheel
        </div>
      )}
    </div>
  )
}
