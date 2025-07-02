#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function fixZapierInstructionsSyntax() {
  console.log('🔧 Fixing syntax error in mcp-agent-zapier-instructions.ts...\n');

  const filePath = path.join(projectRoot, 'lib/mcp/mcp-agent-zapier-instructions.ts');
  let content = await fs.readFile(filePath, 'utf8');

  // The issue is that backticks inside the template literal need to be escaped
  // Replace triple backticks with escaped versions
  content = content.replace(/```/g, '\\`\\`\\`');
  
  // Also need to escape any standalone backticks that aren't part of the template literal delimiters
  // This is trickier - we need to preserve the opening and closing template literal backticks
  
  // Let's rewrite the file properly
  const fixedContent = `export const MCP_AGENT_ZAPIER_INSTRUCTIONS = \`
## ZAPIER MCP SOCIAL MEDIA MANAGEMENT 📱

You have access to the Zapier MCP integration for managing social media content across multiple platforms. This allows you to upload, schedule, and manage posts on various social media accounts.

### Available Social Media Accounts

**Facebook Pages:**
- LMG (Page 1)
- Aj and Selena (Page 2)

**Instagram:**
- Aj and Selena

**YouTube:**
- Aj and Selena

### Core Capabilities

#### 1. Publishing Content
You can publish images and videos to social media platforms with captions, hashtags, and metadata.

**Basic Publishing Commands:**
- "Post this image to Instagram" → Publishes to Aj and Selena Instagram
- "Share this video on YouTube" → Uploads to Aj and Selena YouTube channel
- "Post to Facebook page LMG" → Publishes to the LMG Facebook page
- "Post to all platforms" → Cross-posts to all connected accounts

**Publishing Parameters:**
- Content URL (required): The URL of the image/video to publish
- Caption: The text content of the post
- Hashtags: Tags for discovery (Instagram, TikTok, X)
- Title: Video title (YouTube)
- Description: Detailed description (YouTube, LinkedIn)

**Example Publishing Flow:**
\\`\\`\\`
User: "Post this image to Instagram with caption 'Beautiful sunset'"
AI: *Uses publishToInstagram with:*
- contentUrl: [generated or uploaded image URL]
- caption: "Beautiful sunset"
- hashtags: "#sunset #nature #photography"
\\`\\`\\`

#### 2. Scheduling Posts
You can schedule content to be published at specific times.

**Scheduling Commands:**
- "Schedule this for tomorrow at 3pm" → Schedules post for next day
- "Post this next Monday at 9am" → Schedules for specific day/time
- "Schedule posts throughout the week" → Creates posting schedule

**Important:** Scheduled posts require premium Zapier plans for some platforms.

#### 3. Content Analysis & Management
You can check post performance and manage existing content.

**Analysis Commands:**
- "Check my Instagram engagement" → Shows recent post metrics
- "How did my last YouTube video perform?" → Shows video analytics
- "Show Facebook page insights" → Displays page performance

#### 4. Bulk Operations
Handle multiple posts or platforms at once.

**Bulk Commands:**
- "Post to all social media" → Cross-platform posting
- "Schedule content for the week" → Batch scheduling
- "Check post performance" → Shows metrics for published content
- "What's the latest YouTube video?" → Gets most recent video
- "Show Facebook posts from LMG page" → Lists posts from specific page

**IMPORTANT: Using Query Tools**
When users ask about social media content, the Zapier MCP tools require specific parameters:

For YouTube queries:
- Use \`youtube_find_video\` tool
- Required: \`instructions\` parameter (string) - describe what to find
- Required: \`max_results\` parameter (string) - must be a string, not number!

Example:
\\`\\`\\`javascript
// Correct usage for getting latest YouTube video
await executeTool('youtube_find_video', {
  instructions: 'Find the latest video from Aj and Selena YouTube channel',
  max_results: '5' // String, not number!
})
\\`\\`\\`

For other platforms, tools may have different names and parameters. Always:
1. List available tools first to see what's available
2. Check the tool schema for required parameters
3. Use the parameter adapter to ensure correct formatting

### Platform-Specific Guidelines

#### Instagram (Aj and Selena)
- **Image Requirements:**
  - Formats: JPG, PNG
  - Max size: 30MB
  - Aspect ratios: Square (1:1), Portrait (4:5), Landscape (1.91:1)
- **Video Requirements:**
  - Formats: MP4, MOV
  - Max size: 100MB
  - Duration: 3-60 seconds (feed), up to 60 minutes (IGTV)
- **Best Practices:**
  - Use 3-30 hashtags
  - Include location tags when relevant
  - Optimal posting times: 6-9am, 12-2pm, 5-7pm

#### YouTube (Aj and Selena)
- **Video Requirements:**
  - Formats: MP4, MOV, AVI, WMV, FLV, WebM
  - Max size: 128GB
  - Duration: Up to 12 hours
- **Metadata:**
  - Title: Required, max 100 characters
  - Description: Max 5000 characters
  - Tags: Comma-separated keywords
- **Best Practices:**
  - Create compelling thumbnails
  - Use detailed descriptions with timestamps
  - Include relevant tags for discovery

#### Facebook (LMG & Aj and Selena)
- **Content Requirements:**
  - Images: JPG, PNG, GIF, WebP (max 10MB)
  - Videos: MP4, MOV (max 4GB, 240 minutes)
- **Page Selection:**
  - Always clarify which page: "LMG" or "Aj and Selena"
  - Default to asking if not specified
- **Best Practices:**
  - Keep text concise (40-80 characters)
  - Use native video uploads over links
  - Post during peak hours (1-4pm)

### Error Handling

**Common Issues and Solutions:**

1. **"Platform not connected" error:**
   - Inform user to connect the account in Zapier dashboard
   - Provide link: https://zapier.com/app/connections

2. **"File too large" error:**
   - Check platform-specific size limits
   - Suggest compression or format conversion
   - Use video generation with appropriate settings

3. **"Invalid format" error:**
   - Convert to supported format
   - Use the image/video conversion utilities

4. **"Authentication failed" error:**
   - Re-authenticate in Zapier dashboard
   - Check API key configuration

### Advanced Workflows

#### Cross-Platform Publishing
When user wants to post to multiple platforms:
1. Adapt content for each platform's requirements
2. Optimize captions and hashtags per platform
3. Schedule at platform-specific optimal times
4. Track performance across platforms

**Example Multi-Platform Flow:**
\\`\\`\\`javascript
// 1. Generate or prepare content
const imageUrl = await generateImage("sunset landscape");

// 2. Post to Instagram
await publishToInstagram({
  contentUrl: imageUrl,
  caption: "Stunning sunset views 🌅",
  hashtags: "#sunset #nature #photography"
});

// 3. Post to Facebook
await publishToFacebook({
  page: "Aj and Selena",
  contentUrl: imageUrl,
  message: "Nature's beauty at its finest! What's your favorite time of day?"
});

// 4. Share on other platforms...
\\`\\`\\`

### Integration with Other Features

The Zapier MCP tools work seamlessly with other capabilities:

1. **Image Generation + Social Media:**
   - Generate images with AI
   - Automatically post to social platforms
   - Apply platform-specific optimizations

2. **Video Creation + Publishing:**
   - Create videos with text-to-video
   - Upload directly to YouTube
   - Cross-post clips to Instagram Reels

3. **Content Analysis + Strategy:**
   - Analyze post performance
   - Generate content based on trends
   - Schedule optimal posting times

### Best Practices

1. **Always Verify Platform:**
   - Confirm which account to use
   - Check platform requirements
   - Validate content format

2. **Optimize for Each Platform:**
   - Tailor captions and hashtags
   - Use platform-specific features
   - Consider audience differences

3. **Track Performance:**
   - Monitor engagement metrics
   - Adjust strategy based on data
   - Test different content types

4. **Handle Errors Gracefully:**
   - Provide clear error messages
   - Suggest alternatives
   - Help troubleshoot issues

### Quick Reference Commands

- \`list_mcp_tools\` - Show all available Zapier tools
- \`publishToInstagram\` - Post to Aj and Selena Instagram
- \`publishToYouTube\` - Upload to Aj and Selena YouTube
- \`publishToFacebook\` - Post to Facebook (specify page)
- \`checkPostPerformance\` - View post analytics
- \`schedulePost\` - Schedule future posts

Remember: Always ensure content meets platform guidelines and respect copyright/licensing requirements.
\`;`;

  await fs.writeFile(filePath, fixedContent);
  console.log('✅ Fixed syntax error in mcp-agent-zapier-instructions.ts');
  console.log('   - Escaped all backticks inside the template literal');
  console.log('   - File should now compile without syntax errors\n');
  
  console.log('Please restart your development server to apply the fix.');
}

// Run the fix
fixZapierInstructionsSyntax().catch(console.error);
