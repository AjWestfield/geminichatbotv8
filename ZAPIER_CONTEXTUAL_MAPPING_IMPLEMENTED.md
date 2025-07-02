# Zapier MCP Contextual Mapping Implementation

## Summary

Successfully implemented contextual mappings for "LMG" and "Aj and Selena" in the Zapier MCP agent instructions.

## Changes Made

### 1. Added Contextual Mapping Section

Added a prominent "IMPORTANT CONTEXTUAL MAPPINGS" section at the top of the instructions that clearly defines:

- **"LMG"** → Always refers to LMG Facebook page
- **"Aj and Selena"** → Contextually refers to YouTube or Instagram based on content type

### 2. Enhanced Platform References

Updated the social media accounts section to include contextual notes:
- LMG (Page 1) - Referenced when user says "LMG"
- Aj and Selena Instagram - Referenced for photo/image content
- Aj and Selena YouTube - Referenced for video content

### 3. Added Contextual Examples

Included new example commands that demonstrate the contextual understanding:
- "Share this on LMG" → Automatically uses LMG Facebook page
- "Upload to Aj and Selena" → Determines platform based on content type
- "What's new on LMG?" → Automatically queries LMG Facebook page
- "Show Aj and Selena videos" → Queries YouTube channel

### 4. Updated Example Interactions

Added dedicated sections showing how the AI should handle contextual references:
- **Contextual LMG Reference** - Shows automatic Facebook page selection
- **Contextual Aj and Selena Reference** - Shows platform detection based on content
- **Query Examples with Context** - Shows information retrieval examples

### 5. Enhanced Quick Reference

Updated the Platform Identifiers section with a new "Contextual Recognition" subsection that reinforces:
- "LMG" (standalone) → Always means LMG Facebook page
- "Aj and Selena" + video context → YouTube
- "Aj and Selena" + photo/image context → Instagram
- "Aj and Selena" + ambiguous → Determine from content type or ask

## Testing

The file has been validated for:
- ✅ Proper TypeScript syntax
- ✅ Correct template literal formatting
- ✅ No escaped backtick issues

## Usage

When the AI encounters these contextual references, it will now:

1. **For "LMG" mentions:**
   - Automatically understand it refers to the LMG Facebook page
   - Use Zapier MCP to handle the request
   - No clarification needed from the user

2. **For "Aj and Selena" mentions:**
   - Analyze the context to determine the platform
   - Video content → YouTube
   - Photo/image content → Instagram
   - Use Zapier MCP for the appropriate platform

## Examples in Action

### LMG Context
```
User: "Post this announcement to LMG"
AI: [Automatically uses Zapier MCP to post to LMG Facebook page]
```

### Aj and Selena Context
```
User: "Upload this video to Aj and Selena"
AI: [Recognizes video content, uses Zapier MCP for YouTube upload]

User: "Share this photo on Aj and Selena"
AI: [Recognizes photo content, uses Zapier MCP for Instagram post]
```

The implementation ensures the AI will intelligently route requests to the correct social media platform using Zapier MCP without requiring explicit platform specification from the user.