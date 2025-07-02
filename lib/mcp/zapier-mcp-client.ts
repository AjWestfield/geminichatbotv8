import { MCPServerManager } from './mcp-server-manager'
import { ZAPIER_MCP_SERVER_CONFIG, ZAPIER_MCP_TOOLS, ZAPIER_MCP_ERRORS, isZapierMCPConfigured } from './zapier-mcp-config'
import { ZapierMCPParameterAdapter } from './zapier-mcp-parameter-adapter'

export interface PublishOptions {
  contentUrl: string
  contentType: 'image' | 'video' | 'audio'
  platform: string
  caption?: string
  title?: string
  description?: string
  hashtags?: string[]
  metadata?: Record<string, any>
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  platformUrl?: string
  error?: string
  details?: any
}

export class ZapierMCPClient {
  private static instance: ZapierMCPClient | null = null
  private serverManager: MCPServerManager
  private connected: boolean = false
  private toolSchemas: Map<string, any> = new Map()

  private constructor() {
    this.serverManager = MCPServerManager.getInstance()
  }

  static getInstance(): ZapierMCPClient {
    if (!ZapierMCPClient.instance) {
      ZapierMCPClient.instance = new ZapierMCPClient()
    }
    return ZapierMCPClient.instance
  }

  async connect(): Promise<void> {
    if (!isZapierMCPConfigured()) {
      throw new Error(ZAPIER_MCP_ERRORS.NOT_CONFIGURED)
    }

    if (this.connected) {
      console.log('[ZapierMCP] Already connected')
      return
    }

    try {
      // Add Zapier MCP server if not already added
      const servers = this.serverManager.getServers()
      if (!servers.has(ZAPIER_MCP_SERVER_CONFIG.id)) {
        await this.serverManager.addServer(ZAPIER_MCP_SERVER_CONFIG)
      }

      // Connect to the server
      await this.serverManager.connectServer(ZAPIER_MCP_SERVER_CONFIG.id)
      this.connected = true
      console.log('[ZapierMCP] Connected successfully')
    } catch (error) {
      console.error('[ZapierMCP] Connection error:', error)
      throw new Error(ZAPIER_MCP_ERRORS.AUTHENTICATION_FAILED)
    }
  }

