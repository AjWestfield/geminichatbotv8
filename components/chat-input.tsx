'use client';

import { useState } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ input, setInput, onSubmit, isLoading, placeholder }: ChatInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = [
    "Research the latest AI developments in 2024",
    "Compare iPhone 15 vs Samsung Galaxy S24 prices",
    "Find the best laptop deals under $1000",
    "Research sustainable energy companies",
    "Compare streaming service prices and features",
    "Find contact information for tech startups in SF",
    "Monitor news about cryptocurrency trends",
    "Research the best restaurants in New York",
    "Compare car insurance rates",
    "Find job openings for software engineers"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="p-4 border-t bg-gray-50">
      {/* Quick Suggestions */}
      <div className="mb-3">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs text-gray-600 hover:text-gray-800 flex items-center space-x-1"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z" clipRule="evenodd" />
          </svg>
          <span>{showSuggestions ? 'Hide' : 'Show'} suggestions</span>
        </button>
        
        {showSuggestions && (
          <div className="mt-2 grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left text-xs p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors duration-150"
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Describe what you want me to research or browse..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
              rows={2}
              maxLength={1000}
            />
            <div className="absolute bottom-1 right-1 text-xs text-gray-400">
              {input.length}/1000
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2 min-w-[80px] justify-center"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        
        {/* Input hints */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>Tips:</strong> Be specific about what you want to research or compare</p>
          <p>🔍 <strong>Examples:</strong> "Compare laptop prices", "Research AI companies", "Find contact info"</p>
          <p>⌨️ <strong>Shortcut:</strong> Press Enter to send, Shift+Enter for new line</p>
        </div>
      </form>
    </div>
  );
}
