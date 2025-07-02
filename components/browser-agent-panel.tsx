'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrowserAction } from '@/lib/services/browser-agent-service';
import {
  Globe,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MousePointer,
  Type,
  Camera,
  Scroll,
  Clock
} from 'lucide-react';

interface BrowserAgentPanelProps {
  isActive: boolean;
  isProcessing: boolean;
  actions: BrowserAction[];
  error: string | null;
  onClose?: () => void;
}

const getActionIcon = (type: BrowserAction['type']) => {
  switch (type) {
    case 'navigate':
      return <Globe className="h-4 w-4" />;
    case 'click':
      return <MousePointer className="h-4 w-4" />;
    case 'type':
      return <Type className="h-4 w-4" />;
    case 'screenshot':
      return <Camera className="h-4 w-4" />;
    case 'scroll':
      return <Scroll className="h-4 w-4" />;
    case 'wait':
      return <Clock className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
};

export function BrowserAgentPanel({
  isActive,
  isProcessing,
  actions,
  error,
  onClose
}: BrowserAgentPanelProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <CardTitle>Browser Agent</CardTitle>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isProcessing ? 'Processing' : isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="mb-4 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Processing your request...</p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Actions</h4>
          <ScrollArea className="h-[300px] w-full pr-4">
            <div className="space-y-2">
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No actions yet</p>
              ) : (
                actions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    {getActionIcon(action.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.description}</p>
                      {action.value && (
                        <p className="text-xs text-muted-foreground">{action.value}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
