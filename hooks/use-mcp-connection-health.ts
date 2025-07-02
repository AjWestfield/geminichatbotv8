import { useEffect, useRef } from 'react'
import { useMCPServers } from '@/hooks/mcp/use-mcp-servers'
import { useMCPState } from './use-mcp-state'

/**
 * Hook that monitors MCP server connection health
 * Periodically checks if connected servers are still responsive
 */
export function useMCPConnectionHealth(checkInterval = 30000) { // 30 seconds default
  const { servers, connectServer } = useMCPServers()
  const mcpState = useMCPState()
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const checkConnectionHealth = async () => {
      for (const server of servers) {
        const serverState = mcpState.servers[server.id]
        const isEnabled = serverState?.enabled ?? false
        
        // Only check enabled servers that think they're connected
        if (isEnabled && server.status === 'connected' && serverState?.connected) {
          try {
            // Try to fetch tools to verify connection is alive
            const response = await fetch(`/api/mcp/servers/${server.id}/tools`)
            
            if (!response.ok) {
              throw new Error('Connection check failed')
            }
          } catch (error) {
            console.warn(`[MCPConnectionHealth] Server ${server.name} is unresponsive, attempting reconnection...`)
            
            // Mark as disconnected
            mcpState.setServerConnected(server.id, false)
            
            // Try to reconnect
            try {
              await connectServer(server.id)
              mcpState.setServerConnected(server.id, true)
              console.log(`[MCPConnectionHealth] Successfully reconnected ${server.name}`)
            } catch (reconnectError) {
              console.error(`[MCPConnectionHealth] Failed to reconnect ${server.name}:`, reconnectError)
            }
          }
        }
      }
    }
    
    // Start health checks
    intervalRef.current = setInterval(checkConnectionHealth, checkInterval)
    
    // Run initial check after a short delay
    const initialTimer = setTimeout(checkConnectionHealth, 5000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearTimeout(initialTimer)
    }
  }, [servers, connectServer, mcpState, checkInterval])
  
  return null
}