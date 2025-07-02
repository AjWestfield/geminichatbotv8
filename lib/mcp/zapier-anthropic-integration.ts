import Anthropic from '@anthropic-ai/sdk';

export interface ZapierMCPConfig {
  url: string;
  apiKey: string;
}

export class ZapierAnthropicIntegration {
  private anthropic: Anthropic;
  private zapierConfig: ZapierMCPConfig;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    this.zapierConfig = {
      url: process.env.ZAPIER_MCP_SERVER_URL || 'https://mcp.zapier.com/api/mcp/mcp',
      apiKey: process.env.ZAPIER_MCP_API_KEY || '',
    };
  }

  /**
   * Execute a Zapier-specific query using Anthropic's MCP integration
   */
  async executeZapierQuery(query: string): Promise<any> {
    try {
      console.log('[Zapier Anthropic] Executing query:', query);
      
      const response = await this.anthropic.beta.messages.create({
        model: 'claude-3-5-sonnet-20241022', // Using latest Claude model
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: this.zapierConfig.url,
            name: 'zapier',
            authorization_token: this.zapierConfig.apiKey,
          },
        ],
        // @ts-ignore - Beta feature
        betas: ['mcp-client-2025-04-04'],
      });

      console.log('[Zapier Anthropic] Response received');
      return response;
    } catch (error: any) {
      console.error('[Zapier Anthropic] Error:', error);
      throw new Error(`Zapier query failed: ${error.message}`);
    }
  }

  /**
   * Get latest YouTube video for a channel
   */
  async getLatestYouTubeVideo(channel: string = 'Aj and Selena'): Promise<any> {
    const query = `Using the Zapier MCP tools, find the latest video from the ${channel} YouTube channel. Use the youtube_find_video tool with appropriate parameters.`;
    return this.executeZapierQuery(query);
  }

  /**
   * Get Instagram posts
   */
  async getInstagramPosts(account: string = 'Aj and Selena', limit: number = 10): Promise<any> {
    const query = `Using the Zapier MCP tools, get the latest ${limit} posts from the ${account} Instagram account.`;
    return this.executeZapierQuery(query);
  }

  /**
   * Get Facebook posts
   */
  async getFacebookPosts(page: string, limit: number = 10): Promise<any> {
    const query = `Using the Zapier MCP tools, get the latest ${limit} posts from the ${page} Facebook page.`;
    return this.executeZapierQuery(query);
  }

  /**
   * Publish content to social media
   */
  async publishContent(platform: string, content: any): Promise<any> {
    let query = '';
    
    switch (platform.toLowerCase()) {
      case 'instagram':
        query = `Using the Zapier MCP tools, post to Instagram with image URL: ${content.imageUrl} and caption: "${content.caption}"`;
        break;
      case 'youtube':
        query = `Using the Zapier MCP tools, upload to YouTube with video URL: ${content.videoUrl}, title: "${content.title}", and description: "${content.description}"`;
        break;
      case 'facebook':
        query = `Using the Zapier MCP tools, post to Facebook page ${content.page} with content URL: ${content.contentUrl} and message: "${content.message}"`;
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    return this.executeZapierQuery(query);
  }

  /**
   * List available Zapier tools
   */
  async listAvailableTools(): Promise<any> {
    const query = 'What Zapier MCP tools do you have available? List all tools with their descriptions and required parameters.';
    return this.executeZapierQuery(query);
  }
}