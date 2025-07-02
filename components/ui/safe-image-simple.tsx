"use client"

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError' | 'onLoad'> {
  src: string
  imageId?: string
  fallbackSrc?: string
  onLoadStart?: () => void
  onLoadSuccess?: (finalUrl: string) => void
  onLoadError?: (error: Error) => void
  showLoadingState?: boolean
  showErrorState?: boolean
  enableRetry?: boolean
  retryText?: string
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
}

export function SafeImage({
  src,
  imageId,
  fallbackSrc,
  alt = '',
  className,
  onLoadStart,
  onLoadSuccess,
  onLoadError,
  showLoadingState = true,
  showErrorState = true,
  enableRetry = true,
  retryText = 'Retry',
  loadingComponent,
  errorComponent,
  ...props
}: SafeImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [currentSrc, setCurrentSrc] = useState(src)
  const [retryCount, setRetryCount] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout>()

  // Reset state when src changes
  useEffect(() => {
    setImageState('loading')
    setCurrentSrc(src)
    setRetryCount(0)
  }, [src])

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    clearTimeout(loadingTimeoutRef.current)
    setImageState('loaded')
    onLoadSuccess?.(currentSrc)
  }

  const handleError = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    clearTimeout(loadingTimeoutRef.current)
    console.error('[SafeImage] Image failed to load:', currentSrc)
    
    // Try fallback URL if available
    if (fallbackSrc && currentSrc !== fallbackSrc && retryCount === 0) {
      console.log('[SafeImage] Trying fallback URL:', fallbackSrc)
      setCurrentSrc(fallbackSrc)
      setRetryCount(1)
      return
    }
    
    // Try proxy conversion for non-data URLs
    if (!currentSrc.startsWith('data:') && retryCount < 2) {
      console.log('[SafeImage] Attempting proxy conversion...')
      try {
        const response = await fetch('/api/image-proxy/convert-to-data-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: src })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.dataUrl) {
            console.log('[SafeImage] Proxy conversion successful')
            setCurrentSrc(data.dataUrl)
            setRetryCount(prev => prev + 1)
            return
          }
        }
      } catch (error) {
        console.error('[SafeImage] Proxy conversion failed:', error)
      }
    }
    
    setImageState('error')
    onLoadError?.(new Error('Failed to load image'))
  }

  const retry = () => {
    setImageState('loading')
    setRetryCount(0)
    // Add cache buster to retry
    const newSrc = src.includes('?') 
      ? `${src}&retry=${Date.now()}`
      : `${src}?retry=${Date.now()}`
    setCurrentSrc(newSrc)
  }

  // Set loading timeout
  useEffect(() => {
    if (imageState === 'loading') {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('[SafeImage] Loading timeout, showing original image')
        // Don't set error state, just show the image anyway
        setImageState('loaded')
      }, 5000) // 5 second timeout
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [imageState])

  // Loading state
  if (imageState === 'loading' && showLoadingState && !loadingComponent) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-[#1A1A1A] rounded-lg",
        className
      )}>
        <div className="text-center p-4">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">
            Loading image...
            {retryCount > 0 && (
              <span className="block mt-1">
                Attempt {retryCount + 1}
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (imageState === 'error' && showErrorState) {
    if (errorComponent) {
      return <>{errorComponent}</>
    }

    return (
      <div className={cn(
        "flex items-center justify-center bg-[#1A1A1A] border-2 border-dashed border-red-500/30 rounded-lg",
        className
      )}>
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-xs text-red-400 font-medium mb-1">
            Image unavailable
          </p>
          {enableRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={retry}
              className="h-6 text-xs px-2 border-red-500/30 hover:border-red-500/50 mt-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {retryText}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render image (always render, even if loading)
  return (
    <div className={cn("relative", className)}>
      {loadingComponent && imageState === 'loading' && (
        <>{loadingComponent}</>
      )}
      
      <img
        ref={imgRef}
        {...props}
        src={currentSrc}
        alt={alt}
        className={cn(
          className,
          "transition-opacity duration-300",
          imageState === 'loaded' ? "opacity-100" : "opacity-0"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      
      {/* Show loading overlay if still loading */}
      {imageState === 'loading' && !loadingComponent && showLoadingState && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A] rounded-lg">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  )
}