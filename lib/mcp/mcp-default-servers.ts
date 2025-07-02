import { MCPServerConfig } from './mcp-client'
import { ZAPIER_MCP_SERVER_CONFIG, isZapierMCPConfigured } from './zapier-mcp-config'

/**
 * Get default MCP servers that should be automatically configured
 * These servers will be added if they don't already exist in the config
 */
export function getDefaultMCPServers(): MCPServerConfig[] {
  const defaultServers: MCPServerConfig[] = []

  // Add Zapier MCP server if credentials are configured
  if (isZapierMCPConfigured()) {
    defaultServers.push({
      ...ZAPIER_MCP_SERVER_CONFIG,
      // Ensure these fields are set for auto-configuration
      autoConnect: true,
      autoEnable: true
    } as MCPServerConfig & { autoConnect?: boolean; autoEnable?: boolean })
  }

  // Future: Add other default servers here
  // Example:
  // if (process.env.GITHUB_TOKEN) {
  //   defaultServers.push({
  //     id: 'github-mcp',
  //     name: 'GitHub MCP',
  //     command: 'npx',
  //     args: ['-y', '@modelcontextprotocol/server-github'],
  //     env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
  //   })
  // }

  return defaultServers
}

/**
 * Check if a server should be auto-enabled
 */
export function shouldAutoEnableServer(serverId: string): boolean {
  // Zapier MCP should be auto-enabled when configured
  if (serverId === 'zapier-mcp' && isZapierMCPConfigured()) {
    return true
  }

  // Add other auto-enable logic here
  return false
}

/**
 * Check if a server should be auto-connected
 */
export function shouldAutoConnectServer(serverId: string): boolean {
  // Zapier MCP should be auto-connected when configured
  if (serverId === 'zapier-mcp' && isZapierMCPConfigured()) {
    return true
  }

  // Add other auto-connect logic here
  return false
}