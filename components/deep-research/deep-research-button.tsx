'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X } from 'lucide-react';
import { useDeepResearch } from './deep-research-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DeepResearchButtonProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function DeepResearchButton({ className, size = 'default' }: DeepResearchButtonProps) {
  const { isActive, isLoading, activateDeepResearch, deactivateDeepResearch } = useDeepResearch();

  const handleClick = () => {
    if (isActive) {
      deactivateDeepResearch();
    } else {
      activateDeepResearch();
    }
  };

  const buttonSizes = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={isActive ? 'default' : 'outline'}
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
              buttonSizes[size],
              'relative transition-all duration-200',
              isActive && 'bg-blue-600 hover:bg-blue-700 border-blue-600',
              className
            )}
          >
            {isLoading ? (
              <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
            ) : isActive ? (
              <X className={iconSizes[size]} />
            ) : (
              <Search className={iconSizes[size]} />
            )}
            {isActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isActive 
              ? 'Deactivate Deep Research mode' 
              : 'Activate Deep Research mode for AI-powered browser automation'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}