'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Home,
  X,
  Globe,
  AlertCircle,
  ExternalLink,
  FileText,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface EmbeddedBrowserViewProps {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
  className?: string;
}

// Sites that are known to block iframe embedding
const BLOCKED_SITES = [
  'google.com',
  'www.google.com',
  'accounts.google.com',
  'facebook.com',
  'www.facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'github.com',
  'reddit.com',
  'amazon.com',
  'netflix.com',
  'youtube.com'
];

// Alternative search engines that allow iframe embedding
const SEARCH_ALTERNATIVES = [
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🦆' },
  { name: 'Bing', url: 'https://www.bing.com', icon: '🔷' },
  { name: 'Startpage', url: 'https://www.startpage.com', icon: '🔒' },
  { name: 'Searx', url: 'https://searx.space', icon: '🔍' },
  { name: 'Qwant', url: 'https://www.qwant.com', icon: '🇫🇷' }
];

export function EmbeddedBrowserView({
  initialUrl = 'https://duckduckgo.com',
  onUrlChange,
  className = ''
}: EmbeddedBrowserViewProps) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedSite, setBlockedSite] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const historyRef = useRef<string[]>([initialUrl]);
  const historyIndexRef = useRef(0);

  // Check for deep research mode navigation
  useEffect(() => {
    const checkDeepResearch = () => {
      const deepResearchMode = localStorage.getItem('deepResearchMode');
      const deepResearchUrl = localStorage.getItem('deepResearchUrl');
      
      if (deepResearchMode && deepResearchUrl) {
        setCurrentUrl(deepResearchUrl);
        setInputUrl(deepResearchUrl);
        localStorage.removeItem('deepResearchUrl'); // Clean up after navigation
      }
    };

    // Check on mount
    checkDeepResearch();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'deepResearchUrl' && e.newValue) {
        setCurrentUrl(e.newValue);
        setInputUrl(e.newValue);
        localStorage.removeItem('deepResearchUrl');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check if a URL is from a blocked site
  const isBlockedSite = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return BLOCKED_SITES.some(blocked => hostname.includes(blocked));
    } catch {
      return false;
    }
  };

  // Validate and format URL
  const formatUrl = (url: string): string => {
    let formattedUrl = url.trim();
    
    // Add protocol if missing
    if (!formattedUrl.match(/^https?:\/\//)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    try {
      // Validate URL
      new URL(formattedUrl);
      return formattedUrl;
    } catch {
      // If invalid, search on DuckDuckGo instead of Google
      return `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
    }
  };

  // Handle navigation
  const navigateTo = useCallback((url: string) => {
    const formattedUrl = formatUrl(url);
    
    // Check if site is blocked
    if (isBlockedSite(formattedUrl)) {
      setBlockedSite(formattedUrl);
      setError(`This website blocks embedding for security reasons.`);
      setIsLoading(false);
      setCurrentUrl(formattedUrl);
      setInputUrl(formattedUrl);
      return;
    }
    
    setBlockedSite(null);
    setCurrentUrl(formattedUrl);
    setInputUrl(formattedUrl);
    setIsLoading(true);
    setError(null);
    
    // Update history
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(formattedUrl);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    
    // Update navigation state
    setCanGoBack(historyIndexRef.current > 0);
    setCanGoForward(false);
    
    onUrlChange?.(formattedUrl);
  }, [onUrlChange]);

  // Navigation controls
  const goBack = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const url = historyRef.current[historyIndexRef.current];
      setCurrentUrl(url);
      setInputUrl(url);
      setCanGoBack(historyIndexRef.current > 0);
      setCanGoForward(true);
    }
  }, []);

  const goForward = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const url = historyRef.current[historyIndexRef.current];
      setCurrentUrl(url);
      setInputUrl(url);
      setCanGoBack(true);
      setCanGoForward(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, []);

  const refresh = useCallback(() => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = currentUrl;
    }
  }, [currentUrl]);

  const goHome = useCallback(() => {
    navigateTo('https://duckduckgo.com');
  }, [navigateTo]);

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
    
    // Try to get the actual URL from iframe (may fail due to cross-origin)
    try {
      if (iframeRef.current?.contentWindow) {
        const iframeUrl = iframeRef.current.contentWindow.location.href;
        if (iframeUrl !== 'about:blank') {
          setInputUrl(iframeUrl);
        }
      }
    } catch {
      // Cross-origin restriction, ignore
    }
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    // Check if it's a known blocked site
    if (isBlockedSite(currentUrl)) {
      setBlockedSite(currentUrl);
    }
    setError('This website cannot be displayed in an embedded browser. Some sites block embedding for security reasons.');
  }, [currentUrl, isBlockedSite]);

  return (
    <Card className={`flex flex-col h-full bg-[#1A1A1A] border-[#333333] ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-[#333333]">
        <Button
          size="sm"
          variant="ghost"
          onClick={goBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={goForward}
          disabled={!canGoForward}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={goHome}
        >
          <Home className="h-4 w-4" />
        </Button>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-[#2B2B2B] rounded-md">
          <Globe className="h-4 w-4 text-[#B0B0B0]" />
          <Input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigateTo(inputUrl);
              }
            }}
            className="flex-1 bg-transparent border-0 text-sm text-white p-0 focus-visible:ring-0"
            placeholder="Search or enter URL..."
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(currentUrl, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content extraction button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            // Send a custom event to notify chat interface
            const event = new CustomEvent('browser-content-extract', {
              detail: {
                url: currentUrl,
                title: document.title || 'Web Page',
                request: 'analyze'
              }
            });
            window.dispatchEvent(event);
            toast.success('Page sent for analysis', {
              description: 'The AI will analyze this page content'
            });
          }}
          title="Send page to AI for analysis"
          className="ml-2"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative bg-[#1E1E1E]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-white" />
              <p className="text-sm text-[#B0B0B0]">Loading...</p>
            </div>
          </div>
        )}
        
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center max-w-lg">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Unable to display website</h3>
              <p className="text-sm text-[#B0B0B0] mb-4">{error}</p>
              
              {blockedSite && (
                <>
                  <Button onClick={() => window.open(currentUrl, '_blank')} className="mb-6">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open {new URL(currentUrl).hostname} in new tab
                  </Button>
                  
                  <div className="mt-6 text-left">
                    <h4 className="text-sm font-semibold text-white mb-3">Try these search engines instead:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {SEARCH_ALTERNATIVES.map((alt) => (
                        <Button
                          key={alt.name}
                          variant="outline"
                          onClick={() => navigateTo(alt.url)}
                          className="justify-start"
                        >
                          <span className="mr-2">{alt.icon}</span>
                          {alt.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {!blockedSite && (
                <Button onClick={() => window.open(currentUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in new tab
                </Button>
              )}
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={blockedSite ? '' : currentUrl}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
            title="Embedded Browser"
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[#333333] text-xs">
        <span className="text-[#B0B0B0]">
          {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}
        </span>
        <span className="text-[#B0B0B0] truncate max-w-[400px]">
          {currentUrl}
        </span>
      </div>
    </Card>
  );
}