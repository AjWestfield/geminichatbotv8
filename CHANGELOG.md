# Changelog

All notable changes to GeminiChatbot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.1.0] - 2025-07-07

### 🔧 Critical Bug Fixes

This patch release fixes several critical issues discovered after the v8.0.0 release.

### Fixed
- **UUID Validation Errors** - Fixed "invalid input syntax for type uuid" errors
  - Added `ensureChatExists()` function to convert local chat IDs to proper UUIDs
  - Updated all persistence functions to handle local chat IDs gracefully
  - Images and messages now save correctly for new chats
  
- **TikTok Download IP Blocking** - Enhanced TikTok download with better error handling
  - Added automatic yt-dlp updates before downloads
  - Added proxy support via HTTP_PROXY/HTTPS_PROXY environment variables
  - Improved error messages with actionable solutions
  - Created update script: `npm run update:yt-dlp`
  
- **Image Source Relations RLS** - Fixed Row Level Security policy violations
  - Updated RLS policies to use separate policies per operation
  - Multi-image edits now save relationships correctly

### Added
- `ensureChatExists()` function for automatic chat ID conversion
- `scripts/update-yt-dlp.js` for updating the download tool
- Proxy support for TikTok downloads
- Better error messages throughout the application

### Improved
- Enhanced error handling with user-friendly messages
- Better logging for debugging UUID conversion
- Automatic yt-dlp updates for TikTok compatibility

## [8.0.0] - 2025-07-07

### 🎉 Major Release - Stability and Performance

This release focuses on fixing critical bugs and improving the overall stability of the application.

### Added
- Comprehensive error handling for video playback
- Rate limit feedback system with 30-second cooldown
- Debug logging throughout the application
- Multiple test scripts for verification:
  - `test-video-playback-e2e.mjs` - E2E video testing
  - `test-auto-send-fix.js` - Auto-submission verification
  - `verify-video-proxy.mjs` - Video proxy testing
- New database table: `image_source_relations`
- Enhanced video proxy support for Gemini-hosted files
- User-friendly error messages for common issues

### Changed
- **Server Timeouts**: Increased from 30s to 60s for generation endpoints
- **Video Playback**: Complete rewrite of video source detection logic
- **Error Messages**: More descriptive and actionable feedback
- **MCP Configuration**: Temporarily disabled for simplicity
- **Database Schema**: Added missing tables and optimized indexes

### Fixed
- **Critical: Auto-Send Bug** - Chat no longer sends messages automatically
  - Fixed incorrect `handleSubmitRef.current?.()` usage
  - Disabled auto-analysis feature that triggered unwanted submissions
- **Critical: Video Playback** - Gemini-hosted videos now play correctly
  - Added proper URI handling in video proxy
  - Fixed FilePreviewModal source detection
  - Enhanced error states and user feedback
- **Rate Limiting** - Proper handling of API rate limits
  - Clear error messages when limits are hit
  - 30-second cooldown implementation
  - Enhanced retry logic
- **Image Generation** - Database and timeout issues
  - Added missing `image_source_relations` table
  - Fixed Row Level Security violations
  - Proper timeout handling for long operations
- **Social Media Downloads** - Improved reliability
  - Better error handling for failed downloads
  - Enhanced URL detection and processing

### Removed
- Zapier MCP integration (temporarily)
- Auto-analysis feature for uploaded files
- Various test files specific to Zapier

### Security
- All file uploads continue to be validated and sanitized
- Cookie encryption remains in place for sensitive data
- API routes maintain proper authentication

### Technical Details

#### Video Playback Fix
The video proxy now properly handles Gemini file URIs by:
1. Accepting both `url` and `uri` parameters
2. Properly detecting Gemini-hosted content
3. Streaming video with correct headers
4. Providing detailed error messages

#### Auto-Send Bug Fix
Previous implementation mistakenly called functions during checks:
```javascript
// Before (incorrect - calls the function)
if (handleSubmitRef.current?.()) { ... }

// After (correct - checks existence)
if (handleSubmitRef.current) {
  handleSubmitRef.current()
}
```

#### Database Updates
New SQL migrations ensure all required tables exist:
- `videos` - Video generation records
- `audios` - Audio files and TTS
- `social_media_cookies` - Platform authentication
- `image_source_relations` - Multi-image relationships

### Migration Guide

1. **Update Dependencies**: Run `npm install`
2. **Database Migration**: Run `npm run db:setup-all`
3. **Environment Variables**: Review `.env.example` for changes
4. **Clear Cache**: Clear browser cache to avoid conflicts

### Breaking Changes
- MCP servers are disabled by default
- Auto-analysis feature has been removed
- Some Zapier-related API routes have been removed

## [7.0.0] - 2025-06-21

### Added
- Initial v7 release from stable v6 state
- Image thumbnails in chat sidebar
- Multi-image split-screen editing
- Enhanced TTS with multi-speaker support
- Social media download integration
- MCP server support

### Known Issues (Fixed in v8)
- Video playback errors with Gemini-hosted files
- Auto-send bug in chat interface
- Rate limit handling needs improvement

## Previous Versions

For changes prior to v7, please refer to the git history or previous documentation.