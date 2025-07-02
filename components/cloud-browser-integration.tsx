'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Globe,
  Play,
  Pause,
  Square,
  Loader2,
  Monitor,
  ExternalLink,
  RefreshCw,
  Maximize,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface CloudBrowserIntegrationProps {
  className?: string;
  onNavigate?: (url: string) => void;
  onSessionCreate?: (sessionId: string) => void;
}

export function CloudBrowserIntegration({
  className = '',
  onNavigate,
  onSessionCreate
}: CloudBrowserIntegrationProps) {
  const [currentUrl, setCurrentUrl] = useState('https://google.com');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browserProvider, setBrowserProvider] = useState<'browserbase' | 'browserless' | 'browsercat'>('browserbase');
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cloud browser service configurations
  const browserConfigs = {
    browserbase: {
      name: 'Browserbase',
      apiUrl: 'https://www.browserbase.com/api/v1',
      features: ['Live View', 'AI Agents', 'Real-time Control']
    },
    browserless: {
      name: 'Browserless',
      apiUrl: 'https://production-sfo.browserless.io',
      features: ['WebSocket', 'Screenshots', 'PDF Generation']
    },
    browsercat: {
      name: 'BrowserCat',
      apiUrl: 'https://api.browsercat.com',
      features: ['Instant Scale', 'Global Availability', 'Security Sandbox']
    }
  };

  // Create browser session
  const createBrowserSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = browserConfigs[browserProvider];

      // Example API call structure (you'll need actual API keys)
      const response = await fetch(`${config.apiUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BROWSER_API_KEY}`
        },
        body: JSON.stringify({
          url: currentUrl,
          enableLiveView: true,
          timeout: 300000, // 5 minutes
          viewport: {
            width: 1280,
            height: 720
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.id);
        setLiveViewUrl(data.liveViewUrl || data.connectUrl);
        setIsConnected(true);

        toast.success(`${config.name} session created successfully!`);
        onSessionCreate?.(data.id);
      } else {
        throw new Error(`Failed to create ${config.name} session`);
      }
    } catch (error) {
      console.error('Error creating browser session:', error);
      toast.error('Failed to create browser session');
    } finally {
      setIsLoading(false);
    }
  }, [browserProvider, currentUrl, onSessionCreate]);

  // Navigate to URL
  const navigateToUrl = useCallback(async (url: string) => {
    if (!sessionId) {
      await createBrowserSession();
      return;
    }

    try {
      const config = browserConfigs[browserProvider];
      await fetch(`${config.apiUrl}/sessions/${sessionId}/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BROWSER_API_KEY}`
        },
        body: JSON.stringify({ url })
      });

      setCurrentUrl(url);
      onNavigate?.(url);
      toast.success(`Navigated to ${url}`);
    } catch (error) {
      console.error('Error navigating:', error);
      toast.error('Failed to navigate');
    }
  }, [sessionId, browserProvider, onNavigate]);

  // Close session
  const closeSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const config = browserConfigs[browserProvider];
      await fetch(`${config.apiUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BROWSER_API_KEY}`
        }
      });

      setSessionId(null);
      setLiveViewUrl(null);
      setIsConnected(false);
      toast.info('Browser session closed');
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }, [sessionId, browserProvider]);

  // Handle URL input
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToUrl(currentUrl);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5" />
              <CardTitle>Cloud Browser</CardTitle>
              {isConnected && (
                <Badge variant="default" className="bg-green-500">
                  Connected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={browserProvider}
                onChange={(e) => setBrowserProvider(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
                disabled={isConnected}
                title="Select browser provider"
                aria-label="Choose browser service provider"
              >
                {Object.entries(browserConfigs).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                ))}
              </select>

              {liveViewUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(liveViewUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* URL Navigation */}
          <form onSubmit={handleUrlSubmit} className="flex gap-2 mt-4">
            <Input
              type="url"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              placeholder="Enter URL to navigate..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-1" />
                  Go
                </>
              )}
            </Button>
          </form>

          {/* Browser Controls */}
          {isConnected && (
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => navigateToUrl(currentUrl)}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={closeSession}>
                <Square className="h-4 w-4 mr-1" />
                Close
              </Button>
              <div className="flex-1" />
              <span className="text-sm text-gray-500">
                Session: {sessionId?.substring(0, 8)}...
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <Tabs defaultValue="browser" className="flex-1 flex flex-col">
            <TabsList className="mx-6">
              <TabsTrigger value="browser">Live Browser</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="browser" className="h-full m-0">
                <div className="h-full relative">
                  {liveViewUrl && isConnected ? (
                    <iframe
                      ref={iframeRef}
                      src={liveViewUrl}
                      className="w-full h-full border-0"
                      title="Cloud Browser Live View"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
                    />
                  ) : sessionId ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center max-w-md">
                        <div className="text-6xl mb-4">🔗</div>
                        <h3 className="text-xl font-semibold mb-2">Browser Session Active</h3>
                        <p className="text-gray-600 mb-4">
                          Session ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{sessionId}</code>
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          The cloud browser is running but live view is not available.
                          You can still control the browser through API calls.
                        </p>
                        <div className="text-sm text-gray-400">
                          <p>✅ Session created successfully</p>
                          <p>✅ Browser automation available</p>
                          <p>⏳ Live view: Provider dependent</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center max-w-md">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse" />
                          <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
                            <Monitor className="h-12 w-12 text-white" />
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Cloud Browser Ready</h3>
                        <p className="text-gray-600 mb-4">
                          Enter a URL above to start a cloud browser session with real-time viewing.
                        </p>
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>• {browserConfigs[browserProvider].features.join(' • ')}</p>
                          <p>• Real-time browser control</p>
                          <p>• Scalable cloud infrastructure</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="features" className="h-full m-0 p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Available Providers</h3>
                    <div className="grid gap-4">
                      {Object.entries(browserConfigs).map(([key, config]) => (
                        <div
                          key={key}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            browserProvider === key ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => !isConnected && setBrowserProvider(key as any)}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{config.name}</h4>
                            {browserProvider === key && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Features: {config.features.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Capabilities</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>✅ Real-time browser control and viewing</li>
                      <li>✅ Scalable cloud infrastructure</li>
                      <li>✅ Cross-platform compatibility</li>
                      <li>✅ Security sandboxing</li>
                      <li>✅ Global availability</li>
                      <li>✅ API-driven automation</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
