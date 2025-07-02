# Browser Agent Quick Start Guide

Get your browser agent up and running in 5 minutes!

## 🚀 Quick Setup

### 1. Verify Your API Key
Your Browser-Use API key is already configured:
```bash
BROWSER_USE_API_KEY=bu_RdtygfkuLTaMDdstqxORz2HxBJs-z2CrHjJLWTKASM4
```

### 2. Test the Integration
```bash
npm run browser-agent:test
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Access the Browser Agent
Open your browser and navigate to:
```
http://localhost:3000/browser-agent
```

## 🎯 Try These Examples

### Research Tasks
```
Research the latest developments in AI for 2024
```

### Comparison Tasks
```
Compare iPhone 15 vs Samsung Galaxy S24 features and prices
```

### Data Extraction
```
Find contact information for tech startups in San Francisco
```

## 🔧 What's Included

✅ **Real-time Chat Interface** - Natural language interaction  
✅ **Live Browser View** - Watch the agent work in real-time  
✅ **WebSocket Communication** - Real-time progress updates  
✅ **Task Controls** - Pause, resume, and stop tasks  
✅ **Structured Output** - Organized research results  
✅ **Multi-tab Management** - Automatic tab coordination  

## 🎮 How to Use

1. **Start a Conversation**: Type your research request in the chat
2. **Watch Live**: See the browser agent work in the right panel
3. **Get Results**: Receive structured, organized findings
4. **Control Tasks**: Use pause/resume/stop buttons as needed

## 🔍 Navigation

- **Sidebar**: Click "Browser Agent" in the CANVAS section
- **Direct URL**: `/browser-agent`
- **From Main Chat**: Available as a specialized tool

## 🛠️ Troubleshooting

### Common Issues

**❌ API Connection Failed**
- Check your internet connection
- Verify the API key is correct
- Ensure you have sufficient credits

**❌ WebSocket Connection Failed**
- Restart the development server
- Check that port 3000 is available
- Clear browser cache and reload

**❌ Live View Not Loading**
- Wait a few seconds for the task to initialize
- Check browser console for errors
- Ensure iframe is not blocked by browser settings

### Debug Commands

```bash
# Test API connection
npm run browser-agent:test

# Check environment variables
npm run check-env

# View server logs
# Check terminal where you ran `npm run dev`
```

## 📊 Features Overview

### Chat Interface
- Natural language input
- Suggestion prompts
- Message history
- Real-time status updates

### Live Browser View
- Real-time browser session
- Full page visibility
- Automatic tab switching
- Task progress indicators

### Task Management
- Create research tasks
- Monitor progress
- Control execution (pause/resume/stop)
- View structured results

### Output Formats
- **Research**: Summary, key findings, sources, recommendations
- **Comparison**: Side-by-side analysis, pros/cons, best value
- **Extraction**: Structured data with validation

## 🎨 Customization

### Modify Schemas
Edit `lib/browser-use-client.ts` to customize output formats:
```typescript
export function createCustomSchema() {
  return {
    type: "object",
    properties: {
      // Your custom properties
    }
  };
}
```

### Add New Task Types
Update the schema detection in `app/api/browser-agent/task/route.ts`:
```typescript
const isCustomTask = /custom|special/i.test(taskInput);
const schemaType = isCustomTask ? 'custom' : 'research';
```

## 🔗 Integration Points

### With Main Chat
The browser agent can be triggered from the main chat interface using natural language commands that indicate web research needs.

### With Canvas Views
Results can be exported to other canvas views (images, docs, etc.) for further processing.

### With Persistence
All chat history and results are automatically saved and can be retrieved later.

## 📈 Performance Tips

1. **Be Specific**: Clear, detailed requests get better results
2. **Use Keywords**: Include terms like "research", "compare", "find"
3. **Set Scope**: Specify time ranges, regions, or categories
4. **Monitor Progress**: Watch the live view to understand agent behavior

## 🔒 Security & Privacy

- All browser sessions are sandboxed
- API keys are stored securely in environment variables
- No sensitive data is logged or stored
- WebSocket connections are authenticated

## 🆘 Support

If you encounter issues:

1. **Check the Console**: Browser developer tools for client-side errors
2. **Check Server Logs**: Terminal output where you ran `npm run dev`
3. **Test API**: Run `npm run browser-agent:test`
4. **Review Documentation**: See `BROWSER_AGENT_README.md` for detailed info

## 🎉 You're Ready!

Your browser agent is now fully configured and ready to use. Start with simple research tasks and gradually explore more complex workflows.

**Happy browsing! 🤖🌐**
