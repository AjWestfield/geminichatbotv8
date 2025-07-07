import { MCPServerConfig } from './mcp-client'

/**
 * Get default MCP servers that should be automatically configured
 * These servers will be added if they don't already exist in the config
 */
export function getDefaultMCPServers(): MCPServerConfig[] {
  const defaultServers: MCPServerConfig[] = []

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
  // Add auto-enable logic here
  return false
}

/**
 * Check if a server should be auto-connected
 */
export function shouldAutoConnectServer(serverId: string): boolean {
  // Add auto-connect logic here
  return false
}