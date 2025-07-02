'use client';

import { useEffect, useRef } from 'react';

export interface Message {
  id: string;
  type: 'user' | 'agent' | 'system' | 'error';
  content: string;
  timestamp: Date;
  taskId?: string;
  liveUrl?: string;
  data?: any;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getMessageStyle = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return 'bg-blue-500 text-white ml-auto';
      case 'agent':
        return 'bg-gray-300 text-gray-800';
      case 'system':
        return 'bg-blue-100 text-blue-800 text-sm';
      case 'error':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return '👤';
      case 'agent':
        return '🤖';
      case 'system':
        return 'ℹ️';
      case 'error':
        return '❌';
      default:
        return '💬';
    }
  };

  const formatContent = (content: string) => {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className="flex items-start space-x-2 max-w-xs lg:max-w-md">
            {message.type !== 'user' && (
              <div className="flex-shrink-0 text-lg">
                {getMessageIcon(message.type)}
              </div>
            )}

            <div
              className={`px-4 py-2 rounded-lg ${getMessageStyle(message.type)}`}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: formatContent(message.content)
                }}
              />

              {message.liveUrl && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <a
                    href={message.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    🔗 View Live Session
                  </a>
                </div>
              )}

              {message.data && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View Raw Data
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
                {message.taskId && (
                  <span className="ml-2 text-xs bg-gray-200 px-1 rounded">
                    {message.taskId.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>

            {message.type === 'user' && (
              <div className="flex-shrink-0 text-lg">
                {getMessageIcon(message.type)}
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 text-lg">🤖</div>
            <div className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
                <span>Agent is starting task...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
