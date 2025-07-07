# Social Media URL MCP Fix - July 2, 2025

## Issue Description
When users paste social media URLs (Instagram, YouTube, TikTok, etc.) in the chat interface with Claude Sonnet 4, the AI was incorrectly interpreting these as requests to publish TO social media platforms using Zapier MCP tools, rather than understanding the user wants to download/analyze content FROM those platforms.

## Root Cause
1. The Zapier MCP instructions were too broadly scoped and didn't distinguish between downloading FROM vs publishing TO social media
2. Claude's context included these instructions for all messages, not just when explicitly needed
3. There was no clear distinction in the prompts between "I want to download this video" vs "I want to publish to this platform"

## Fixes Applied

### 1. Updated MCP Zapier Instructions (`lib/mcp/mcp-agent-zapier-instructions.ts`)
- Added a new "CRITICAL: WHEN NOT TO USE ZAPIER MCP" section at the top
- Clearly distinguished between downloading FROM social media (don't use Zapier) vs publishing TO social media (use Zapier)
- Added specific examples of URL patterns that should NOT trigger Zapier MCP

### 2. Updated MCP Agent Instructions Enhanced (`lib/mcp/mcp-agent-instructions-enhanced.ts`)
- Added social media URL detection as the FIRST priority processing rule
- Instructs Claude to NOT use Zapier MCP tools when users paste URLs without publishing intent
- Assumes download/analyze intent for bare URLs

### 3. Updated Tool Registry (`lib/tool-registry.ts`)
- Added exclusion patterns to the MCP tools definition
- Excludes simple URL pastes and social media URLs without explicit action words
- Prevents MCP tools from being triggered by download requests

### 4. Updated Claude Handler (`app/api/chat/claude-handler.ts`)
- Added detection for messages containing only social media URLs
- Checks if the message has minimal text beyond URLs
- If detected, adds a specific instruction to the system prompt to avoid Zapier MCP tools
- Only applies when there are no publishing-related keywords (post, publish, share, upload)

## How It Works Now

1. **URL Paste Detection**: When a user pastes a social media URL, the system checks:
   - Is it just a URL or URL with minimal text?
   - Does it contain publishing keywords like "post", "publish", "share", "upload"?

2. **Intent Classification**:
   - URLs without action words → Download/analyze intent
   - URLs with publishing keywords → Publishing intent

3. **MCP Tool Prevention**:
   - Multiple layers of protection prevent Zapier MCP from triggering inappropriately
   - Priority rules ensure social media URLs are handled correctly
   - Exclusion patterns in tool registry provide additional safety

## Testing Instructions

1. **Test Download Intent** (should NOT trigger Zapier MCP):
   - Paste: `https://www.instagram.com/reels/DKDng9oPWqG/`
   - Paste: `Check out this video: https://www.youtube.com/watch?v=xyz`
   - Expected: Video downloads, no MCP tools activated

2. **Test Publishing Intent** (SHOULD trigger Zapier MCP if configured):
   - Type: `Post this image to Instagram`
   - Type: `Share this on my YouTube channel`
   - Expected: Zapier MCP tools activate for publishing

3. **Verify with Claude Sonnet 4**:
   - Switch to Claude Sonnet 4 model in settings
   - Paste social media URLs
   - Confirm no premature MCP tool calls

## Files Modified
- `/lib/mcp/mcp-agent-zapier-instructions.ts` - Added clear distinctions for URL handling
- `/lib/mcp/mcp-agent-instructions-enhanced.ts` - Added priority rule for social media URLs
- `/lib/tool-registry.ts` - Added exclusion patterns for MCP tools
- `/app/api/chat/claude-handler.ts` - Added URL intent detection

## Impact
- Users can now paste social media URLs without triggering unwanted MCP tool calls
- The system correctly interprets download/analyze intent vs publishing intent
- Claude Sonnet 4 behaves more predictably with social media URLs
- The fix maintains backward compatibility with explicit publishing requests