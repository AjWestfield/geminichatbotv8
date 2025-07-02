import { useEffect, useRef } from 'react'
import { useMCPServers } from '@/hooks/mcp/use-mcp-servers'
import { useMCPState } from './use-mcp-state'
import { mcpReconnectService } from '@/lib/mcp/mcp-reconnect-service'

/**
 * Hook that handles MCP initialization and auto-connection of enabled servers
 * This runs once on mount and ensures servers maintain their connection state
 * after browser refresh
 */
export function useMCPAutoConnect() {
  const { servers, connectServer, refreshServers } = useMCPServers()
  const mcpState = useMCPState()
  const hasInitialized = useRef(false)
  const isConnecting = useRef(false)

  useEffect(() => {
    if (hasInitialized.current || isConnecting.current) return
    
    async function initializeAndConnect() {
      try {
        isConnecting.current = true
        console.log('[useMCPAutoConnect] Starting MCP initialization...')
        
        // Initialize MCP server manager
        const initResponse = await fetch('/api/mcp/init')
        const initData = await initResponse.json()
        
        if (!initData.success) {
          console.error('[useMCPAutoConnect] MCP initialization failed:', initData)
          return
        }
        
        console.log('[useMCPAutoConnect] MCP initialized:', initData)
        
        // Refresh the local server list to get latest state
        await refreshServers()
        
        // Mark initialization complete
        hasInitialized.current = true
      } catch (error) {
        console.error('[useMCPAutoConnect] Error during initialization:', error)
      } finally {
        isConnecting.current = false
      }
    }
    
    initializeAndConnect()
  }, []) // Run only once on mount
  
  // Separate effect to handle auto-connection based on enabled state
  useEffect(() => {
    if (!hasInitialized.current || servers.length === 0) return
    
    async function connectEnabledServers() {
      for (const server of servers) {
        const serverState = mcpState.servers[server.id]
        const isEnabled = serverState?.enabled ?? false
        
        // If server is enabled in persisted state but not connected, connect it
        if (isEnabled && server.status === 'disconnected') {
          try {
            console.log(`[useMCPAutoConnect] Connecting enabled server: ${server.name}`)
            await connectServer(server.id)
            mcpState.setServerConnected(server.id, true)
          } catch (error) {
            console.error(`[useMCPAutoConnect] Failed to connect ${server.name}:`, error)
            mcpState.setServerConnected(server.id, false)
            
            // Schedule a reconnection attempt for critical servers like Zapier
            if (server.id === 'zapier-mcp') {
              mcpReconnectService.scheduleReconnect(
                server.id,
                server.name,
                async () => {
                  await connectServer(server.id)
                  mcpState.setServerConnected(server.id, true)
                },
                () => {
                  // On successful reconnection
                  console.log(`[useMCPAutoConnect] ${server.name} reconnected successfully`)
                },
                (err) => {
                  // On final failure
                  console.error(`[useMCPAutoConnect] ${server.name} reconnection failed permanently:`, err)
                  mcpState.setServerConnected(server.id, false)
                }
              )
            }
          }
        } else if (isEnabled && server.status === 'connected') {
          // Update the connected state to match actual status
          mcpState.setServerConnected(server.id, true)
        } else if (!isEnabled && server.status === 'connected') {
          // Server is connected but not enabled in state - update state
          mcpState.setServerConnected(server.id, true)
        }
      }
    }
    
    connectEnabledServers()
  }, [servers, hasInitialized.current]) // Re-run when servers list updates
  
  // Cleanup reconnection timers on unmount
  useEffect(() => {
    return () => {
      mcpReconnectService.clearAll()
    }
  }, [])
  
  return {
    isInitialized: hasInitialized.current,
    servers
  }
}