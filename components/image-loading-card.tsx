"use client"

import { motion } from 'framer-motion';
import { Loader2, Wand2, X, Sparkles, Palette } from 'lucide-react';
import { useImageProgressStore } from '@/lib/stores/image-progress-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface ImageLoadingCardProps {
  imageId: string;
  className?: string;
  onCancel?: (imageId: string) => void;
  showCancel?: boolean;
}

export function ImageLoadingCard({ imageId, className, onCancel, showCancel = true }: ImageLoadingCardProps) {
  const { getProgress } = useImageProgressStore();
  const [currentTime, setCurrentTime] = useState(Date.now());

  const progress = getProgress(imageId);

  // Update current time every second for accurate elapsed time calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!progress) return null;

  // Format time helpers
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatElapsed = () => {
    if (!progress?.createdAt) return '0s';
    const elapsed = Math.floor((currentTime - progress.createdAt.getTime()) / 1000);
    return formatTime(elapsed);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'initializing': return 'text-blue-400';
      case 'processing': return 'text-purple-400';
      case 'finalizing': return 'text-green-400';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'initializing': return <Sparkles className="h-4 w-4" />;
      case 'processing': return <Palette className="h-4 w-4" />;
      case 'finalizing': return <Wand2 className="h-4 w-4" />;
      default: return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const isEdit = !!progress.originalImageId;

  return (
    <div className={cn(
      "relative aspect-square bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden group border border-gray-700/50 shadow-lg",
      className
    )}>
      {/* Enhanced animated background gradient with multiple layers */}
      <div className="absolute inset-0 z-0">
        {/* Primary animated gradient */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: isEdit ? [
              "linear-gradient(45deg, rgba(147, 51, 234, 0.2), rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))",
              "linear-gradient(225deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2), rgba(59, 130, 246, 0.2))",
              "linear-gradient(45deg, rgba(147, 51, 234, 0.2), rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))"
            ] : [
              "linear-gradient(45deg, rgba(147, 51, 234, 0.15), rgba(59, 130, 246, 0.15), rgba(34, 197, 94, 0.15))",
              "linear-gradient(225deg, rgba(59, 130, 246, 0.15), rgba(34, 197, 94, 0.15), rgba(147, 51, 234, 0.15))",
              "linear-gradient(45deg, rgba(34, 197, 94, 0.15), rgba(147, 51, 234, 0.15), rgba(59, 130, 246, 0.15))"
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Secondary shimmer layer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 via-transparent to-gray-900/30" />
      </div>

      {/* Original image overlay for edits */}
      {isEdit && progress.originalImageUrl && (
        <div className="absolute inset-0 z-10">
          <img
            src={progress.originalImageUrl}
            alt="Original image"
            className="w-full h-full object-cover opacity-20 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />
          
          {/* Edit indicator */}
          <div className="absolute top-3 right-3">
            <div className="bg-purple-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 border border-purple-400/30">
              <Wand2 className="w-3 h-3" />
              Edit
            </div>
          </div>
        </div>
      )}

      {/* Progress overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-5 z-20">
        {/* Model info and elapsed time */}
        <div className="mb-4 text-center">
          <div className="text-sm font-semibold text-white tracking-wide">
            {progress.model?.includes('gpt-image-1') ? 'GPT-Image-1' :
             progress.model === 'flux-kontext-pro' ? 'Flux Kontext Pro' :
             progress.model === 'flux-kontext-max' ? 'Flux Kontext Max' :
             progress.model === 'flux-dev-ultra-fast' ? 'WaveSpeed AI' : 'AI Image'}
            {progress.quality === 'hd' && (
              <span className="ml-1 text-xs bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent font-bold">HD</span>
            )}
          </div>
          <div className="text-xs text-blue-300 font-mono mt-1 bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-500/20">
            {formatElapsed()}
          </div>
        </div>

        {/* Main loading indicator */}
        <div className="mb-4 relative">
          <div className="relative">
            {/* Outer spinning ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-12 w-12 border-2 border-transparent rounded-full"
              style={{
                background: isEdit 
                  ? 'conic-gradient(from 0deg, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.3))'
                  : 'conic-gradient(from 0deg, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.6), rgba(34, 197, 94, 0.8), rgba(147, 51, 234, 0.3))'
              }}
            />
            
            {/* Inner glow ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-1 border border-white/20 rounded-full"
            />
            
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "transition-all duration-500 drop-shadow-lg", 
                getStageColor(progress?.stage || 'initializing')
              )}>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {getStageIcon(progress?.stage || 'initializing')}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced stage indicator dots */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-500 border-2",
            progress?.stage === 'initializing' 
              ? 'bg-blue-400 border-blue-300 scale-125 shadow-lg shadow-blue-400/50' 
              : 'bg-gray-700 border-gray-600 scale-100'
          )} />
          <div className={cn(
            "w-1 h-1 bg-gray-500 rounded-full transition-all duration-300",
            ['processing', 'finalizing', 'completed'].includes(progress?.stage || '') && 'bg-white scale-150'
          )} />
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-500 border-2",
            progress?.stage === 'processing'
              ? 'bg-purple-400 border-purple-300 scale-125 shadow-lg shadow-purple-400/50'
              : ['finalizing', 'completed'].includes(progress?.stage || '') 
                ? 'bg-purple-400 border-purple-300 scale-100' 
                : 'bg-gray-700 border-gray-600 scale-100'
          )} />
          <div className={cn(
            "w-1 h-1 bg-gray-500 rounded-full transition-all duration-300",
            ['finalizing', 'completed'].includes(progress?.stage || '') && 'bg-white scale-150'
          )} />
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-500 border-2",
            progress?.stage === 'finalizing' || progress?.stage === 'completed'
              ? 'bg-green-400 border-green-300 scale-125 shadow-lg shadow-green-400/50' 
              : 'bg-gray-700 border-gray-600 scale-100'
          )} />
        </div>

        {/* Enhanced status text with better typography */}
        <div className="mb-3 text-center px-3">
          <p className="text-xs text-white/95 font-medium leading-relaxed bg-black/20 px-3 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
            {progress?.stageMessage || "Initializing image generation..."}
          </p>
        </div>

        {/* Enhanced progress bar */}
        <div className="w-full max-w-[180px] mb-4">
          <div className="h-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full overflow-hidden shadow-inner border border-gray-600/50">
            <motion.div
              className={cn(
                "h-full shadow-lg relative rounded-full",
                isEdit
                  ? "bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500"
                  : "bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress?.progress || 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Enhanced shimmer effect */}
              {progress?.status === 'generating' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </motion.div>
          </div>

          {/* Progress percentage and time info */}
          <div className="mt-2 text-center space-y-1">
            <motion.div 
              className="text-sm font-bold text-white"
              animate={{ scale: progress?.progress === 100 ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              {progress?.progress || 0}%
            </motion.div>
            {progress?.estimatedRemainingTime !== undefined && progress.estimatedRemainingTime > 0 && (
              <div className="text-xs text-gray-300 font-medium bg-gray-800/50 px-2 py-0.5 rounded-md border border-gray-600/30">
                ~{formatTime(progress.estimatedRemainingTime)} remaining
              </div>
            )}
          </div>
        </div>

        {/* Prompt preview */}
        {progress?.prompt && (
          <div className="mb-3 w-full max-w-[180px]">
            <div className="text-xs text-center bg-black/30 border border-white/10 rounded-lg p-2 backdrop-blur-sm">
              <div className="text-gray-300 mb-1 font-medium">Prompt:</div>
              <div className="text-white/90 line-clamp-2 leading-relaxed">
                {progress.prompt.length > 50 ? `${progress.prompt.substring(0, 50)}...` : progress.prompt}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced cancel button */}
        {showCancel && onCancel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200 border border-gray-600/50 hover:border-red-500/50 backdrop-blur-sm"
              onClick={() => onCancel(imageId)}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </motion.div>
        )}
      </div>

      {/* Enhanced bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 z-30">
        <div className="text-xs text-center">
          <div className={cn(
            "font-semibold truncate flex items-center justify-center gap-1",
            isEdit ? "text-purple-300" : "text-blue-300"
          )}>
            {isEdit ? (
              <>
                <Wand2 className="w-3 h-3" />
                Editing image...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Generating image...
              </>
            )}
          </div>
          {progress?.model && (
            <div className="text-gray-400 text-[10px] mt-1 font-medium bg-black/30 px-2 py-0.5 rounded border border-gray-700/50 inline-block">
              {progress.model.includes('gpt-image-1') ? 'GPT-Image-1' :
               progress.model === 'flux-kontext-pro' ? 'Flux Kontext Pro' :
               progress.model === 'flux-kontext-max' ? 'Flux Kontext Max' :
               progress.model === 'flux-dev-ultra-fast' ? 'WaveSpeed AI' :
               progress.model}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced animated border effect */}
      <div className="absolute inset-0 pointer-events-none z-5">
        <motion.div
          className="absolute inset-0 border-2 rounded-xl"
          animate={{
            borderColor: isEdit ? [
              "rgba(147, 51, 234, 0.5)",
              "rgba(59, 130, 246, 0.5)",
              "rgba(147, 51, 234, 0.5)"
            ] : [
              "rgba(147, 51, 234, 0.4)",
              "rgba(59, 130, 246, 0.4)",
              "rgba(34, 197, 94, 0.4)",
              "rgba(147, 51, 234, 0.4)"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Enhanced glow effect */}
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow: isEdit ? [
              "0 0 20px rgba(147, 51, 234, 0.3), inset 0 0 20px rgba(147, 51, 234, 0.1)",
              "0 0 30px rgba(59, 130, 246, 0.3), inset 0 0 30px rgba(59, 130, 246, 0.1)",
              "0 0 20px rgba(147, 51, 234, 0.3), inset 0 0 20px rgba(147, 51, 234, 0.1)"
            ] : [
              "0 0 15px rgba(147, 51, 234, 0.2), inset 0 0 15px rgba(147, 51, 234, 0.05)",
              "0 0 25px rgba(59, 130, 246, 0.2), inset 0 0 25px rgba(59, 130, 246, 0.05)",
              "0 0 20px rgba(34, 197, 94, 0.2), inset 0 0 20px rgba(34, 197, 94, 0.05)",
              "0 0 15px rgba(147, 51, 234, 0.2), inset 0 0 15px rgba(147, 51, 234, 0.05)"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Corner accent lights */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-60 animate-pulse" />
        <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-bl from-purple-400 to-blue-500 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-gradient-to-tr from-green-400 to-blue-500 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-gradient-to-tl from-blue-400 to-purple-500 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>
    </div>
  );
}
