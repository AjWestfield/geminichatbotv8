# TodoWrite Feature Disabled

## Issue
The AI was outputting TodoWrite task lists in its responses, which appeared as unwanted text in the chat interface.

## Example of the Issue
When asked to create an image, the AI would respond with:
```
Okay, I'll create a plan to generate this funny meme image.

Tasks:
1. TodoWrite: (pending) Find or generate an airplane window view image...
2. TodoWrite: (pending) Find or generate an image of human feet...
3. TodoWrite: (pending) Composite the images...
...
Tasks created and awaiting approval.
```

## Root Cause
The chat API was injecting agent task instructions into every request, telling the AI to use TodoWrite for multi-step operations.

## Solution
Disabled the TodoWrite functionality by commenting out:

1. **Agent task instructions** in `/app/api/chat/route.ts` (lines 841-855)
   - Removed the system prompt that instructed the AI to use TodoWrite

2. **Task middleware processing** in `/app/api/chat/route.ts` (lines 1042-1091)
   - Disabled the parsing and processing of TodoWrite patterns in AI responses

## Result
The AI will no longer output TodoWrite task lists. It will respond normally without the task planning text.

## To Re-enable (if needed in future)
Simply uncomment the two blocks marked with:
- `// DISABLED: TodoWrite functionality temporarily disabled`
- `// DISABLED: TodoWrite task processing temporarily disabled`