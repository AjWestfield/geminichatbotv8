# Fix for Expired Gemini File Attachments

## Problem
When loading a chat from history, the messages contain `experimental_attachments` with expired Gemini file URIs. These expired URIs are being sent with new chat messages, causing errors because Gemini files expire after 48 hours.

## Root Cause
1. When loading a chat, `formattedMessages` in `app/page.tsx` includes `experimental_attachments: msg.attachments || []`
2. These attachments contain Gemini file URIs that may have expired
3. The AI SDK (Vercel AI) automatically includes `experimental_attachments` from all messages in the request
4. The expired URIs cause errors when the API tries to access them

## Solution
Filter out expired or invalid attachments from historical messages before passing them to the chat interface. We need to:

1. Remove `experimental_attachments` from loaded historical messages (except the most recent ones if still valid)
2. Or validate Gemini URIs before including them
3. Or strip attachments from all but the current message being sent

## Implementation Steps

### Option 1: Strip experimental_attachments from historical messages
In `app/page.tsx`, when formatting loaded messages, remove the experimental_attachments field from all but the most recent messages:

```typescript
const formattedMessages = chatData.messages.map((msg: any, index: number) => {
  const isRecent = index >= chatData.messages.length - 2; // Last 2 messages
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: new Date(msg.created_at),
    // Only include attachments for recent messages
    ...(isRecent && msg.attachments ? { experimental_attachments: msg.attachments } : {}),
    metadata: msg.metadata || {}
  };
});
```

### Option 2: Create a custom message preprocessor
Add a function to strip expired attachments before sending:

```typescript
function stripExpiredAttachments(messages: Message[]) {
  return messages.map(msg => {
    if (!msg.experimental_attachments) return msg;
    
    // Filter out attachments with Gemini URIs (they expire)
    const validAttachments = msg.experimental_attachments.filter(att => {
      // Keep non-Gemini attachments
      if (!att.url?.includes('generativelanguage.googleapis.com')) {
        return true;
      }
      // For Gemini files, only keep if very recent (< 24 hours)
      // This is a heuristic since we can't check actual expiry
      return false; // For safety, exclude all Gemini files from history
    });
    
    return {
      ...msg,
      experimental_attachments: validAttachments.length > 0 ? validAttachments : undefined
    };
  });
}
```

### Option 3: Override the AI SDK behavior
Intercept and modify messages before they're sent to the API by using a custom body transform.

## Recommended Fix
Option 1 is the simplest and most effective. Historical file attachments are rarely needed for context, and Gemini files expire anyway. By only including attachments from the most recent messages, we avoid the expiry issue while maintaining current functionality.