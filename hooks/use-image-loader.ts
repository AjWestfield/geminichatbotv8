import { useState, useEffect, useCallback, useRef } from 'react'
import { imagePerformanceMonitor } from '@/lib/image-utils'

interface UseImageLoaderOptions {
  imageId?: string
  fallbackUrl?: string
  onLoadStart?: () => void
  onLoadSuccess?: (finalUrl: string) => void
  onLoadError?: (error: Error) => void
  maxRetries?: number
  retryDelay?: number
}

interface ImageLoadState {
  url: string | null
  isLoading: boolean
  error: Error | null
  retryCount: number
  loadStrategy: 'original' | 'proxy' | 'retry' | null
}

export function useImageLoader(
  originalUrl: string,
  options: UseImageLoaderOptions = {}
) {
  const {
    imageId,
    fallbackUrl,
    onLoadStart,
    onLoadSuccess,
    onLoadError,
    maxRetries = 3,
    retryDelay = 1000
  } = options

  const [state, setState] = useState<ImageLoadState>({
    url: originalUrl,
    isLoading: true,
    error: null,
    retryCount: 0,
    loadStrategy: 'original'
  })

  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const loadImage = useCallback(async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      let loaded = false
      
      const timeout = setTimeout(() => {
        if (!loaded) {
          img.src = '' // Cancel loading
          resolve(false)
        }
      }, 10000) // 10 second timeout

      img.onload = () => {
        loaded = true
        clearTimeout(timeout)
        // Add small delay to ensure image is ready
        setTimeout(() => resolve(true), 50)
      }

      img.onerror = () => {
        loaded = true
        clearTimeout(timeout)
        resolve(false)
      }

      // Set crossOrigin for CORS
      img.crossOrigin = 'anonymous'
      img.src = url
    })
  }, [])

  const tryLoadStrategy = useCallback(async (
    strategy: 'original' | 'proxy' | 'retry',
    url?: string
  ): Promise<string | null> => {
    if (!mountedRef.current) return null

    console.log(`[useImageLoader] Trying ${strategy} strategy for URL:`, url?.substring(0, 100))

    try {
      switch (strategy) {
        case 'original':
          if (!url) return null
          
          // For data URLs, return immediately
          if (url.startsWith('data:')) {
            console.log('[useImageLoader] Data URL detected, returning as-is')
            return url
          }

          // Try to load the image
          const loaded = await loadImage(url)
          if (loaded) {
            console.log('[useImageLoader] Original URL loaded successfully')
            return url
          }
          console.log('[useImageLoader] Failed to load original URL')
          return null

        case 'proxy':
          if (!url || url.startsWith('data:')) return null
          
          console.log('[useImageLoader] Trying image proxy...')
          try {
            const response = await fetch('/api/image-proxy/convert-to-data-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: url })
            })

            if (!response.ok) {
              console.error('[useImageLoader] Proxy failed:', response.status)
              return null
            }

            const data = await response.json()
            if (data.success && data.dataUrl) {
              console.log('[useImageLoader] Proxy conversion successful')
              return data.dataUrl
            }
          } catch (error) {
            console.error('[useImageLoader] Proxy error:', error)
          }
          return null

        case 'retry':
          if (!url) return null
          
          // Add cache-busting parameter
          const retryUrl = url.includes('?') 
            ? `${url}&retry=${Date.now()}`
            : `${url}?retry=${Date.now()}`
          
          const retryLoaded = await loadImage(retryUrl)
          if (retryLoaded) {
            console.log('[useImageLoader] Retry with cache-bust successful')
            return retryUrl
          }
          return null

        default:
          return null
      }
    } catch (error) {
      console.error(`[useImageLoader] Error in ${strategy} strategy:`, error)
      return null
    }
  }, [loadImage])

  const attemptLoad = useCallback(async () => {
    if (!mountedRef.current || loadingRef.current || !originalUrl) return
    
    console.log('[useImageLoader] Starting load attempt for:', originalUrl.substring(0, 100))
    loadingRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    onLoadStart?.()

    // Simple strategy list
    const strategies: Array<{
      name: 'original' | 'proxy' | 'retry'
      url: string
    }> = [
      { name: 'original', url: originalUrl }
    ]

    // Add fallback URL as another original attempt if provided
    if (fallbackUrl && fallbackUrl !== originalUrl) {
      strategies.push({ name: 'original', url: fallbackUrl })
    }

    // Add proxy strategy for non-data URLs
    if (!originalUrl.startsWith('data:')) {
      strategies.push({ name: 'proxy', url: originalUrl })
      strategies.push({ name: 'retry', url: originalUrl })
    }

    for (const strategy of strategies) {
      if (!mountedRef.current) break

      const result = await tryLoadStrategy(strategy.name, strategy.url)
      
      if (result) {
        if (mountedRef.current) {
          console.log('[useImageLoader] Successfully loaded with strategy:', strategy.name)
          setFinalUrl(result)
          setState({
            url: result,
            isLoading: false,
            error: null,
            retryCount: 0,
            loadStrategy: strategy.name
          })
          onLoadSuccess?.(result)
          
          // Track performance
          if (imageId) {
            imagePerformanceMonitor.recordSuccess(
              imageId,
              100, // dummy values since we don't have access to image dimensions here
              100,
              result.length
            )
          }
        }
        loadingRef.current = false
        return
      }
    }

    // All strategies failed
    if (mountedRef.current) {
      console.error('[useImageLoader] All strategies failed for:', originalUrl.substring(0, 100))
      const error = new Error('Failed to load image')
      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
        loadStrategy: null
      }))
      onLoadError?.(error)
      
      // Track failure
      if (imageId) {
        imagePerformanceMonitor.recordError(imageId, 'All strategies failed')
      }
    }
    loadingRef.current = false
  }, [originalUrl, fallbackUrl, imageId, tryLoadStrategy, onLoadStart, onLoadSuccess, onLoadError])

  // Initial load attempt
  useEffect(() => {
    if (originalUrl && !finalUrl && mountedRef.current) {
      // Small delay to prevent race conditions
      const timer = setTimeout(() => {
        attemptLoad()
      }, 10)
      
      return () => clearTimeout(timer)
    }
  }, [originalUrl]) // Remove finalUrl from deps to prevent loops

  // Retry logic
  const retry = useCallback(() => {
    if (state.retryCount >= maxRetries) {
      console.log('[useImageLoader] Max retries reached')
      return
    }

    console.log('[useImageLoader] Retrying...', { count: state.retryCount + 1, maxRetries })
    setState(prev => ({ ...prev, retryCount: prev.retryCount + 1, error: null }))
    setFinalUrl(null) // Reset final URL to trigger reload

    retryTimeoutRef.current = setTimeout(() => {
      attemptLoad()
    }, retryDelay * Math.pow(2, state.retryCount)) // Exponential backoff
  }, [state.retryCount, maxRetries, retryDelay, attemptLoad])

  return {
    url: finalUrl || originalUrl, // Always return a URL, even if loading
    isLoading: state.isLoading,
    error: state.error,
    retry,
    loadStrategy: state.loadStrategy,
    retryCount: state.retryCount
  }
}