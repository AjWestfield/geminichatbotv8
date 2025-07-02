'use client';

import { useState, useEffect, useRef } from 'react';
import { useBrowserAgentWebSocket, getWebSocketReadyState } from '@/hooks/use-websocket';
import { TaskControls } from './task-controls';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';

export interface Message {
  id: string;
  type: 'user' | 'agent' | 'system' | 'error';
  content: string;
  timestamp: Date;
  taskId?: string;
  liveUrl?: string;
  data?: any;
}

export default function BrowserAgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { lastMessage, readyState, subscribe, unsubscribe } = useBrowserAgentWebSocket();

  // Add welcome message on mount
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'system',
      content: 'Welcome to Browser Agent! I can help you research, compare products, extract data, and perform complex web browsing tasks. Just describe what you need and I\'ll get to work.',
      timestamp: new Date()
    }]);
  }, []);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = addMessage({
      type: 'user',
      content: input
    });

    setIsLoading(true);
    const taskInput = input;
    setInput('');

    try {
      // Determine schema type based on task content
      const isComparison = /compare|comparison|vs|versus|price|cost|better|best|cheaper/i.test(taskInput);
      const schemaType = isComparison ? 'comparison' : 'research';

      const response = await fetch('/api/browser-agent/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskInput,
          enableLiveView: true,
          structured_output: true,
          schema_type: schemaType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to start task');
      }

      const { taskId, liveUrl: taskLiveUrl, message } = await response.json();

      setCurrentTask(taskId);
      setLiveUrl(taskLiveUrl);

      // Subscribe to task updates
      subscribe(taskId);

      addMessage({
        type: 'agent',
        content: message,
        taskId,
        liveUrl: taskLiveUrl
      });

      // Load live browser view in iframe
      if (iframeRef.current && taskLiveUrl) {
        iframeRef.current.src = taskLiveUrl;
      }

    } catch (error) {
      console.error('Error starting task:', error);
      addMessage({
        type: 'error',
        content: `Failed to start task: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const { type, taskId, data } = lastMessage;

    switch (type) {
      case 'task_progress':
        if (data.action) {
          addMessage({
            type: 'system',
            content: `Step ${data.step || '?'}: ${data.action}`,
            taskId
          });
        }
        break;

      case 'task_complete':
        setCurrentTask(null);
        setLiveUrl(null);
        if (currentTask) {
          unsubscribe(currentTask);
        }

        addMessage({
          type: 'agent',
          content: `Task completed successfully! Here are the results:`,
          taskId,
          data: data.output
        });

        // Parse and display structured output if available
        if (data.output) {
          try {
            const parsedOutput = typeof data.output === 'string'
              ? JSON.parse(data.output)
              : data.output;

            addMessage({
              type: 'system',
              content: formatStructuredOutput(parsedOutput),
              taskId
            });
          } catch (error) {
            addMessage({
              type: 'system',
              content: data.output,
              taskId
            });
          }
        }
        break;

      case 'task_error':
        setCurrentTask(null);
        setLiveUrl(null);
        if (currentTask) {
          unsubscribe(currentTask);
        }

        addMessage({
          type: 'error',
          content: `Task failed: ${data.error || 'Unknown error'}`,
          taskId
        });
        break;

      case 'step_update':
        if (data.warning) {
          addMessage({
            type: 'system',
            content: `⚠️ ${data.warning}`,
            taskId
          });
        } else if (data.message) {
          addMessage({
            type: 'system',
            content: data.message,
            taskId
          });
        }
        break;
    }
  }, [lastMessage, currentTask, unsubscribe]);

  const handleTaskControl = async (action: 'pause' | 'resume' | 'stop') => {
    if (!currentTask) return;

    try {
      const response = await fetch('/api/browser-agent/task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: currentTask,
          action
        })
      });

      const result = await response.json();

      if (result.success) {
        addMessage({
          type: 'system',
          content: result.message,
          taskId: currentTask
        });

        if (action === 'stop') {
          setCurrentTask(null);
          setLiveUrl(null);
          unsubscribe(currentTask);
        }
      } else {
        addMessage({
          type: 'error',
          content: `Failed to ${action} task: ${result.message}`,
          taskId: currentTask
        });
      }
    } catch (error) {
      addMessage({
        type: 'error',
        content: `Error ${action}ing task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        taskId: currentTask
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat Panel */}
      <div className="w-1/3 flex flex-col bg-white border-r shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <h1 className="text-xl font-bold">Browser Agent</h1>
          <p className="text-sm opacity-90">
            WebSocket: {getWebSocketReadyState(readyState)}
          </p>
        </div>

        <MessageList messages={messages} isLoading={isLoading} />

        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask me to research, compare, or browse the web..."
        />
      </div>

      {/* Live Browser View */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 text-white p-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live Browser Agent</h2>
          <div className="flex items-center space-x-4">
            {currentTask && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Task: {currentTask.slice(0, 8)}...</span>
              </div>
            )}
            <TaskControls
              taskId={currentTask}
              onPause={() => handleTaskControl('pause')}
              onResume={() => handleTaskControl('resume')}
              onStop={() => handleTaskControl('stop')}
            />
          </div>
        </div>

        <div className="flex-1 bg-white">
          {liveUrl ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Browser Agent Live View"
              src={liveUrl}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            />
          ) : currentTask ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">Browser Agent Working</h3>
                <p className="text-gray-600 mb-4">
                  Task ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{currentTask}</code>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  The browser agent is executing your request. Live browser view is not available
                  with the current Browser Use subscription tier, but you can see the progress
                  and results in the chat.
                </p>
                <div className="text-sm text-gray-400">
                  <p>✅ Task creation: Working</p>
                  <p>✅ Real-time monitoring: Working</p>
                  <p>⏳ Live browser view: Subscription dependent</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold mb-2">Browser Agent Ready</h3>
                <p className="text-gray-600 mb-4">
                  Start a conversation to see the browser agent in action. I can help you with:
                </p>
                <ul className="text-sm text-left space-y-1">
                  <li>• Research topics across multiple sources</li>
                  <li>• Compare products and prices</li>
                  <li>• Extract data from websites</li>
                  <li>• Monitor news and updates</li>
                  <li>• Navigate complex web workflows</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatStructuredOutput(output: any): string {
  if (typeof output === 'string') return output;

  try {
    if (output.summary) {
      let formatted = `📋 **Summary**: ${output.summary}\n\n`;

      if (output.key_findings?.length) {
        formatted += `🔍 **Key Findings**:\n${output.key_findings.map((f: string) => `• ${f}`).join('\n')}\n\n`;
      }

      if (output.sources?.length) {
        formatted += `📚 **Sources**:\n${output.sources.map((s: any) => `• [${s.title}](${s.url}) - ${s.relevance}`).join('\n')}\n\n`;
      }

      if (output.recommendations?.length) {
        formatted += `💡 **Recommendations**:\n${output.recommendations.map((r: string) => `• ${r}`).join('\n')}`;
      }

      return formatted;
    }

    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}
