// Add this to your chat route after the web search detection logic

// Check for deep research mode
const isDeepResearchMode = messageContent.startsWith('deep research on ');
const deepResearchQuery = isDeepResearchMode 
  ? messageContent.replace('deep research on ', '').trim() 
  : '';

if (isDeepResearchMode && deepResearchQuery) {
  console.log('[Chat API] Deep research mode detected:', deepResearchQuery);
  
  // Return a streaming response that indicates browser research is starting
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial message
      safeEnqueue(
        controller,
        encoder,
        '🔬 **Deep Research Mode Active**\n\n',
        'deep research header'
      );
      
      safeEnqueue(
        controller,
        encoder,
        `🎯 **Research Topic:** ${deepResearchQuery}\n\n`,
        'research topic'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '🌐 **Starting browser-based research...**\n\n',
        'browser start'
      );
      
      safeEnqueue(
        controller,
        encoder,
        'The AI agent is now:\n',
        'status header'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '- 🤖 Initializing browser automation\n',
        'status 1'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '- 🔍 Planning research strategy\n',
        'status 2'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '- 🌐 Opening browser session\n',
        'status 3'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '- 📊 Will visit multiple sources\n',
        'status 4'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '- 📝 Will extract and analyze content\n\n',
        'status 5'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '💡 **Tip:** Click on the "Browser" tab in the Canvas view to watch the research in real-time!\n\n',
        'tip'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '---\n\n',
        'separator'
      );
      
      // Placeholder for research results
      safeEnqueue(
        controller,
        encoder,
        '*Research in progress... Results will appear here once the browser agent completes its investigation.*\n\n',
        'placeholder'
      );
      
      safeEnqueue(
        controller,
        encoder,
        'For now, you can:\n',
        'instructions header'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '1. Watch the live browser view to see pages being visited\n',
        'instruction 1'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '2. Monitor the research progress in the agent panel\n',
        'instruction 2'
      );
      
      safeEnqueue(
        controller,
        encoder,
        '3. Export the research report when complete\n',
        'instruction 3'
      );
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

// Continue with regular chat processing...
