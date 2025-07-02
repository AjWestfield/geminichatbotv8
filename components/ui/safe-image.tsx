"use client"

import React, { useState, useEffect } from 'react'
import { useImageLoader } from '@/hooks/use-image-loader'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { imagePerformanceMonitor } from '@/lib/image-utils'

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
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showImage, setShowImage] = useState(false)

  const {
    url,
    isLoading,
    error,
    retry,
    loadStrategy,
    retryCount
  } = useImageLoader(src, {
    imageId,
    fallbackUrl: fallbackSrc,
    onLoadStart: () => {
      setImageLoaded(false)
      setShowImage(false)
      imagePerformanceMonitor.startTracking(imageId || src, src)
      onLoadStart?.()
    },
    onLoadSuccess: (finalUrl) => {
      // Log success and strategy used
      console.log(`[SafeImage] Loaded successfully using ${loadStrategy} strategy`)
      onLoadSuccess?.(finalUrl)
    },
    onLoadError: (err) => {
      imagePerformanceMonitor.recordError(imageId || src, err.message)
      onLoadError?.(err)
    }
  })

  // Handle image load event
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    imagePerformanceMonitor.recordSuccess(
      imageId || src,
      img.naturalWidth,
      img.naturalHeight,
      img.src.length
    )
    
    setImageLoaded(true)
    // Add a small delay for smooth transition
    setTimeout(() => setShowImage(true), 50)
  }

  // Handle image error (this should rarely happen with our loading strategy)
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('[SafeImage] Unexpected image error after successful URL resolution')
    setImageLoaded(false)
    setShowImage(false)
  }

  // Detect URL type for informational purposes
  const getUrlType = (url: string): string => {
    if (url.startsWith('data:')) return 'Data URL'
    if (url.includes('blob.vercel-storage.com')) return 'Vercel Blob'
    if (url.includes('replicate.delivery')) return 'Replicate'
    return 'External'
  }

  // Loading state
  if (isLoading && showLoadingState) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

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
  if (error && showErrorState && !url) {
    if (errorComponent) {
      return <>{errorComponent}</>
    }

    const isReplicateUrl = src.includes('replicate.delivery')
    const isBlobUrl = src.includes('blob.vercel-storage.com')

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
          <p className="text-xs text-gray-500 mb-2">
            {isReplicateUrl ? 'Replicate URL expired (24h limit)' :
             isBlobUrl ? 'Blob storage URL may be invalid' :
             'URL may have expired or be inaccessible'}
          </p>
          {enableRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={retry}
              className="h-6 text-xs px-2 border-red-500/30 hover:border-red-500/50"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {retryText}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Success state - render the image
  return (
    <div className={cn("relative", className)}>
      {/* Show loading overlay until image is fully loaded */}
      {url && !showImage && showLoadingState && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A] rounded-lg">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* The actual image */}
      {url && (
        <img
          {...props}
          src={url}
          alt={alt}
          className={cn(
            className,
            "transition-opacity duration-300",
            showImage ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && url && imageLoaded && (
        <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">
          {loadStrategy === 'original' ? '✓' : `↻ ${loadStrategy}`} • {getUrlType(url)}
        </div>
      )}
    </div>
  )
}