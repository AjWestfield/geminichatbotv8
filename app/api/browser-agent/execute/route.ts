import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// Browser action types
interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'screenshot' | 'wait' | 'evaluate';
  selector?: string;
  value?: string;
  coordinates?: { x: number; y: number };
}

// Agent state
interface AgentState {
  task: string;
  currentUrl: string;
  pageContent: string;
  elements: any[];
  history: string[];
  completed: boolean;
}

// System prompt for browser agent
const BROWSER_AGENT_PROMPT = `You are an AI browser automation agent. You can see and interact with web pages through a real browser.

Your capabilities:
- Navigate to URLs
- Click on elements (buttons, links, etc.)
- Type text into input fields
- Scroll the page
- Take screenshots
- Extract information from pages

Available actions:
1. navigate: Go to a URL
   Example: {"type": "navigate", "value": "https://example.com"}

2. click: Click an element by selector or coordinates
   Example: {"type": "click", "selector": "button.submit"}
   Example: {"type": "click", "coordinates": {"x": 100, "y": 200}}

3. type: Type text into an input field
   Example: {"type": "type", "selector": "input[name='search']", "value": "AI news"}

4. scroll: Scroll the page
   Example: {"type": "scroll", "coordinates": {"deltaY": 300}}

5. screenshot: Take a screenshot
   Example: {"type": "screenshot"}

6. wait: Wait for a specified time (seconds)
   Example: {"type": "wait", "value": "2"}

7. evaluate: Run JavaScript in the page
   Example: {"type": "evaluate", "value": "document.title"}

Current page information will be provided to you, including:
- Current URL
- Page title
- Available interactive elements with their selectors
- Page text content

IMPORTANT:
- Always explain what you're about to do before taking action
- Be precise with selectors - prefer unique IDs or specific classes
- If you can't find an element, try alternative approaches
- For sensitive actions (forms with personal data, payments), ask for user confirmation
- Complete the task efficiently with minimal steps

Respond in this format:
THOUGHT: [Your reasoning about what to do next]
ACTION: [JSON action object]
OBSERVATION: [What you expect to see or learn]

When the task is complete, respond with:
THOUGHT: Task completed successfully
ACTION: {"type": "complete"}
RESULT: [Summary of what was accomplished]`;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, task, action, model = 'gemini-1.5-flash' } = await request.json();

    // If just forwarding a single action (non-AI mode)
    if (!task && action) {
      console.log('[Browser Agent Execute] Processing manual action:', action);
      const vncServiceUrl = process.env.VNC_BROWSER_SERVICE_URL || 'http://localhost:8003';
      
      const response = await fetch(`${vncServiceUrl}/api/vnc-browser/action/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Browser Agent Execute] Failed:', error);
        throw new Error('Failed to execute browser action');
      }

      const result = await response.json();
      return NextResponse.json(result);
    }

    // AI-driven browser automation
    if (!sessionId || !task) {
      return NextResponse.json(
        { error: 'Session ID and task are required' },
        { status: 400 }
      );
    }

    // Initialize Gemini
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    // Create a stream for real-time updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the agent loop
    (async () => {
      try {
        // Initial page content
        const pageContent = await getPageContent(sessionId);
        
        // Agent state
        const state: AgentState = {
          task,
          currentUrl: pageContent.url || 'about:blank',
          pageContent: pageContent.text_content || '',
          elements: pageContent.elements || [],
          history: [],
          completed: false
        };

        // Send initial thinking message
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'thinking',
          thought: 'Analyzing the task and current page...'
        })}\n\n`));

        let steps = 0;
        const maxSteps = 20;

        while (!state.completed && steps < maxSteps) {
          steps++;

          // Prepare context for the AI
          const context = `
Task: ${state.task}

Current URL: ${state.currentUrl}
Page Title: ${pageContent.title || 'Untitled'}

Available Interactive Elements:
${state.elements.slice(0, 20).map((el: any) => 
  `- ${el.type} "${el.text || el.placeholder || 'No text'}" selector: ${el.selector}`
).join('\n')}

Page Text (first 500 chars):
${state.pageContent.substring(0, 500)}...

Previous Actions:
${state.history.slice(-5).join('\n')}
`;

          // Get AI response
          const result = await streamText({
            model: google(model),
            prompt: BROWSER_AGENT_PROMPT + '\n\n' + context,
            temperature: 0.1,
            maxTokens: 1000,
          });

          // Parse AI response
          let thought = '';
          let action: BrowserAction | null = null;
          let observation = '';

          for await (const chunk of result.textStream) {
            // Parse the response to extract THOUGHT, ACTION, and OBSERVATION
            if (chunk.includes('THOUGHT:')) {
              thought = chunk.split('THOUGHT:')[1].split('ACTION:')[0].trim();
            }
            if (chunk.includes('ACTION:')) {
              const actionStr = chunk.split('ACTION:')[1].split('OBSERVATION:')[0].trim();
              try {
                action = JSON.parse(actionStr);
              } catch (e) {
                console.error('Failed to parse action:', actionStr);
              }
            }
            if (chunk.includes('OBSERVATION:')) {
              observation = chunk.split('OBSERVATION:')[1].trim();
            }
            if (chunk.includes('RESULT:')) {
              state.completed = true;
              const result = chunk.split('RESULT:')[1].trim();
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                type: 'result',
                content: result
              })}\n\n`));
            }
          }

          // Send thought update
          if (thought) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              type: 'thinking',
              thought
            })}\n\n`));
          }

          // Execute action
          if (action && action.type !== 'complete') {
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              type: 'action',
              action,
              description: `${action.type}: ${action.value || action.selector || 'page'}`
            })}\n\n`));

            // Execute the action via the VNC browser service
            const actionResult = await executeAction(sessionId, action);
            
            if (actionResult.success) {
              state.history.push(`${action.type}: ${action.value || action.selector || 'success'}`);
              
              // Update page content after action
              await new Promise(resolve => setTimeout(resolve, 1000)); // Brief wait
              const newContent = await getPageContent(sessionId);
              state.currentUrl = newContent.url || state.currentUrl;
              state.pageContent = newContent.text_content || '';
              state.elements = newContent.elements || [];
            } else {
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                message: `Action failed: ${actionResult.error}`
              })}\n\n`));
            }
          }

          // Send observation
          if (observation) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              type: 'observation',
              content: observation
            })}\n\n`));
          }

          // Check for completion
          if (action?.type === 'complete') {
            state.completed = true;
          }
        }

        if (steps >= maxSteps) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Maximum steps reached. Task may be incomplete.'
          })}\n\n`));
        }

        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          message: 'Agent task completed'
        })}\n\n`));

      } catch (error) {
        console.error('Agent error:', error);
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Browser Agent Execute] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute browser agent' },
      { status: 500 }
    );
  }
}

// Helper function to get page content
async function getPageContent(sessionId: string) {
  try {
    const vncServiceUrl = process.env.VNC_BROWSER_SERVICE_URL || 'http://localhost:8003';
    const response = await fetch(`${vncServiceUrl}/api/vnc-browser/content/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to get page content');
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting page content:', error);
    return {
      url: 'about:blank',
      title: 'Error',
      elements: [],
      text_content: ''
    };
  }
}

// Helper function to execute browser action
async function executeAction(sessionId: string, action: BrowserAction) {
  try {
    const vncServiceUrl = process.env.VNC_BROWSER_SERVICE_URL || 'http://localhost:8003';
    const response = await fetch(`${vncServiceUrl}/api/vnc-browser/action/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    
    if (!response.ok) {
      throw new Error('Failed to execute action');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error executing action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
