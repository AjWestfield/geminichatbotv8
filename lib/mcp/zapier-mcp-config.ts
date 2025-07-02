import { MCPServerConfig } from './mcp-client'

// Zapier MCP Server Configuration
export const ZAPIER_MCP_SERVER_CONFIG: MCPServerConfig = {
  id: 'zapier-mcp',
  name: 'Zapier MCP',
  transportType: 'http',
  url: process.env.ZAPIER_MCP_SERVER_URL || '',
  apiKey: process.env.ZAPIER_MCP_API_KEY || '',
  env: {
    ZAPIER_API_KEY: process.env.ZAPIER_MCP_API_KEY || '',
    ZAPIER_MCP_API_KEY: process.env.ZAPIER_MCP_API_KEY || ''
  }
}

// Extended metadata for UI and functionality
export const ZAPIER_MCP_METADATA = {
  description: 'Connect your AI to 8,000+ apps for publishing and automation',
  icon: '⚡',
  category: 'automation',
  capabilities: [
    'publish-to-social-media',
    'send-messages',
    'create-documents',
    'manage-calendars',
    'trigger-workflows'
  ],
  supportedPlatforms: [
    'instagram',
    'youtube',
    'facebook',
    'tiktok',
    'x',
    'linkedin',
    'slack',
    'discord',
    'google-drive',
    'notion',
    'airtable',
    'trello'
  ]
}

// Helper to check if Zapier MCP is configured
export function isZapierMCPConfigured(): boolean {
  const hasUrl = !!process.env.ZAPIER_MCP_SERVER_URL
  const hasKey = !!process.env.ZAPIER_MCP_API_KEY
  
  // Log configuration status for debugging
  if (hasUrl && hasKey) {
    console.log('✅ Zapier MCP is configured with URL and API key')
  }
  
  return hasUrl && hasKey
}

// Zapier MCP Tool names mapping
export const ZAPIER_MCP_TOOLS = {
  // Social Media Publishing
  PUBLISH_TO_INSTAGRAM: 'publish_to_instagram',
  PUBLISH_TO_YOUTUBE: 'publish_to_youtube',
  PUBLISH_TO_FACEBOOK: 'publish_to_facebook',
  PUBLISH_TO_TIKTOK: 'publish_to_tiktok',
  PUBLISH_TO_X: 'publish_to_x',
  PUBLISH_TO_LINKEDIN: 'publish_to_linkedin',
  
  // Content Management
  UPLOAD_TO_DRIVE: 'upload_to_google_drive',
  CREATE_NOTION_PAGE: 'create_notion_page',
  ADD_TO_AIRTABLE: 'add_to_airtable',
  
  // Messaging
  SEND_SLACK_MESSAGE: 'send_slack_message',
  SEND_DISCORD_MESSAGE: 'send_discord_message',
  SEND_EMAIL: 'send_email',
  
  // Workflow
  TRIGGER_ZAP: 'trigger_zap',
  LIST_AVAILABLE_ACTIONS: 'list_available_actions',
  CHECK_AUTH_STATUS: 'check_auth_status'
}

// Platform-specific configuration
export const PLATFORM_CONFIGS = {
  instagram: {
    maxImageSize: 30 * 1024 * 1024, // 30MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    maxVideoDuration: 60, // seconds for feed posts
    supportedImageFormats: ['jpg', 'jpeg', 'png'],
    supportedVideoFormats: ['mp4', 'mov'],
    aspectRatios: {
      square: { width: 1080, height: 1080 },
      portrait: { width: 1080, height: 1350 },
      landscape: { width: 1080, height: 608 },
      story: { width: 1080, height: 1920 }
    }
  },
  youtube: {
    maxVideoSize: 128 * 1024 * 1024 * 1024, // 128GB
    maxVideoDuration: 12 * 60 * 60, // 12 hours in seconds
    supportedVideoFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
    thumbnailFormats: ['jpg', 'jpeg', 'png', 'gif'],
    thumbnailMaxSize: 2 * 1024 * 1024 // 2MB
  },
  facebook: {
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
    maxVideoDuration: 240 * 60, // 240 minutes in seconds
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    supportedVideoFormats: ['mp4', 'mov']
  },
  tiktok: {
    maxVideoSize: 287.6 * 1024 * 1024, // 287.6MB
    minVideoDuration: 3, // seconds
    maxVideoDuration: 10 * 60, // 10 minutes in seconds
    supportedVideoFormats: ['mp4', 'mov', 'mpeg', 'avi'],
    aspectRatios: {
      vertical: { width: 1080, height: 1920 }
    }
  },
  x: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 512 * 1024 * 1024, // 512MB
    maxVideoDuration: 140, // seconds
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    supportedVideoFormats: ['mp4', 'mov'],
    maxCharacters: 280
  }
}

// Error messages
export const ZAPIER_MCP_ERRORS = {
  NOT_CONFIGURED: 'Zapier MCP is not configured. Please add ZAPIER_MCP_SERVER_URL and ZAPIER_MCP_API_KEY to your environment variables.',
  AUTHENTICATION_FAILED: 'Failed to authenticate with Zapier MCP. Please check your API key. Visit https://mcp.zapier.com to get your unique credentials.',
  INVALID_CREDENTIALS: 'Invalid Zapier MCP credentials detected. Please visit https://mcp.zapier.com to generate your unique MCP endpoint and API key.',
  PLATFORM_NOT_CONNECTED: 'Platform account not connected. Please connect your account through Zapier.',
  FILE_TOO_LARGE: 'File size exceeds platform limits.',
  INVALID_FORMAT: 'File format not supported by this platform.',
  UPLOAD_FAILED: 'Failed to upload content to platform.',
  PUBLISH_FAILED: 'Failed to publish content.',
  NETWORK_ERROR: 'Network error while communicating with Zapier MCP.'
}