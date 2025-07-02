# Content Library with Zapier MCP Setup Guide

## Overview
The Content Library tab has been successfully added to your Canvas view. This feature allows you to:
- Upload and organize content (images, videos, audio)
- Publish content to multiple platforms with one click
- Track publishing history across platforms
- Use AI to manage your content library

## Setup Instructions

### 1. Database Setup
Run the following SQL script in your Supabase SQL editor:
```sql
-- Execute the content-library-schema.sql file
```

### 2. Zapier MCP Configuration
1. Get your Zapier MCP credentials from https://zapier.com/mcp
2. Add the following to your `.env.local` file:
```env
ZAPIER_MCP_SERVER_URL=your_zapier_mcp_server_url
ZAPIER_MCP_API_KEY=your_zapier_mcp_api_key
```

### 3. Platform Authentication
To publish to platforms, you'll need to connect your accounts through Zapier:
1. Visit your Zapier dashboard
2. Connect the platforms you want to publish to:
   - Instagram
   - YouTube
   - Facebook
   - TikTok
   - X (Twitter)
   - LinkedIn

## Usage

### Uploading Content
1. Navigate to the Canvas view
2. Click on the "Library" tab
3. Drag and drop files or click to browse
4. Supported formats:
   - Images: JPG, PNG, WebP, HEIC, AVIF
   - Videos: MP4, MOV, AVI, WebM
   - Audio: MP3, WAV, M4A

### Publishing Content
1. Click on any content item in your library
2. Select the platforms you want to publish to
3. Customize captions, titles, and hashtags for each platform
4. Click "Publish" to send to all selected platforms

### AI Integration
The AI agent can now:
- Upload content to your library
- List content in your library
- Publish content to platforms
- Analyze content and suggest optimal posting times

## Features Implemented

✅ **Database Schema**: Complete content library schema with publishing history
✅ **Zapier MCP Integration**: Full configuration for multi-platform publishing
✅ **UI Components**:
   - ContentLibraryTab: Main library interface
   - ContentLibraryGallery: Grid view of content
   - ContentUploadZone: Drag & drop upload
   - ContentPublishModal: Platform selection and publishing
✅ **API Endpoints**:
   - `/api/content-library/upload`: Handle file uploads
   - `/api/content-library/list`: Fetch content items
   - `/api/content-library/[id]`: Get/delete individual items
   - `/api/content-library/publish`: Publish to platforms
✅ **Canvas Integration**: Library tab added to Canvas view

## Platform-Specific Limits

### Instagram
- Images: Max 30MB (JPG, PNG)
- Videos: Max 100MB, 60 seconds for feed posts
- Aspect ratios: Square (1:1), Portrait (4:5), Landscape (1.91:1)

### YouTube
- Videos: Max 128GB, 12 hours
- Thumbnails: Max 2MB (JPG, PNG, GIF)

### Facebook
- Images: Max 10MB
- Videos: Max 4GB, 240 minutes

### TikTok
- Videos: Max 287.6MB, 3-600 seconds
- Vertical format recommended (9:16)

### X (Twitter)
- Images: Max 5MB
- Videos: Max 512MB, 140 seconds
- Text: Max 280 characters

### LinkedIn
- Various content types supported
- Professional content recommended

## Troubleshooting

### Zapier MCP Not Connected
- Ensure environment variables are set correctly
- Check your Zapier MCP dashboard for connection status
- Verify API key is valid

### Upload Failures
- Check file size limits
- Ensure file format is supported
- Verify blob storage is configured (optional)

### Publishing Errors
- Confirm platform accounts are connected in Zapier
- Check platform-specific requirements
- Review error messages in the progress tab

## Next Steps

1. **Test the Integration**: Upload a test image and try publishing to one platform
2. **Connect All Platforms**: Set up all your social media accounts in Zapier
3. **Customize Settings**: Adjust platform-specific settings in the publish modal
4. **Use AI Features**: Try asking the AI to manage your content library

The Content Library is now fully integrated and ready to use!