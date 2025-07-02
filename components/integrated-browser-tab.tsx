'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Monitor, 
  Cloud, 
  Video, 
  Settings, 
  Info,
  ExternalLink,
  Zap,
  Shield,
  Globe
} from 'lucide-react';

// Import our browser integration components
import { CloudBrowserIntegration } from './cloud-browser-integration';
import { VNCBrowserIntegration } from './vnc-browser-integration';
import { WebRTCBrowserStreaming } from './webrtc-browser-streaming';

interface IntegratedBrowserTabProps {
  className?: string;
  defaultMethod?: 'cloud' | 'vnc' | 'webrtc';
}

export function IntegratedBrowserTab({ 
  className = '',
  defaultMethod = 'cloud'
}: IntegratedBrowserTabProps) {
  const [activeMethod, setActiveMethod] = useState(defaultMethod);
  const [connectionStatus, setConnectionStatus] = useState<{
    cloud: boolean;
    vnc: boolean;
    webrtc: boolean;
  }>({
    cloud: false,
    vnc: false,
    webrtc: false
  });

  // Browser integration methods
  const methods = {
    cloud: {
      name: 'Cloud Browser',
      icon: Cloud,
      description: 'Remote browser service with live view',
      features: ['Real-time control', 'Scalable', 'No setup required'],
      pros: ['Instant deployment', 'Professional grade', 'Global availability'],
      cons: ['Requires API subscription', 'Internet dependent'],
      latency: '50-150ms',
      complexity: 'Low'
    },
    vnc: {
      name: 'VNC Browser',
      icon: Monitor,
      description: 'Containerized browser with VNC access',
      features: ['Full desktop', 'Self-hosted', 'Complete control'],
      pros: ['Full control', 'Self-hosted', 'No external dependencies'],
      cons: ['Requires Docker', 'Higher resource usage'],
      latency: '100-300ms',
      complexity: 'Medium'
    },
    webrtc: {
      name: 'WebRTC Streaming',
      icon: Video,
      description: 'Real-time browser streaming',
      features: ['Ultra-low latency', 'P2P connection', 'Interactive'],
      pros: ['Lowest latency', 'Direct connection', 'Real-time interaction'],
      cons: ['Complex setup', 'Browser compatibility'],
      latency: '<100ms',
      complexity: 'High'
    }
  };

  // Handle connection status updates
  const handleConnectionChange = (method: keyof typeof connectionStatus, connected: boolean) => {
    setConnectionStatus(prev => ({
      ...prev,
      [method]: connected
    }));
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5" />
              <CardTitle>Embedded Browser</CardTitle>
              <Badge variant="outline" className="bg-blue-50">
                2025 Technology
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {Object.entries(connectionStatus).map(([method, connected]) => (
                <div key={method} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-500 capitalize">{method}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Method Selection */}
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(methods).map(([key, method]) => {
                const Icon = method.icon;
                const isActive = activeMethod === key;
                const isConnected = connectionStatus[key as keyof typeof connectionStatus];
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveMethod(key as any)}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{method.name}</span>
                      {isConnected && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 text-left">{method.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <Tabs value={activeMethod} onValueChange={setActiveMethod} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mb-4">
              <TabsTrigger value="cloud">Cloud Browser</TabsTrigger>
              <TabsTrigger value="vnc">VNC Browser</TabsTrigger>
              <TabsTrigger value="webrtc">WebRTC Stream</TabsTrigger>
              <TabsTrigger value="info">Comparison</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="cloud" className="h-full m-0 px-6">
                <CloudBrowserIntegration
                  onSessionCreate={(sessionId) => handleConnectionChange('cloud', true)}
                />
              </TabsContent>

              <TabsContent value="vnc" className="h-full m-0 px-6">
                <VNCBrowserIntegration
                  onConnect={(sessionId) => handleConnectionChange('vnc', true)}
                  onDisconnect={() => handleConnectionChange('vnc', false)}
                />
              </TabsContent>

              <TabsContent value="webrtc" className="h-full m-0 px-6">
                <WebRTCBrowserStreaming
                  onStreamStart={(streamId) => handleConnectionChange('webrtc', true)}
                  onStreamStop={() => handleConnectionChange('webrtc', false)}
                />
              </TabsContent>

              <TabsContent value="info" className="h-full m-0 px-6 overflow-auto">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Browser Embedding Methods Comparison</h3>
                    
                    <div className="grid gap-4">
                      {Object.entries(methods).map(([key, method]) => {
                        const Icon = method.icon;
                        return (
                          <div key={key} className="border rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Icon className="h-5 w-5" />
                              <h4 className="font-semibold">{method.name}</h4>
                              <Badge variant="outline">{method.complexity} Complexity</Badge>
                            </div>
                            
                            <p className="text-gray-600 mb-3">{method.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <h5 className="font-medium text-green-700 mb-1">Pros:</h5>
                                <ul className="space-y-1">
                                  {method.pros.map((pro, index) => (
                                    <li key={index} className="text-green-600">• {pro}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <h5 className="font-medium text-red-700 mb-1">Cons:</h5>
                                <ul className="space-y-1">
                                  {method.cons.map((con, index) => (
                                    <li key={index} className="text-red-600">• {con}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">Latency: {method.latency}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Shield className="h-4 w-4 text-blue-500" />
                                <span className="text-sm">Features: {method.features.join(', ')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Implementation Recommendations</h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">🏆 Recommended: Cloud Browser Services</h4>
                        <p className="text-blue-800 text-sm">
                          For production applications, cloud browser services like Browserbase offer the best 
                          balance of functionality, reliability, and ease of implementation. They provide 
                          real-time browser control with minimal setup.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">🔧 Self-hosted: VNC Browser</h4>
                        <p className="text-green-800 text-sm">
                          For complete control and data privacy, VNC-based solutions provide a full 
                          desktop environment. Ideal for enterprise environments with specific security requirements.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2">⚡ Experimental: WebRTC Streaming</h4>
                        <p className="text-purple-800 text-sm">
                          For cutting-edge applications requiring ultra-low latency, WebRTC provides 
                          real-time streaming capabilities. Best for specialized use cases and advanced developers.
                        </p>
                      </div>
                    </div>
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
