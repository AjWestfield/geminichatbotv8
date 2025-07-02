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
  Loader2,
  AlertCircle,
  Lock,
  LockOpen,
  ExternalLink,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface BrowserEmbedViewProps {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
  className?: string;
  allowNavigation?: boolean;
  sandbox?: string;
}

export function BrowserEmbedView({
  initialUrl = 'https://www.google.com',
  onUrlChange,
  className = '',
  allowNavigation = true,
  sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups'
}: BrowserEmbedViewProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [pageTitle, setPageTitle] = useState('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Validate and format URL
  const formatUrl = (urlString: string) => {
    if (!urlString) return '';
    
    // Add protocol if missing
    if (!urlString.match(/^https?:\/\//)) {
      // Check if it looks like a search query
      if (urlString.includes(' ') || !urlString.includes('.')) {
        // Use Google search
        return `https://www.google.com/search?q=${encodeURIComponent(urlString)}`;
      }
      return `https://${urlString}`;
    }
    
    return urlString;
  };

  // Navigate to a URL
  const navigate = useCallback((newUrl: string) => {
    const formattedUrl = formatUrl(newUrl);
    if (!formattedUrl) return;

    setUrl(formattedUrl);
    setInputUrl(formattedUrl);
    setIsLoading(true);
    setError(null);
    
    // Update history
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(formattedUrl);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
    
    // Update navigation states
    setCanGoBack(newHistory.length > 1);
    setCanGoForward(false);
    
    // Check if URL is secure
    setIsSecure(formattedUrl.startsWith('https://'));
    
    onUrlChange?.(formattedUrl);
  }, [history, currentIndex, onUrlChange]);

  // Navigation controls
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const previousUrl = history[newIndex];
      setCurrentIndex(newIndex);
      setUrl(previousUrl);
      setInputUrl(previousUrl);
      setCanGoBack(newIndex > 0);
      setCanGoForward(true);
      setIsLoading(true);
      onUrlChange?.(previousUrl);
    }
  }, [currentIndex, history, onUrlChange]);

  const goForward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      const nextUrl = history[newIndex];
      setCurrentIndex(newIndex);
      setUrl(nextUrl);
      setInputUrl(nextUrl);
      setCanGoBack(true);
      setCanGoForward(newIndex < history.length - 1);
      setIsLoading(true);
      onUrlChange?.(nextUrl);
    }
  }, [currentIndex, history, onUrlChange]);

  const refresh = useCallback(() => {
    if (iframeRef.current) {
      setIsLoading(true);
      // Force reload by changing key
      const currentUrl = url;
      setUrl('');
      setTimeout(() => setUrl(currentUrl), 0);
    }
  }, [url]);

  const goHome = useCallback(() => {
    navigate('https://www.google.com');
  }, [navigate]);

  // Handle iframe load events
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
    
    // Try to get page title (may be blocked by CORS)
    try {
      if (iframeRef.current?.contentDocument) {
        const title = iframeRef.current.contentDocument.title;
        setPageTitle(title || 'Untitled');
      }
    } catch (e) {
      // Can't access cross-origin content
      setPageTitle(new URL(url).hostname);
    }
  }, [url]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load the page. The site may be blocking embedded content.');
  }, []);

  // Open in new tab
  const openExternal = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  // Handle Enter key in URL input
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate(inputUrl);
    }
  }, [inputUrl, navigate]);

  // Prevent iframe from navigating away (if needed)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!allowNavigation) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [allowNavigation]);

  return (
    <Card className={`flex flex-col h-full bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#333333] ${className}`}>
      {/* Browser Header */}
      <div className="border-b border-[#E5E5E5] dark:border-[#333333]">
        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F5] dark:bg-[#2B2B2B]">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1A1A1A] rounded-lg">
            {isSecure ? (
              <Lock className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <LockOpen className="h-3 w-3 text-orange-600 dark:text-orange-400" />
            )}
            <span className="text-sm font-medium text-[#333] dark:text-white truncate max-w-[300px]">
              {pageTitle || 'New Tab'}
            </span>
            <X className="h-3 w-3 text-[#666] dark:text-[#999] ml-auto cursor-pointer hover:text-black dark:hover:text-white" />
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 p-3">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={goBack}
              disabled={!canGoBack || isLoading}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={goForward}
              disabled={!canGoForward || isLoading}
              className="h-8 w-8 p-0"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] dark:bg-[#2B2B2B] rounded-full">
            <Globe className="h-4 w-4 text-[#666] dark:text-[#B0B0B0]" />
            <Input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent border-0 text-sm p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Search or enter URL"
              disabled={isLoading}
            />
            {inputUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(inputUrl)}
                className="h-6 w-6 p-0"
              >
                <Search className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={goHome}
              title="Go to homepage"
              className="h-8 w-8 p-0"
            >
              <Home className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={openExternal}
              title="Open in new tab"
              className="h-8 w-8 p-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#1A1A1A] z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-[#666] dark:text-[#B0B0B0]">Loading...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#1A1A1A] z-10">
            <div className="text-center p-8 max-w-md">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-[#333] dark:text-white mb-2">
                Unable to load page
              </h3>
              <p className="text-sm text-[#666] dark:text-[#B0B0B0] mb-4">
                {error}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={refresh} size="sm">
                  Try Again
                </Button>
                <Button onClick={openExternal} variant="outline" size="sm">
                  Open in Browser
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {url && (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            sandbox={sandbox}
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; payment"
            title="Embedded Browser"
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 text-xs border-t border-[#E5E5E5] dark:border-[#333333] bg-[#F5F5F5] dark:bg-[#2B2B2B]">
        <div className="flex items-center gap-2">
          <span className="text-[#666] dark:text-[#B0B0B0]">
            {isSecure ? '🔒 Secure' : '⚠️ Not Secure'}
          </span>
          <span className="text-[#666] dark:text-[#B0B0B0]">
            {new URL(url).hostname}
          </span>
        </div>
        <span className="text-[#666] dark:text-[#B0B0B0]">
          Embedded Browser
        </span>
      </div>
    </Card>
  );
}