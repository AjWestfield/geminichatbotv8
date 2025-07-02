/**
 * Service to handle MCP server reconnection logic
 * Ensures servers stay connected even after temporary failures
 */

interface ReconnectConfig {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
}

class MCPReconnectService {
  private static instance: MCPReconnectService | null = null
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private retryCount: Map<string, number> = new Map()
  
  private config: ReconnectConfig = {
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    backoffMultiplier: 2
  }
  
  static getInstance(): MCPReconnectService {
    if (!MCPReconnectService.instance) {
      MCPReconnectService.instance = new MCPReconnectService()
    }
    return MCPReconnectService.instance
  }
  
  /**
   * Schedule a reconnection attempt for a server
   */
  scheduleReconnect(
    serverId: string, 
    serverName: string,
    reconnectFn: () => Promise<void>,
    onSuccess?: () => void,
    onFailure?: (error: Error) => void
  ) {
    // Clear any existing timer
    this.clearReconnect(serverId)
    
    const currentRetries = this.retryCount.get(serverId) || 0
    
    if (currentRetries >= this.config.maxRetries) {
      console.error(`[MCPReconnectService] Max retries reached for ${serverName}`)
      this.retryCount.delete(serverId)
      onFailure?.(new Error('Max reconnection attempts reached'))
      return
    }
    
    // Calculate delay with exponential backoff
    const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, currentRetries)
    
    console.log(`[MCPReconnectService] Scheduling reconnect for ${serverName} in ${delay}ms (attempt ${currentRetries + 1}/${this.config.maxRetries})`)
    
    const timer = setTimeout(async () => {
      try {
        console.log(`[MCPReconnectService] Attempting to reconnect ${serverName}...`)
        await reconnectFn()
        
        // Success - reset retry count
        this.retryCount.delete(serverId)
        this.reconnectTimers.delete(serverId)
        
        console.log(`[MCPReconnectService] Successfully reconnected ${serverName}`)
        onSuccess?.()
      } catch (error) {
        console.error(`[MCPReconnectService] Failed to reconnect ${serverName}:`, error)
        
        // Increment retry count and schedule another attempt
        this.retryCount.set(serverId, currentRetries + 1)
        
        // Schedule another attempt
        this.scheduleReconnect(serverId, serverName, reconnectFn, onSuccess, onFailure)
      }
    }, delay)
    
    this.reconnectTimers.set(serverId, timer)
  }
  
  /**
   * Clear any pending reconnection for a server
   */
  clearReconnect(serverId: string) {
    const timer = this.reconnectTimers.get(serverId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(serverId)
    }
  }
  
  /**
   * Clear all pending reconnections
   */
  clearAll() {
    this.reconnectTimers.forEach(timer => clearTimeout(timer))
    this.reconnectTimers.clear()
    this.retryCount.clear()
  }
  
  /**
   * Reset retry count for a server
   */
  resetRetryCount(serverId: string) {
    this.retryCount.delete(serverId)
  }
}

export const mcpReconnectService = MCPReconnectService.getInstance()