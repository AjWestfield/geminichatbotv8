import { useState, useEffect, useCallback } from 'react'

interface ThumbnailCache {
  [videoId: string]: {
    thumbnail: string
    timestamp: number
  }
}

const CACHE_KEY = 'video-thumbnails-cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export function useThumbnailCache() {
  const [cache, setCache] = useState<ThumbnailCache>({})

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ThumbnailCache
        const now = Date.now()
        
        // Filter out expired entries
        const filtered = Object.entries(parsed).reduce((acc, [key, value]) => {
          if (now - value.timestamp < CACHE_DURATION) {
            acc[key] = value
          }
          return acc
        }, {} as ThumbnailCache)
        
        setCache(filtered)
      }
    } catch (error) {
      console.error('[ThumbnailCache] Failed to load cache:', error)
    }
  }, [])

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error('[ThumbnailCache] Failed to save cache:', error)
    }
  }, [cache])

  const getCachedThumbnail = useCallback((videoId: string): string | null => {
    const cached = cache[videoId]
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.timestamp > CACHE_DURATION) {
      // Expired, remove from cache
      setCache(prev => {
        const next = { ...prev }
        delete next[videoId]
        return next
      })
      return null
    }
    
    return cached.thumbnail
  }, [cache])

  const setCachedThumbnail = useCallback((videoId: string, thumbnail: string) => {
    setCache(prev => ({
      ...prev,
      [videoId]: {
        thumbnail,
        timestamp: Date.now()
      }
    }))
  }, [])

  const removeCachedThumbnail = useCallback((videoId: string) => {
    setCache(prev => {
      const next = { ...prev }
      delete next[videoId]
      return next
    })
  }, [])

  const clearCache = useCallback(() => {
    setCache({})
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (error) {
      console.error('[ThumbnailCache] Failed to clear cache:', error)
    }
  }, [])

  return {
    getCachedThumbnail,
    setCachedThumbnail,
    removeCachedThumbnail,
    clearCache
  }
}