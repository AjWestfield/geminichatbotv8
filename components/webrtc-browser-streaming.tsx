'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Video,
  VideoOff,
  Play,
  Square,
  Loader2,
  Monitor,
  MousePointer,
  Keyboard,
  Wifi,
  WifiOff
} from 'lucide-react';

interface WebRTCBrowserStreamingProps {
  className?: string;
  onStreamStart?: (streamId: string) => void;
  onStreamStop?: () => void;
}

export function WebRTCBrowserStreaming({ 
  className = '',
  onStreamStart,
  onStreamStop
}: WebRTCBrowserStreamingProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [latency, setLatency] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebRTC configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize WebRTC connection
  const initializeWebRTC = useCallback(async () => {
    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = peerConnection;

      // Create data channel for mouse/keyboard events
      const dataChannel = peerConnection.createDataChannel('control', {
        ordered: true
      });
      dataChannelRef.current = dataChannel;

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        setConnectionState(peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setIsConnecting(false);
          setIsStreaming(true);
          toast.success('WebRTC connection established!');
        } else if (peerConnection.connectionState === 'failed') {
          toast.error('WebRTC connection failed');
          stopStreaming();
        }
      };

      // Handle incoming video stream
      peerConnection.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle data channel messages
      dataChannel.onopen = () => {
        console.log('Data channel opened');
      };

      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'latency') {
            setLatency(data.value);
          }
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };

      return peerConnection;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      throw error;
    }
  }, []);

  // Start screen sharing stream
  const startStreaming = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Initialize WebRTC
      const peerConnection = await initializeWebRTC();
      
      // Get display media (screen sharing)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      // Add stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Set local video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // In a real implementation, you would send this offer to a signaling server
      // For demo purposes, we'll simulate a successful connection
      const newStreamId = `webrtc-${Date.now()}`;
      setStreamId(newStreamId);
      
      // Simulate remote answer (in real app, this comes from signaling server)
      setTimeout(async () => {
        try {
          // Create a mock answer
          const answer: RTCSessionDescriptionInit = {
            type: 'answer',
            sdp: offer.sdp // In real scenario, this would be the actual remote answer
          };
          
          await peerConnection.setRemoteDescription(answer);
          onStreamStart?.(newStreamId);
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }, 1000);

      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        stopStreaming();
      };

    } catch (error) {
      console.error('Error starting stream:', error);
      toast.error('Failed to start screen sharing');
      setIsConnecting(false);
    }
  }, [initializeWebRTC, onStreamStart]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Stop video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsConnecting(false);
    setStreamId(null);
    setConnectionState('new');
    setLatency(null);
    
    onStreamStop?.();
    toast.info('Streaming stopped');
  }, [onStreamStop]);

  // Send control event through data channel
  const sendControlEvent = useCallback((event: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(event));
    }
  }, []);

  // Handle video click (simulate mouse click)
  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    if (!videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    sendControlEvent({
      type: 'click',
      x: x,
      y: y,
      timestamp: Date.now()
    });
  }, [sendControlEvent]);

  // Get connection status color
  const getConnectionColor = (state: RTCPeerConnectionState) => {
    switch (state) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'failed': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5" />
              <CardTitle>WebRTC Browser Streaming</CardTitle>
              <Badge variant="outline" className={getConnectionColor(connectionState)}>
                {connectionState}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {latency !== null && (
                <Badge variant="outline">
                  {latency}ms
                </Badge>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="flex items-center gap-2 mt-4">
            {!isStreaming && !isConnecting ? (
              <Button onClick={startStreaming} className="min-w-[140px]">
                <Play className="h-4 w-4 mr-2" />
                Start Streaming
              </Button>
            ) : (
              <Button onClick={stopStreaming} variant="destructive" className="min-w-[140px]">
                <Square className="h-4 w-4 mr-2" />
                Stop Streaming
              </Button>
            )}
            
            {streamId && (
              <div className="flex-1 text-right">
                <span className="text-sm text-gray-500">
                  Stream: {streamId.substring(0, 12)}...
                </span>
              </div>
            )}
          </div>

          {/* Status Info */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {connectionState === 'connected' ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
                <span>Connection: {connectionState}</span>
              </div>
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                <span>Remote Control: {isStreaming ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 relative bg-black">
            {isConnecting ? (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Establishing Connection</h3>
                  <p className="text-gray-300">Setting up WebRTC peer connection...</p>
                </div>
              </div>
            ) : isStreaming ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain cursor-pointer"
                onClick={handleVideoClick}
                title="Click to interact with remote browser"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center max-w-md">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full blur-xl opacity-20" />
                    <div className="relative bg-gradient-to-r from-purple-500 to-pink-600 p-4 rounded-full">
                      <Video className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">WebRTC Streaming Ready</h3>
                  <p className="text-gray-300 mb-4">
                    Start screen sharing to enable real-time browser streaming with ultra-low latency.
                  </p>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>• Real-time screen sharing</p>
                    <p>• Interactive mouse control</p>
                    <p>• Sub-100ms latency</p>
                    <p>• WebRTC peer-to-peer</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