  async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect()
    }
  }

  async listAvailableActions(): Promise<any[]> {
    await this.ensureConnected()
    
    try {
      // First, try to get available tools from the server
      const tools = await this.serverManager.listTools(ZAPIER_MCP_SERVER_CONFIG.id)
      console.log('[ZapierMCP] Available tools:', tools)
      
      // Try different possible tool names for listing actions
      const possibleToolNames = [
        'list_available_actions',
        'list_actions',
        'get_actions',
        'available_actions',
        'actions'
      ]
      
      for (const toolName of possibleToolNames) {
        if (tools.some((t: any) => t.name === toolName)) {
          try {
            const result = await this.serverManager.executeTool(
              ZAPIER_MCP_SERVER_CONFIG.id,
              toolName,
              {}
            )
            return result.actions || result || []
          } catch (error) {
            console.log(`[ZapierMCP] Tool ${toolName} failed:`, error)
          }
        }
      }
      
      // If no action listing tool found, return the tools themselves
      return tools
    } catch (error) {
      console.error('[ZapierMCP] Error listing actions:', error)
      throw error
    }
  }

  async checkAuthStatus(platform: string): Promise<boolean> {
    await this.ensureConnected()
    
    try {
      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        ZAPIER_MCP_TOOLS.CHECK_AUTH_STATUS,
        { platform }
      )
      return result.authenticated || false
    } catch (error) {
      console.error('[ZapierMCP] Error checking auth status:', error)
      return false
    }
  }

  async publishToInstagram(options: PublishOptions): Promise<PublishResult> {
    await this.ensureConnected()
    
    try {
      const toolArgs = {
        image_url: options.contentUrl,
        caption: options.caption || '',
        hashtags: options.hashtags?.join(' ') || ''
      }

      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        ZAPIER_MCP_TOOLS.PUBLISH_TO_INSTAGRAM,
        toolArgs
      )

      return {
        success: true,
        platformPostId: result.post_id,
        platformUrl: result.post_url,
        details: result
      }
    } catch (error) {
      console.error('[ZapierMCP] Instagram publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to Instagram'
      }
    }
  }

  async publishToYouTube(options: PublishOptions): Promise<PublishResult> {
    await this.ensureConnected()
    
    try {
      const toolArgs = {
        video_url: options.contentUrl,
        title: options.title || 'Untitled Video',
        description: options.description || '',
        tags: options.hashtags || [],
        privacy: 'public'
      }

      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        ZAPIER_MCP_TOOLS.PUBLISH_TO_YOUTUBE,
        toolArgs
      )

      return {
        success: true,
        platformPostId: result.video_id,
        platformUrl: result.video_url,
        details: result
      }
    } catch (error) {
      console.error('[ZapierMCP] YouTube publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to YouTube'
      }
    }
  }

  async publishToFacebook(options: PublishOptions): Promise<PublishResult> {
    await this.ensureConnected()
    
    try {
      const toolArgs = {
        content_url: options.contentUrl,
        message: options.caption || '',
        content_type: options.contentType
      }

      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        ZAPIER_MCP_TOOLS.PUBLISH_TO_FACEBOOK,
        toolArgs
      )

      return {
        success: true,
        platformPostId: result.post_id,
        platformUrl: result.post_url,
        details: result
      }
    } catch (error) {
      console.error('[ZapierMCP] Facebook publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to Facebook'
      }
    }
  }

  async publishToTikTok(options: PublishOptions): Promise<PublishResult> {
    await this.ensureConnected()
    
    try {
      const toolArgs = {
        video_url: options.contentUrl,
        caption: options.caption || '',
        hashtags: options.hashtags?.join(' ') || ''
      }

      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        ZAPIER_MCP_TOOLS.PUBLISH_TO_TIKTOK,
        toolArgs
      )

      return {
        success: true,
        platformPostId: result.video_id,
        platformUrl: result.video_url,
        details: result
      }
    } catch (error) {
      console.error('[ZapierMCP] TikTok publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to TikTok'
      }
    }
  }

  async publishToX(options: PublishOptions): Promise<PublishResult> {
    await this.ensureConnected()
    
    try {
      const toolArgs = {
        text: options.caption || '',
        media_url: options.contentUrl
      }

      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        ZAPIER_MCP_TOOLS.PUBLISH_TO_X,
        toolArgs
      )

      return {
        success: true,
        platformPostId: result.tweet_id,
        platformUrl: result.tweet_url,
        details: result
      }
    } catch (error) {
      console.error('[ZapierMCP] X publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to X'
      }
    }
  }

  async publishToLinkedIn(options: PublishOptions): Promise<PublishResult> {
    await this.ensureConnected()
    
    try {
      const toolArgs = {
        content_url: options.contentUrl,
        text: options.caption || '',
        content_type: options.contentType
      }

      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        ZAPIER_MCP_TOOLS.PUBLISH_TO_LINKEDIN,
        toolArgs
      )

      return {
        success: true,
        platformPostId: result.post_id,
        platformUrl: result.post_url,
        details: result
      }
    } catch (error) {
      console.error('[ZapierMCP] LinkedIn publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to LinkedIn'
      }
    }
  }

  async publish(platform: string, options: PublishOptions): Promise<PublishResult> {
    try {
      // First check if platform-specific tool exists
      const tools = await this.getAvailableTools()
      const toolNames = tools.map((t: any) => t.name)
      
      // Try platform-specific publish tool first
      const platformToolName = `publish_to_${platform.toLowerCase()}`
      if (toolNames.includes(platformToolName)) {
        console.log(`[ZapierMCP] Using platform-specific tool: ${platformToolName}`)
        // Route to the appropriate platform-specific method
        switch (platform.toLowerCase()) {
          case 'instagram':
            return this.publishToInstagram(options)
          case 'youtube':
            return this.publishToYouTube(options)
          case 'facebook':
            return this.publishToFacebook(options)
          case 'tiktok':
            return this.publishToTikTok(options)
          case 'x':
          case 'twitter':
            return this.publishToX(options)
          case 'linkedin':
            return this.publishToLinkedIn(options)
        }
      }
      
      // Try generic publish tool
      if (toolNames.includes('publish') || toolNames.includes('post')) {
        console.log('[ZapierMCP] Using generic publish tool')
        const params = {
          platform: platform.toLowerCase(),
          content_url: options.contentUrl,
          content_type: options.contentType,
          caption: options.caption,
          title: options.title,
          description: options.description,
          hashtags: options.hashtags,
          ...options.metadata
        }
        
        const toolName = toolNames.includes('publish') ? 'publish' : 'post'
        const result = await this.executeTool(toolName, params)
        
        return {
          success: true,
          platformPostId: result.post_id || result.id,
          platformUrl: result.post_url || result.url,
          details: result
        }
      }
      
      // Try to trigger a Zap
      if (toolNames.includes('trigger_zap') || toolNames.includes('trigger')) {
        console.log('[ZapierMCP] Using trigger_zap approach')
        const params = {
          zap_name: `publish_to_${platform.toLowerCase()}`,
          data: {
            platform: platform.toLowerCase(),
            content_url: options.contentUrl,
            content_type: options.contentType,
            caption: options.caption,
            title: options.title,
            description: options.description,
            hashtags: options.hashtags,
            ...options.metadata
          }
        }
        
        const toolName = toolNames.includes('trigger_zap') ? 'trigger_zap' : 'trigger'
        const result = await this.executeTool(toolName, params)
        
        return {
          success: true,
          details: result
        }
      }
      
      // No suitable tool found
      return {
        success: false,
        error: `No suitable publishing tool found for ${platform}. Available tools: ${toolNames.join(', ')}`
      }
      
    } catch (error) {
      console.error(`[ZapierMCP] Error publishing to ${platform}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish'
      }
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return

    try {
      await this.serverManager.disconnectServer(ZAPIER_MCP_SERVER_CONFIG.id)
      this.connected = false
      console.log('[ZapierMCP] Disconnected')
    } catch (error) {
      console.error('[ZapierMCP] Disconnect error:', error)
    }
  }

  // Generic tool execution method
  async executeTool(toolName: string, params: any = {}): Promise<any> {
    await this.ensureConnected()
    
    try {
      // Get tool schema if available
      const toolSchema = this.toolSchemas.get(toolName)
      
      // Adapt parameters based on tool name and schema
      const adaptedParams = ZapierMCPParameterAdapter.adaptParameters(toolName, params, toolSchema)
      
      // Validate parameters if schema is available
      if (toolSchema) {
        const validation = ZapierMCPParameterAdapter.validateParameters(adaptedParams, toolSchema)
        if (!validation.valid) {
          console.error(`[ZapierMCP] Parameter validation failed for ${toolName}:`, validation.errors)
          throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`)
        }
      }
      
      console.log(`[ZapierMCP] Executing tool: ${toolName}`)
      console.log(`[ZapierMCP] Original params:`, params)
      console.log(`[ZapierMCP] Adapted params:`, adaptedParams)
      
      const result = await this.serverManager.executeTool(
        ZAPIER_MCP_SERVER_CONFIG.id,
        toolName,
        adaptedParams
      )
      
      console.log(`[ZapierMCP] Tool ${toolName} result:`, result)
      return result
    } catch (error) {
      console.error(`[ZapierMCP] Error executing tool ${toolName}:`, error)
      throw error
    }
  }

  // Get list of available tools
  async getAvailableTools(): Promise<any[]> {
    await this.ensureConnected()
    
    try {
      const tools = await this.serverManager.listTools(ZAPIER_MCP_SERVER_CONFIG.id)
      
      // Store tool schemas for later use
      tools.forEach(tool => {
        if (tool.inputSchema) {
          this.toolSchemas.set(tool.name, tool.inputSchema)
        }
      })
      
      console.log('[ZapierMCP] Discovered tools:', tools.map(t => t.name).join(', '))
      return tools
    } catch (error) {
      console.error('[ZapierMCP] Error getting tools:', error)
      throw error
    }
  }

  // Social Media Query Methods

  async getLatestYouTubeVideo(channel: string = 'Aj and Selena'): Promise<any> {
    await this.ensureConnected()
    
    try {
      // Try to find the appropriate tool
      const tools = await this.getAvailableTools()
      const youtubeTool = tools.find(t => 
        t.name === 'youtube_find_video' || 
        t.name.includes('youtube') && (t.name.includes('find') || t.name.includes('search'))
      )
      
      if (!youtubeTool) {
        throw new Error('No YouTube search tool found')
      }
      
      const params = {
        channel,
        query: `Latest video from ${channel}`,
        max_results: 1
      }
      
      return await this.executeTool(youtubeTool.name, params)
    } catch (error) {
      console.error('[ZapierMCP] Error getting latest YouTube video:', error)
      throw error
    }
  }

  async getInstagramPosts(account: string = 'Aj and Selena', limit: number = 10): Promise<any> {
    await this.ensureConnected()
    
    try {
      const tools = await this.getAvailableTools()
      const instagramTool = tools.find(t => 
        t.name.includes('instagram') && (t.name.includes('get') || t.name.includes('list') || t.name.includes('find'))
      )
      
      if (!instagramTool) {
        throw new Error('No Instagram query tool found')
      }
      
      const params = {
        account,
        limit,
        max_results: limit
      }
      
      return await this.executeTool(instagramTool.name, params)
    } catch (error) {
      console.error('[ZapierMCP] Error getting Instagram posts:', error)
      throw error
    }
  }

  async getFacebookPosts(page: string, limit: number = 10): Promise<any> {
    await this.ensureConnected()
    
    try {
      const tools = await this.getAvailableTools()
      const facebookTool = tools.find(t => 
        t.name.includes('facebook') && (t.name.includes('get') || t.name.includes('list') || t.name.includes('find'))
      )
      
      if (!facebookTool) {
        throw new Error('No Facebook query tool found')
      }
      
      const params = {
        page,
        limit,
        max_results: limit
      }
      
      return await this.executeTool(facebookTool.name, params)
    } catch (error) {
      console.error('[ZapierMCP] Error getting Facebook posts:', error)
      throw error
    }
  }

  async getPostAnalytics(platform: string, postId: string): Promise<any> {
    await this.ensureConnected()
    
    try {
      const tools = await this.getAvailableTools()
      const analyticsTool = tools.find(t => 
        t.name.includes(platform.toLowerCase()) && 
        (t.name.includes('analytics') || t.name.includes('metrics') || t.name.includes('stats'))
      )
      
      if (!analyticsTool) {
        throw new Error(`No analytics tool found for ${platform}`)
      }
      
      const params = {
        platform,
        postId,
        post_id: postId
      }
      
      return await this.executeTool(analyticsTool.name, params)
    } catch (error) {
      console.error(`[ZapierMCP] Error getting ${platform} analytics:`, error)
      throw error
    }
  }
}