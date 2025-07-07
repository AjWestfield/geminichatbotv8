"use client"

import type React from "react"

import { ArrowRight, Bot, Check, ChevronDown, Paperclip, Square, X, FileAudio, Image as ImageIcon, Video, Sparkles, Wand2, RotateCcw, RotateCw, RefreshCw, Microscope } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useRef, useCallback, useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatFileSize, formatDuration, formatVideoDuration } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MCPToolsPopup } from "@/components/mcp/mcp-tools-popup"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { detectYouTubeUrl, downloadYouTubeVideo, createFileFromYouTubeDownload, getDisplayTitleFromUrl, extractYouTubeUrls, type YoutubeDownloadProgress } from "@/lib/youtube-url-utils"
import { detectInstagramUrl, downloadInstagramMedia, createFileFromInstagramDownload, getDisplayTitleFromUrl as getInstagramDisplayTitle, extractInstagramUrls, type InstagramDownloadProgress } from "@/lib/instagram-url-utils"
import { detectTikTokUrl, downloadTikTokVideo, createFileFromTikTokDownload, getDisplayTitleFromUrl as getTikTokDisplayTitle, extractTikTokUrls, type TikTokDownloadProgress } from "@/lib/tiktok-url-utils"
import { detectFacebookUrl, downloadFacebookMedia, createFileFromFacebookDownload, getDisplayTitleFromUrl as getFacebookDisplayTitle, extractFacebookUrls, type FacebookDownloadProgress } from "@/lib/facebook-url-utils"
import { useYouTubeSettings } from "@/lib/contexts/settings-context"
import { InstagramPreview } from "./instagram-preview"
import { CookieManager } from "@/components/cookie-manager"
import { InlineVideoOptions } from "@/components/inline-video-options"

interface UseAutoResizeTextareaProps {
  minHeight: number
  maxHeight?: number
  onEnhancedChange?: (isEnhanced: boolean) => void
}

function useAutoResizeTextarea({ minHeight, maxHeight, onEnhancedChange }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean, options?: { expand?: boolean; preserveHeight?: boolean }) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        // Reset to non-enhanced mode
        onEnhancedChange?.(false)
        return
      }

      // If preserveHeight is true, don't change the current height
      if (options?.preserveHeight) {
        return
      }

      // If expand is explicitly true, ignore maxHeight and expand to fit full content
      if (options?.expand === true) {
        console.log('[Height Adjustment] Expanding text area for enhanced content')
        textarea.style.height = `${minHeight}px`

        // Use a higher limit for enhanced content (800px) to show full enhanced prompts
        const enhancedMaxHeight = 800
        const expandedHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, enhancedMaxHeight))

        console.log('[Height Adjustment] Expansion details:', {
          scrollHeight: textarea.scrollHeight,
          enhancedMaxHeight,
          expandedHeight,
          currentHeight: textarea.style.height
        })

        textarea.style.height = `${expandedHeight}px`

        // Notify that we're in enhanced mode
        onEnhancedChange?.(true)
        return
      }

      // If expand is explicitly false, maintain a reasonable height without auto-expansion
      if (options?.expand === false) {
        const currentHeight = parseInt(textarea.style.height) || minHeight
        const reasonableHeight = Math.min(currentHeight, minHeight + 100) // Allow some growth but limit it
        textarea.style.height = `${reasonableHeight}px`

        // Notify that we're no longer in enhanced mode
        onEnhancedChange?.(false)
        return
      }

      // Default behavior: auto-resize to fit content with normal maxHeight
      textarea.style.height = `${minHeight}px`
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY))
      textarea.style.height = `${newHeight}px`

      // Notify that we're in normal (non-enhanced) mode
      onEnhancedChange?.(false)
    },
    [minHeight, maxHeight, onEnhancedChange],
  )

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = `${minHeight}px`
    }
  }, [minHeight])

  useEffect(() => {
    const handleResize = () => adjustHeight()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [adjustHeight])

  return { textareaRef, adjustHeight }
}

const OPENAI_ICON = (
  <>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 256 260"
      aria-label="OpenAI Icon"
      className="w-4 h-4"
    >
      <title>OpenAI Icon</title>
      <path
        fill="#FFFFFF"
        d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.530c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
      />
    </svg>
  </>
)

interface AIPromptProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e?: React.FormEvent) => void
  onStop?: () => void
  disabled?: boolean
  selectedModel?: string
  onModelChange?: (model: string) => void
  onFileSelect?: (file: File) => void
  onFilesSelect?: (files: File[]) => void
  selectedFile?: {
    file: File
    preview?: string
    transcription?: {
      text: string
      language?: string
      duration?: number
    }
    videoThumbnail?: string // Add this
    videoDuration?: number // Add this
  } | null
  selectedFiles?: Array<{
    file: File
    preview?: string
    transcription?: {
      text: string
      language?: string
      duration?: number
    }
    videoThumbnail?: string
    videoDuration?: number
  }>
  onFileRemove?: () => void
  onFilesRemove?: (index: number) => void
  onAllFilesRemove?: () => void
  onGenerateImage?: () => void // Add this for quick image generation
  onToolToggle?: (serverId: string, toolName: string, enabled: boolean) => void
  onServerToggle?: (serverId: string, enabled: boolean) => void
  onPaste?: (e: React.ClipboardEvent) => void
  placeholder?: string
  onFileClick?: (file: { file: File; preview?: string }, index?: number) => void
  onEnhancePrompt?: (originalPrompt: string, enhancedPrompt: string) => void
  onDeepResearch?: () => void
  isDeepResearchMode?: boolean
}

export function AI_Prompt({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled = false,
  selectedModel = "gemini-2.0-flash",
  onModelChange,
  onFileSelect,
  onFilesSelect,
  selectedFile,
  selectedFiles,
  onFileRemove,
  onFilesRemove,
  onAllFilesRemove,
  onGenerateImage,
  onToolToggle,
  onServerToggle,
  onPaste,
  placeholder,
  onFileClick,
  onEnhancePrompt,
  onDeepResearch,
  isDeepResearchMode,
}: AIPromptProps) {
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)

  // Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hasEnhanced, setHasEnhanced] = useState(false)
  const [isProgrammaticUpdate, setIsProgrammaticUpdate] = useState(false)
  const [isEnhanced, setIsEnhanced] = useState(false)

  // YouTube download state
  const [youtubeDownloadProgress, setYoutubeDownloadProgress] = useState<YoutubeDownloadProgress | null>(null)
  const [isDownloadingYoutube, setIsDownloadingYoutube] = useState(false)
  const [detectedYouTubeUrls, setDetectedYouTubeUrls] = useState<Array<{url: string, videoId: string}>>([]) // Track detected URLs without auto-downloading

  // Instagram download state
  const [instagramDownloadProgress, setInstagramDownloadProgress] = useState<InstagramDownloadProgress | null>(null)
  const [isDownloadingInstagram, setIsDownloadingInstagram] = useState(false)
  const [detectedInstagramUrls, setDetectedInstagramUrls] = useState<Array<{url: string, mediaId: string, type: string}>>([]) // Track detected Instagram URLs
  const [autoDownloadInProgress, setAutoDownloadInProgress] = useState(false) // Track auto-download state
  const [instagramPreviews, setInstagramPreviews] = useState<Array<{url: string, mediaId: string, type: string}>>([]) // Track Instagram previews

  // TikTok download state
  const [tiktokDownloadProgress, setTiktokDownloadProgress] = useState<TikTokDownloadProgress | null>(null)
  const [isDownloadingTikTok, setIsDownloadingTikTok] = useState(false)
  const [detectedTikTokUrls, setDetectedTikTokUrls] = useState<Array<{url: string, videoId?: string, username?: string}>>([]) // Track detected TikTok URLs

  // Facebook download state
  const [facebookDownloadProgress, setFacebookDownloadProgress] = useState<FacebookDownloadProgress | null>(null)
  const [isDownloadingFacebook, setIsDownloadingFacebook] = useState(false)
  const [detectedFacebookUrls, setDetectedFacebookUrls] = useState<Array<{url: string, videoId?: string, type?: string}>>([]) // Track detected Facebook URLs

  // Hooks that depend on state
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 80,
    maxHeight: 500,
    onEnhancedChange: setIsEnhanced,
  })
  const { toast } = useToast()
  const { settings: youtubeSettings } = useYouTubeSettings()

  const AI_MODELS = ["gemini-2.0-flash", "gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20", "Claude Sonnet 4"]

  const MODEL_ICONS: Record<string, React.ReactNode> = {
    "Claude Opus 4": (
      <>
        <svg
          fill="#FFFFFF"
          fillRule="evenodd"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Anthropic Icon</title>
          <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
      </>
    ),
    "Claude Sonnet 4": (
      <>
        <svg
          fill="#FFFFFF"
          fillRule="evenodd"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Anthropic Icon</title>
          <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
      </>
    ),
    "gemini-2.5-flash-preview-05-20": (
      <svg height="1em" className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>Gemini</title>
        <defs>
          <linearGradient id="lobe-icons-gemini-fill" x1="0%" x2="68.73%" y1="100%" y2="30.395%">
            <stop offset="0%" stopColor="#1C7DFF" />
            <stop offset="52.021%" stopColor="#1C69FF" />
            <stop offset="100%" stopColor="#F0DCD6" />
          </linearGradient>
        </defs>
        <path
          d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
          fill="url(#lobe-icons-gemini-fill)"
          fillRule="nonzero"
        />
      </svg>
    ),
    "gemini-2.5-pro-preview-06-05": (
      <svg height="1em" className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>Gemini</title>
        <defs>
          <linearGradient id="lobe-icons-gemini-fill-pro" x1="0%" x2="68.73%" y1="100%" y2="30.395%">
            <stop offset="0%" stopColor="#1C7DFF" />
            <stop offset="52.021%" stopColor="#1C69FF" />
            <stop offset="100%" stopColor="#F0DCD6" />
          </linearGradient>
        </defs>
        <path
          d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
          fill="url(#lobe-icons-gemini-fill-pro)"
          fillRule="nonzero"
        />
      </svg>
    ),
    "gemini-2.0-flash": (
      <svg height="1em" className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>Gemini</title>
        <defs>
          <linearGradient id="lobe-icons-gemini-fill-flash" x1="0%" x2="68.73%" y1="100%" y2="30.395%">
            <stop offset="0%" stopColor="#1C7DFF" />
            <stop offset="52.021%" stopColor="#1C69FF" />
            <stop offset="100%" stopColor="#F0DCD6" />
          </linearGradient>
        </defs>
        <path
          d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
          fill="url(#lobe-icons-gemini-fill-flash)"
          fillRule="nonzero"
        />
      </svg>
    ),
    "GPT-4o": OPENAI_ICON,
    "GPT-4o Mini": OPENAI_ICON,
  }

  // Add to history
  const addToHistory = useCallback((text: string) => {
    console.log('[Prompt Enhancer] Adding to history:', {
      text: text.substring(0, 50) + '...',
      currentHistoryLength: history.length,
      currentHistoryIndex: historyIndex
    })

    // Validate input
    if (!text || typeof text !== 'string') {
      console.error('[Prompt Enhancer] Cannot add invalid text to history:', text)
      return
    }

    if (text.trim().length === 0) {
      console.error('[Prompt Enhancer] Cannot add empty text to history')
      return
    }

    try {
      // Ensure history is a valid array
      const currentHistory = Array.isArray(history) ? history : []

      // Create new history based on current position
      const newHistory = historyIndex >= 0 && historyIndex < currentHistory.length
        ? currentHistory.slice(0, historyIndex + 1)
        : [...currentHistory]

      newHistory.push(text)

      console.log('[Prompt Enhancer] History updated:', {
        oldLength: currentHistory.length,
        newLength: newHistory.length,
        newIndex: newHistory.length - 1
      })

      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      setHasEnhanced(true)


    } catch (error) {
      console.error('[Prompt Enhancer] Error adding to history:', error)
    }
  }, [history, historyIndex])

  // Note: History initialization is now handled only during enhancement process
  // to avoid race conditions and conflicting state management

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('[Prompt Enhancer] State changed:', {
      hasEnhanced,
      historyIndex,
      historyLength: history.length,
      history: history.map((h, i) => `${i}: ${h?.substring(0, 30)}...`),
      undoButtonShouldBeEnabled: historyIndex > 0,
      isEnhanced
    })
  }, [hasEnhanced, historyIndex, history, isEnhanced])





  // Define handleEnhancePrompt early so it can be used in handleKeyDown
  const handleEnhancePrompt = useCallback(async (regenerate = false) => {
    console.log('[Prompt Enhancer] Starting enhancement:', {
      value: value.trim(),
      regenerate,
      isEnhancing,
      disabled,
      selectedModel,
      valueLength: value.trim().length
    })

    if (!value.trim() || isEnhancing || disabled || value.trim().length < 2) {
      console.log('[Prompt Enhancer] Enhancement blocked:', {
        noValue: !value.trim(),
        isEnhancing,
        disabled,
        tooShort: value.trim().length < 2
      })

      // Provide user feedback for why enhancement is blocked
      if (toast && !isEnhancing && !disabled) {
        if (!value.trim()) {
          toast({
            title: "Cannot Enhance",
            description: "Please enter a prompt first",
            variant: "destructive",
            duration: 2000,
          })
        } else if (value.trim().length < 2) {
          toast({
            title: "Cannot Enhance",
            description: "Prompt must be at least 2 characters long",
            variant: "destructive",
            duration: 2000,
          })
        }
      }
      return
    }

    setIsEnhancing(true)

    // Store the original prompt before enhancement
    const originalText = value.trim()

    // Initialize history properly for first enhancement
    if (!hasEnhanced) {
      console.log('[Prompt Enhancer] First enhancement - initializing history with original prompt')
      setHistory([originalText])
      setHistoryIndex(0)
      setOriginalPrompt(originalText)
      console.log('[Prompt Enhancer] History initialized:', { originalText: originalText.substring(0, 50) + '...' })
    }

    // Determine what prompt to enhance
    const promptToEnhance = regenerate && hasEnhanced && history.length > 0
      ? history[0]  // Use original prompt for regeneration
      : value.trim()  // Use current value for first enhancement

    console.log('[Prompt Enhancer] Sending request:', {
      promptToEnhance,
      model: selectedModel || 'gemini',
      context: 'chat',
      regenerate
    })

    try {
      const response = await fetch('/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptToEnhance,
          model: selectedModel || 'gemini',
          context: 'chat',
          regenerate: regenerate
        }),
      })

      console.log('[Prompt Enhancer] Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Prompt Enhancer] HTTP error response:', errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
      }

      const data = await response.json()
      console.log('[Prompt Enhancer] Response data:', data)

      if (data.success && data.enhancedPrompt) {
        console.log('[Prompt Enhancer] Enhancement successful:', {
          original: data.originalPrompt,
          enhanced: data.enhancedPrompt,
          model: data.model
        })

        // Mark as programmatic update to prevent conflicting adjustHeight calls
        setIsProgrammaticUpdate(true)

        // Update the input value first
        onChange(data.enhancedPrompt)

        // Get the current history state - if this is first enhancement, use the original text
        const currentHistory = hasEnhanced ? (Array.isArray(history) ? [...history] : []) : [originalText]

        // Add enhanced prompt to history
        const newHistory = [...currentHistory, data.enhancedPrompt]
        const newHistoryIndex = newHistory.length - 1

        // Update all state variables - React will batch these automatically
        setHistory(newHistory)
        setHistoryIndex(newHistoryIndex)
        setHasEnhanced(true)

        // Force immediate state update check
        const stateUpdateCheck = () => {
          console.log('[Prompt Enhancer] Enhancement completed - state updated:', {
            originalPrompt: data.originalPrompt?.substring(0, 50) + '...',
            enhancedPrompt: data.enhancedPrompt?.substring(0, 50) + '...',
            model: data.model,
            newHistoryLength: newHistory.length,
            newHistoryIndex,
            hasEnhanced: true,
            expectedUndoEnabled: newHistoryIndex > 0
          })
        }

        // Call immediately
        stateUpdateCheck()

        // Notify parent component
        onEnhancePrompt?.(data.originalPrompt, data.enhancedPrompt)

        // Use setTimeout to ensure DOM has updated before adjusting height
        setTimeout(() => {
          console.log('[Prompt Enhancer] Expanding text area after enhancement')
          adjustHeight(false, { expand: true })
          setIsProgrammaticUpdate(false)

          // Force a state check after DOM update
          console.log('[Prompt Enhancer] Final state check after DOM update:', {
            historyIndex: newHistoryIndex,
            historyLength: newHistory.length,
            hasEnhanced: true,
            undoButtonShouldBeEnabled: newHistoryIndex > 0,
            undoButtonDisabledCondition: newHistoryIndex <= 0 || disabled,
            actualHistoryIndex: historyIndex,
            actualHistory: history,
            disabled: disabled
          })
        }, 0)

        // Show success feedback with enhanced prompt preview
        if (toast) {
          const previewText = data.enhancedPrompt.length > 100
            ? data.enhancedPrompt.substring(0, 100) + '...'
            : data.enhancedPrompt

          const title = regenerate
            ? "🔄 New Enhancement Generated"
            : "✨ Prompt Enhanced"

          const description = regenerate
            ? `Generated new variation with ${data.model || selectedModel || 'Gemini'}${data.fallback ? ' (fallback)' : ''}`
            : `Enhanced with ${data.model || selectedModel || 'Gemini'}${data.fallback ? ' (fallback)' : ''}`

          console.log('[Prompt Enhancer] Showing success toast:', { title, description })
          toast({
            title,
            description,
            duration: 3000,
          })
        } else {
          console.error('[Prompt Enhancer] Toast function not available for success message')
        }
      } else {
        console.error('[Prompt Enhancer] Enhancement failed:', data)
        throw new Error(data.error || data.details || 'Failed to enhance prompt - no enhanced text returned')
      }
    } catch (error) {
      console.error('[Prompt Enhancer] Error enhancing prompt:', error)

      let errorMessage = regenerate ? 'Failed to regenerate enhancement' : 'Failed to enhance prompt'
      let errorTitle = regenerate ? "🔄 Regeneration Failed" : "❌ Enhancement Failed"

      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorMessage = 'Network error - check your connection'
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication error - check API keys'
        } else if (error.message.includes('HTTP 429')) {
          errorMessage = 'Rate limit exceeded - try again later'
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = 'Server error - try again or use a different model'
        } else {
          errorMessage = error.message
        }
      }

      if (toast) {
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        })
      } else {
        // Fallback alert if toast is not available
        console.error('[Prompt Enhancer] Toast not available, using alert:', errorTitle, errorMessage)
        alert(`${errorTitle}: ${errorMessage}`)
      }
    } finally {
      console.log('[Prompt Enhancer] Enhancement finished, setting isEnhancing to false')
      setIsEnhancing(false)
    }
  }, [value, isEnhancing, disabled, selectedModel, onChange, onEnhancePrompt, adjustHeight, toast, hasEnhanced, history, historyIndex, addToHistory])

  // Undo function
  const handleUndo = useCallback(() => {
    console.log('[Prompt Enhancer] Undo attempt:', {
      historyIndex,
      historyLength: history.length,
      disabled,
      hasEnhanced,
      currentValue: value?.substring(0, 50) + '...',
      history: history.map((h, i) => `${i}: ${h?.substring(0, 30)}...`)
    })

    // Validation checks
    if (disabled) {
      console.log('[Prompt Enhancer] Undo blocked: Component disabled')
      return
    }

    if (!hasEnhanced) {
      console.log('[Prompt Enhancer] Undo blocked: No enhancement history')
      if (toast) {
        toast({
          title: "Cannot Undo",
          description: "No enhancement to undo",
          variant: "destructive",
          duration: 2000,
        })
      }
      return
    }

    if (historyIndex <= 0) {
      console.log('[Prompt Enhancer] Undo blocked: Already at original version')
      if (toast) {
        toast({
          title: "Cannot Undo",
          description: "Already at the original version",
          variant: "destructive",
          duration: 2000,
        })
      }
      return
    }

    if (!Array.isArray(history) || history.length === 0) {
      console.log('[Prompt Enhancer] Undo blocked: Invalid history state')
      if (toast) {
        toast({
          title: "Cannot Undo",
          description: "History state is invalid",
          variant: "destructive",
          duration: 2000,
        })
      }
      return
    }

    const newIndex = historyIndex - 1
    const previousVersion = history[newIndex]

    if (!previousVersion || typeof previousVersion !== 'string') {
      console.log('[Prompt Enhancer] Undo blocked: Invalid previous version at index', newIndex)
      if (toast) {
        toast({
          title: "Cannot Undo",
          description: "Previous version is corrupted",
          variant: "destructive",
          duration: 3000,
        })
      }
      return
    }

    console.log('[Prompt Enhancer] Undo successful:', {
      fromIndex: historyIndex,
      toIndex: newIndex,
      previousText: previousVersion.substring(0, 50) + '...'
    })

    // Update state
    setHistoryIndex(newIndex)
    setIsProgrammaticUpdate(true)
    onChange(previousVersion)

    // Adjust height after DOM update
    setTimeout(() => {
      adjustHeight(false, { expand: false })
      setIsProgrammaticUpdate(false)
    }, 0)

    if (toast) {
      toast({
        title: "✅ Undone",
        description: "Reverted to previous version",
        duration: 1500,
      })
    }
  }, [historyIndex, history, onChange, disabled, toast, adjustHeight, hasEnhanced, value])


  // Regenerate function
  const handleRegenerate = useCallback(() => {
    console.log('[Prompt Enhancer] Regenerate attempt:', {
      hasEnhanced,
      isEnhancing,
      disabled,
      historyLength: history.length,
      historyIndex,
      hasOriginalPrompt: !!history[0],
      currentValue: value?.substring(0, 50) + '...'
    })

    try {
      // Robust validation before regenerating
      if (!hasEnhanced) {
        console.log('[Prompt Enhancer] Regenerate blocked: No enhancement history')
        if (toast) {
          toast({
            title: "Cannot Regenerate",
            description: "No previous enhancement to regenerate from. Enhance a prompt first.",
            variant: "destructive",
            duration: 3000,
          })
        }
        return
      }

      if (isEnhancing) {
        console.log('[Prompt Enhancer] Regenerate blocked: Already enhancing')
        if (toast) {
          toast({
            title: "Please Wait",
            description: "Already generating enhancement...",
            duration: 2000,
          })
        }
        return
      }

      if (disabled) {
        console.log('[Prompt Enhancer] Regenerate blocked: Component disabled')
        if (toast) {
          toast({
            title: "Cannot Regenerate",
            description: "Input is currently disabled",
            variant: "destructive",
            duration: 2000,
          })
        }
        return
      }

      // Validate history array
      if (!Array.isArray(history)) {
        console.log('[Prompt Enhancer] Regenerate blocked: History is not an array')
        if (toast) {
          toast({
            title: "Cannot Regenerate",
            description: "History state is corrupted",
            variant: "destructive",
            duration: 3000,
          })
        }
        return
      }

      if (history.length === 0) {
        console.log('[Prompt Enhancer] Regenerate blocked: Empty history')
        if (toast) {
          toast({
            title: "Cannot Regenerate",
            description: "No enhancement history found",
            variant: "destructive",
            duration: 3000,
          })
        }
        return
      }

      const originalPrompt = history[0]

      if (!originalPrompt || typeof originalPrompt !== 'string') {
        console.log('[Prompt Enhancer] Regenerate blocked: Invalid original prompt')
        if (toast) {
          toast({
            title: "Cannot Regenerate",
            description: "Original prompt not found in history",
            variant: "destructive",
            duration: 3000,
          })
        }
        return
      }

      if (originalPrompt.trim().length < 2) {
        console.log('[Prompt Enhancer] Regenerate blocked: Original prompt too short')
        if (toast) {
          toast({
            title: "Cannot Regenerate",
            description: "Original prompt is too short to enhance",
            variant: "destructive",
            duration: 3000,
          })
        }
        return
      }

      console.log('[Prompt Enhancer] Starting regenerate with prompt:', originalPrompt.substring(0, 100))

      // Call the enhancement function with regenerate=true
      handleEnhancePrompt(true)

    } catch (error) {
      console.error('[Prompt Enhancer] Regenerate error:', error)
      if (toast) {
        toast({
          title: "🔄 Regeneration Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
          duration: 5000,
        })
      }
    }
  }, [hasEnhanced, isEnhancing, disabled, handleEnhancePrompt, history, historyIndex, toast, value])

  // Reset enhancement state
  const resetEnhancementState = useCallback(() => {
    console.log('[Prompt Enhancer] Resetting enhancement state')

    try {
      setHasEnhanced(false)
      setHistory([])
      setHistoryIndex(-1)
      setOriginalPrompt(null)
      setIsEnhancing(false)
      setIsEnhanced(false)

      console.log('[Prompt Enhancer] Enhancement state reset successfully')
    } catch (error) {
      console.error('[Prompt Enhancer] Error resetting enhancement state:', error)
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to submit
    if (e.key === "Enter" && !e.shiftKey && value.trim()) {
      e.preventDefault()

      // CRITICAL: Check if any social media download is in progress
      if (false) { /* Auto-download disabled - was checking download progress */
        console.log('[handleKeyDown] Blocked Enter submission - download in progress')
        return
      }

      // CRITICAL: Check if the current value contains social media URLs that would trigger download
      if (youtubeSettings.enabled && youtubeSettings.autoDownload && value) {
        const hasYouTube = extractYouTubeUrls(value).length > 0
        const hasInstagram = extractInstagramUrls(value).length > 0
        const hasTikTok = extractTikTokUrls(value).length > 0
        const hasFacebook = extractFacebookUrls(value).length > 0

        if (hasYouTube || hasInstagram || hasTikTok || hasFacebook) {
          console.log('[handleKeyDown] Blocked Enter submission - social media URLs detected')
          return
        }
      }

      onSubmit()
      adjustHeight(true)
    }

    // Ctrl/Cmd + E to enhance prompt
    if (e.key === "e" && (e.ctrlKey || e.metaKey) && value.trim().length >= 2 && !isEnhancing && !disabled) {
      e.preventDefault()
      handleEnhancePrompt()
    }

    // Ctrl/Cmd + Z: Undo (only if enhancement history exists)
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey && hasEnhanced) {
      e.preventDefault()
      handleUndo()
    }


    // Ctrl/Cmd + Shift + R: Regenerate (only if enhancement history exists)
    if (e.key === "r" && (e.ctrlKey || e.metaKey) && e.shiftKey && hasEnhanced) {
      e.preventDefault()
      handleRegenerate()
    }
  }, [value, onSubmit, adjustHeight, handleEnhancePrompt, isEnhancing, disabled, handleUndo, handleRegenerate, hasEnhanced, isDownloadingYoutube, isDownloadingInstagram, isDownloadingTikTok, isDownloadingFacebook, autoDownloadInProgress, youtubeSettings, extractYouTubeUrls, extractInstagramUrls, extractTikTokUrls, extractFacebookUrls])

  // Helper variables for button states
  const canUndo = hasEnhanced && historyIndex > 0 && !disabled
  const canRegenerate = hasEnhanced && !isEnhancing && !disabled

  const handleRevertPrompt = useCallback(() => {
    if (originalPrompt) {
      onChange(originalPrompt)
      setOriginalPrompt(null)
      adjustHeight()
      // Show feedback
      if (toast) {
        toast({
          title: "Reverted to Original",
          description: "Your original prompt has been restored",
          duration: 2000,
        })
      }
    }
  }, [originalPrompt, onChange, adjustHeight, toast])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (!value.trim() || disabled) return

    // CRITICAL: Check if any social media download is in progress
    if (false) { /* Auto-download disabled - was checking download progress */
      console.log('[handleSubmit] Blocked submission - download in progress')
      return
    }

    // CRITICAL: Check if the current value contains social media URLs that would trigger download
    if (youtubeSettings.enabled && youtubeSettings.autoDownload && value) {
      const hasYouTube = extractYouTubeUrls(value).length > 0
      const hasInstagram = extractInstagramUrls(value).length > 0
      const hasTikTok = extractTikTokUrls(value).length > 0
      const hasFacebook = extractFacebookUrls(value).length > 0

      if (hasYouTube || hasInstagram || hasTikTok || hasFacebook) {
        console.log('[handleSubmit] Blocked submission - social media URLs detected with auto-download enabled')
        // Clear the URLs from input
        let cleanedValue = value
        if (hasYouTube) {
          extractYouTubeUrls(value).forEach(urlInfo => {
            cleanedValue = cleanedValue.replace(urlInfo.url, '').trim()
          })
        }
        if (hasInstagram) {
          extractInstagramUrls(value).forEach(urlInfo => {
            cleanedValue = cleanedValue.replace(urlInfo.url, '').trim()
          })
        }
        if (hasTikTok) {
          extractTikTokUrls(value).forEach(urlInfo => {
            cleanedValue = cleanedValue.replace(urlInfo.url, '').trim()
          })
        }
        if (hasFacebook) {
          extractFacebookUrls(value).forEach(urlInfo => {
            cleanedValue = cleanedValue.replace(urlInfo.url, '').trim()
          })
        }
        onChange(cleanedValue)
        return
      }
    }

    // Reset enhancement state after successful submit
    resetEnhancementState()

    onSubmit()
    adjustHeight(true)
  }

  // File validation helper
  const isFileSupported = (file: File) => {
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'
    ]
    return supportedTypes.includes(file.type)
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragDepth(prev => {
      if (prev === 0) {
        setIsDragOver(true)
      }
      return prev + 1
    })
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragDepth(prev => {
      const newDepth = prev - 1
      if (newDepth === 0) {
        setIsDragOver(false)
      }
      return newDepth
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragDepth(0)
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const supportedFiles = files.filter(file => isFileSupported(file))

    if (supportedFiles.length > 0) {
      if (supportedFiles.length === 1 && onFileSelect) {
        // Handle single file
        onFileSelect(supportedFiles[0])
      } else if (supportedFiles.length > 1 && onFilesSelect) {
        // Handle multiple files
        onFilesSelect(supportedFiles)
      } else if (onFilesSelect) {
        // Fallback to multiple file handler for single file if no single file handler
        onFilesSelect(supportedFiles)
      }
    }
  }, [onFileSelect, onFilesSelect])

  // YouTube URL download handler
  const handleYouTubeDownload = useCallback(async (url: string, quality: string = 'auto') => {
    if (isDownloadingYoutube) return

    // Clear any existing files before starting YouTube download to prevent sending expired files
    if (selectedFile || (selectedFiles && selectedFiles.length > 0)) {
      console.log('[YouTube Download] Clearing existing files before download to prevent expired file errors')
      if (onFileRemove) onFileRemove()
      if (onAllFilesRemove) onAllFilesRemove()
    }

    setIsDownloadingYoutube(true)
    setYoutubeDownloadProgress({ status: 'downloading', progress: 0, message: `Preparing to download (${quality})...` })

    try {
      const result = await downloadYouTubeVideo(url, (progress) => {
        setYoutubeDownloadProgress(progress)
      }, quality)

      // Create a file object compatible with existing upload system
      const videoTitle = result.file.displayName || getDisplayTitleFromUrl(url)
      const downloadedFile = createFileFromYouTubeDownload(result, videoTitle)

      // Add the downloaded video directly to the file list (like Instagram does)
      // Mark the file to skip auto-analysis since it came from URL auto-download
      try {
        Object.defineProperty(downloadedFile, 'skipAutoAnalysis', {
          value: true,
          writable: true,
          configurable: true
        })
      } catch (e) {
        console.log('[YouTube Download] Could not set skipAutoAnalysis property')
      }

      if (onFileSelect) {
        onFileSelect(downloadedFile)
      } else if (onFilesSelect) {
        onFilesSelect([downloadedFile])
      }

      // Clear the YouTube URL from input after successful download
      onChange(value.replace(url, '').trim())

      // Clear detected YouTube URLs to hide the detection UI
      setDetectedYouTubeUrls([])

      // Show success message with video title
      if (toast) {
        toast({
          title: "✅ Video Downloaded",
          description: `"${videoTitle}" has been added to your files`,
          duration: 3000,
        })
      }

    } catch (error) {
      console.error('YouTube download failed:', error)
      if (toast) {
        toast({
          title: "❌ Download Failed",
          description: error instanceof Error ? error.message : "Failed to download YouTube video",
          variant: "destructive",
          duration: 5000,
        })
      }
    } finally {
      setIsDownloadingYoutube(false)
      setYoutubeDownloadProgress(null)
    }
  }, [isDownloadingYoutube, onChange, value, onFileSelect, onFilesSelect, toast, selectedFile, selectedFiles, onFileRemove, onAllFilesRemove])

  // Instagram URL download handler with auto-download support
  // Cookie authentication states
  const [showCookieManager, setShowCookieManager] = useState(false)
  const [pendingInstagramUrl, setPendingInstagramUrl] = useState<string | null>(null)

  const handleInstagramDownload = useCallback(async (url: string, isAutoDownload = false, cookies?: string) => {
    if (isDownloadingInstagram) return

    // Clear any existing files before starting Instagram download to prevent sending expired files
    if (selectedFile || (selectedFiles && selectedFiles.length > 0)) {
      console.log('[Instagram Download] Clearing existing files before download to prevent expired file errors')
      if (onFileRemove) onFileRemove()
      if (onAllFilesRemove) onAllFilesRemove()
    }

    setIsDownloadingInstagram(true)
    if (isAutoDownload) {
      setAutoDownloadInProgress(true)
    }
    setInstagramDownloadProgress({ status: 'downloading', progress: 0, message: 'Preparing to download Instagram media...' })

    try {
      const result = await downloadInstagramMedia(url, (progress) => {
        setInstagramDownloadProgress(progress)
      }, cookies ? { cookies } : undefined)

      // Create a file object compatible with existing upload system
      const mediaTitle = result.file.displayName || getInstagramDisplayTitle(url)
      console.log('[Instagram Download] Creating file with result:', {
        hasFile: !!result.file,
        hasThumbnail: !!result.thumbnail,
        thumbnailLength: result.thumbnail?.length || 0,
        mimeType: result.file?.mimeType,
        geminiUri: result.file?.uri,
        fileSize: result.file?.sizeBytes
      })
      const mockFile = createFileFromInstagramDownload(result, mediaTitle)

      // Add the downloaded media to the file list
      console.log('[Instagram Download] Mock file created:', {
        fileName: mockFile.name,
        fileType: mockFile.type,
        fileSize: mockFile.size,
        hasVideoThumbnail: !!(mockFile as any).videoThumbnail,
        thumbnailLength: (mockFile as any).videoThumbnail?.length || 0,
        thumbnailDataUrl: (mockFile as any).videoThumbnail?.substring(0, 100),
        hasGeminiFile: !!(mockFile as any).geminiFile,
        geminiUri: (mockFile as any).geminiFile?.uri,
        isPreUploaded: (mockFile as any).isPreUploaded
      })

      // Additional verification for video thumbnails
      if (mockFile.type.startsWith('video/') && !(mockFile as any).videoThumbnail) {
        console.warn('[Instagram Download] WARNING: Video file created without thumbnail!', {
          downloadResult: {
            hasThumbnail: !!result.thumbnail,
            thumbnailLength: result.thumbnail?.length || 0
          }
        })
      }

      // Debug the mockFile before passing it
      console.log('[handleInstagramDownload] File before passing to onFileSelect:', {
        name: mockFile.name,
        type: mockFile.type,
        hasVideoThumbnail: !!(mockFile as any).videoThumbnail,
        thumbnailLength: (mockFile as any).videoThumbnail?.length || 0,
        isInstagramVideo: (mockFile as any)._isInstagramVideo
      });

      if (onFileSelect) {
        // Create a new file object that preserves all custom properties
        const fileWithThumbnail = new File([mockFile], mockFile.name, { type: mockFile.type });

        // Copy all custom properties
        Object.keys(mockFile).forEach(key => {
          if (key !== 'size' && key !== 'name' && key !== 'type') {
            (fileWithThumbnail as any)[key] = (mockFile as any)[key];
          }
        });

        // Explicitly copy important properties
        if ((mockFile as any).videoThumbnail) {
          (fileWithThumbnail as any).videoThumbnail = (mockFile as any).videoThumbnail;
        }
        if ((mockFile as any).geminiFile) {
          (fileWithThumbnail as any).geminiFile = (mockFile as any).geminiFile;
        }
        if ((mockFile as any).isPreUploaded) {
          (fileWithThumbnail as any).isPreUploaded = (mockFile as any).isPreUploaded;
        }
        if ((mockFile as any)._isInstagramVideo) {
          (fileWithThumbnail as any)._isInstagramVideo = (mockFile as any)._isInstagramVideo;
        }

        console.log('[handleInstagramDownload] Passing file with preserved properties:', {
          hasVideoThumbnail: !!(fileWithThumbnail as any).videoThumbnail,
          thumbnailLength: (fileWithThumbnail as any).videoThumbnail?.length || 0
        });

        // Force thumbnail to be visible
        if (fileWithThumbnail.type.startsWith('video/') && (fileWithThumbnail as any).videoThumbnail) {
          console.log('[Instagram] Passing video with thumbnail to chat:', {
            name: fileWithThumbnail.name,
            thumbnailLength: (fileWithThumbnail as any).videoThumbnail.length,
            thumbnailPreview: (fileWithThumbnail as any).videoThumbnail.substring(0, 100)
          });
        }

        // Mark the file to skip auto-analysis since it came from URL auto-download
        try {
          Object.defineProperty(fileWithThumbnail, 'skipAutoAnalysis', {
            value: true,
            writable: true,
            configurable: true
          })
        } catch (e) {
          console.log('[Instagram Download] Could not set skipAutoAnalysis property')
        }

        onFileSelect(fileWithThumbnail)
      } else if (onFilesSelect) {
        // Similar handling for multiple files
        const fileWithThumbnail = new File([mockFile], mockFile.name, { type: mockFile.type });

        // Copy all custom properties
        Object.keys(mockFile).forEach(key => {
          if (key !== 'size' && key !== 'name' && key !== 'type') {
            (fileWithThumbnail as any)[key] = (mockFile as any)[key];
          }
        });

        // Explicitly copy important properties
        if ((mockFile as any).videoThumbnail) {
          (fileWithThumbnail as any).videoThumbnail = (mockFile as any).videoThumbnail;
        }
        if ((mockFile as any).geminiFile) {
          (fileWithThumbnail as any).geminiFile = (mockFile as any).geminiFile;
        }
        if ((mockFile as any).isPreUploaded) {
          (fileWithThumbnail as any).isPreUploaded = (mockFile as any).isPreUploaded;
        }
        if ((mockFile as any)._isInstagramVideo) {
          (fileWithThumbnail as any)._isInstagramVideo = (mockFile as any)._isInstagramVideo;
        }

        // Mark the file to skip auto-analysis since it came from URL auto-download
        try {
          Object.defineProperty(fileWithThumbnail, 'skipAutoAnalysis', {
            value: true,
            writable: true,
            configurable: true
          })
        } catch (e) {
          console.log('[Instagram Download] Could not set skipAutoAnalysis property')
        }

        onFilesSelect([fileWithThumbnail])
      }

      // Clear the Instagram URL from input after successful download
      onChange(value.replace(url, '').trim())

      // Clear detected Instagram URLs after successful download
      setDetectedInstagramUrls([])

      // Also clear any download progress immediately
      setInstagramDownloadProgress(null)

      // Show success message
      if (toast) {
        toast({
          title: "✅ Instagram Media Downloaded",
          description: `"${mediaTitle}" has been added to your files`,
          duration: 3000,
        })
      }

    } catch (error: any) {
      console.error('Instagram download failed:', error)

      // Check for authentication error response
      if (error.message === 'AUTHENTICATION_REQUIRED' ||
          (error.response && error.response.status === 401) ||
          error.message.includes('This content is private or requires authentication')) {
        // Store the URL and show cookie manager
        setPendingInstagramUrl(url)
        setShowCookieManager(true)

        if (toast) {
          toast({
            title: "🔒 Authentication Required",
            description: "This content requires Instagram login. Please provide your cookies.",
            duration: 5000,
          })
        }
      } else {
        // Enhanced error handling with specific messages
        let errorTitle = "❌ Download Failed"
        let errorDescription = "Failed to download Instagram media"

        if (error instanceof Error) {
          if (error.message.includes('rate') || error.message.includes('429')) {
            errorTitle = "⏱️ Rate Limited"
            errorDescription = "Too many requests. Please try again in a few minutes"
          } else if (error.message.includes('not found') || error.message.includes('404')) {
            errorTitle = "🔍 Content Not Found"
            errorDescription = "The Instagram post, reel, or story could not be found"
          } else if (error.message.includes('timeout')) {
            errorTitle = "⏰ Download Timeout"
            errorDescription = "The download took too long. Please try again"
          } else if (error.message.includes('network')) {
            errorTitle = "🌐 Network Error"
            errorDescription = "Unable to connect to Instagram. Check your internet connection"
          } else if (error.message.includes('unsupported')) {
            errorTitle = "❌ Unsupported Format"
            errorDescription = "This type of Instagram content is not supported"
          } else {
            errorDescription = error.message
          }
        }

        if (toast) {
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive",
            duration: 7000,
          })
        }
      }
    } finally {
      setIsDownloadingInstagram(false)
      setAutoDownloadInProgress(false)
      setInstagramDownloadProgress(null)
    }
  }, [isDownloadingInstagram, onChange, value, onFileSelect, onFilesSelect, toast, selectedFile, selectedFiles, onFileRemove, onAllFilesRemove])

  // Handle cookie authentication for Instagram
  const handleCookiesReady = useCallback((cookies: string) => {
    setShowCookieManager(false)
    if (pendingInstagramUrl) {
      // Retry the download with cookies
      handleInstagramDownload(pendingInstagramUrl, false, cookies)
      setPendingInstagramUrl(null)
    }
  }, [pendingInstagramUrl, handleInstagramDownload])

  const handleCookieManagerClose = useCallback(() => {
    setShowCookieManager(false)
    setPendingInstagramUrl(null)
  }, [])

  // Handle Instagram preview removal
  const handleInstagramPreviewRemove = useCallback((urlToRemove: string) => {
    setInstagramPreviews(prev => prev.filter(preview => preview.url !== urlToRemove))
    setDetectedInstagramUrls(prev => prev.filter(url => url.url !== urlToRemove))
    // Also remove the URL from the input text
    onChange(value.replace(urlToRemove, '').trim())
  }, [onChange, value])

  // TikTok URL download handler
  const handleTikTokDownload = useCallback(async (url: string) => {
    if (isDownloadingTikTok) return

    // Clear any existing files before starting TikTok download to prevent sending expired files
    if (selectedFile || (selectedFiles && selectedFiles.length > 0)) {
      console.log('[TikTok Download] Clearing existing files before download to prevent expired file errors')
      if (onFileRemove) onFileRemove()
      if (onAllFilesRemove) onAllFilesRemove()
    }

    setIsDownloadingTikTok(true)
    setTiktokDownloadProgress({ status: 'downloading', progress: 0, message: 'Preparing to download TikTok video...' })

    try {
      const result = await downloadTikTokVideo(url, (progress) => {
        setTiktokDownloadProgress(progress)
      })

      // Create a file object compatible with existing upload system
      const videoTitle = result.file.displayName || getTikTokDisplayTitle(url)
      
      // Initialize variable before use to avoid initialization errors
      let downloadedFile: File
      try {
        downloadedFile = createFileFromTikTokDownload(result, videoTitle)
      } catch (error) {
        console.error('[TikTok Download] Error creating file:', error)
        throw new Error('Failed to create file from TikTok download')
      }

      // Add the downloaded video directly to the file list (like Instagram does)
      // Mark the file to skip auto-analysis since it came from URL auto-download
      if (downloadedFile) {
        try {
          Object.defineProperty(downloadedFile, 'skipAutoAnalysis', {
            value: true,
            writable: true,
            configurable: true
          })
        } catch (e) {
          console.log('[TikTok Download] Could not set skipAutoAnalysis property')
        }
      }

      if (onFileSelect && downloadedFile) {
        onFileSelect(downloadedFile)
      } else if (onFilesSelect && downloadedFile) {
        onFilesSelect([downloadedFile])
      }

      // Clear the TikTok URL from input after successful download
      onChange(value.replace(url, '').trim())

      // Clear detected TikTok URLs to hide the detection UI
      setDetectedTikTokUrls([])

      // Show success message with video title
      if (toast) {
        toast({
          title: "✅ TikTok Video Downloaded",
          description: `"${videoTitle}" has been added to your files`,
          duration: 3000,
        })
      }

    } catch (error) {
      console.error('TikTok download failed:', error)
      if (toast) {
        toast({
          title: "❌ Download Failed",
          description: error instanceof Error ? error.message : "Failed to download TikTok video",
          variant: "destructive",
          duration: 5000,
        })
      }
    } finally {
      setIsDownloadingTikTok(false)
      setTiktokDownloadProgress(null)
    }
  }, [isDownloadingTikTok, onChange, value, onFileSelect, onFilesSelect, toast, selectedFile, selectedFiles, onFileRemove, onAllFilesRemove])

  // Facebook URL download handler
  const handleFacebookDownload = useCallback(async (url: string) => {
    if (isDownloadingFacebook) return

    // Clear any existing files before starting Facebook download to prevent sending expired files
    if (selectedFile || (selectedFiles && selectedFiles.length > 0)) {
      console.log('[Facebook Download] Clearing existing files before download to prevent expired file errors')
      if (onFileRemove) onFileRemove()
      if (onAllFilesRemove) onAllFilesRemove()
    }

    // Clear any existing Facebook URLs to ensure fresh download
    setDetectedFacebookUrls([])

    setIsDownloadingFacebook(true)
    setFacebookDownloadProgress({ status: 'downloading', progress: 0, message: 'Preparing to download Facebook video...' })

    try {
      const result = await downloadFacebookMedia(url, (progress) => {
        setFacebookDownloadProgress(progress)
      })

      // Create a file object compatible with existing upload system
      const videoTitle = result.file.displayName || getFacebookDisplayTitle(url)
      const downloadedFile = createFileFromFacebookDownload(result, videoTitle)

      // Add the downloaded video directly to the file list
      // Mark the file to skip auto-analysis since it came from URL auto-download
      try {
        Object.defineProperty(downloadedFile, 'skipAutoAnalysis', {
          value: true,
          writable: true,
          configurable: true
        })
      } catch (e) {
        console.log('[Facebook Download] Could not set skipAutoAnalysis property')
      }

      if (onFileSelect) {
        onFileSelect(downloadedFile)
      } else if (onFilesSelect) {
        onFilesSelect([downloadedFile])
      }

      // Clear the Facebook URL from input after successful download
      onChange(value.replace(url, '').trim())

      // Clear detected Facebook URLs to hide the detection UI
      setDetectedFacebookUrls([])

      // Show success message with video title
      if (toast) {
        toast({
          title: "✅ Facebook Video Downloaded",
          description: `"${videoTitle}" has been added to your files`,
          duration: 3000,
        })
      }

    } catch (error) {
      console.error('Facebook download failed:', error)
      if (toast) {
        // Check for authentication errors
        if (error instanceof Error && (error.message === 'AUTHENTICATION_REQUIRED' || (error as any).requiresAuth)) {
          // Store the URL for retry after authentication
          setPendingInstagramUrl(url) // Reuse the same state as Instagram for now
          setShowCookieManager(true)
          toast({
            title: "🔐 Authentication Required",
            description: "This Facebook content requires login. Please provide cookies.",
            duration: 5000,
          })
        } else {
          toast({
            title: "❌ Download Failed",
            description: error instanceof Error ? error.message : "Failed to download Facebook video",
            variant: "destructive",
            duration: 5000,
          })
        }
      }
    } finally {
      setIsDownloadingFacebook(false)
      setFacebookDownloadProgress(null)
    }
  }, [isDownloadingFacebook, onChange, value, onFileSelect, onFilesSelect, toast, selectedFile, selectedFiles, onFileRemove, onAllFilesRemove])


  // Handle text change and detect YouTube and Instagram URLs
  const handleTextChange = useCallback((newValue: string) => {
    onChange(newValue)

    // Only detect YouTube URLs if the feature is enabled and auto-detection is on
    if (youtubeSettings.enabled && youtubeSettings.autoDetectUrls) {
      const detectedUrls = extractYouTubeUrls(newValue)
      if (detectedUrls.length > 0) {
        // If auto-download is enabled, trigger download immediately
        if (youtubeSettings.autoDownload && !isDownloadingYoutube) {
          const firstUrl = detectedUrls[0]
          const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
          if (urlToDownload) {
            // Clear the URL from input immediately
            const cleanedValue = newValue.replace(urlToDownload, '').trim()
            onChange(cleanedValue)
            console.log('[YouTube] Removed URL from input during auto-download')

            // Start download
            handleYouTubeDownload(urlToDownload, youtubeSettings.defaultQuality)
          }
          // Clear detected URLs when auto-downloading
          setDetectedYouTubeUrls([])
        } else {
          // Show detected URLs for manual download
          setDetectedYouTubeUrls(detectedUrls.map(url => ({
            url: url.normalizedUrl || url.url,
            videoId: url.videoId || ''
          })))
        }
      } else {
        setDetectedYouTubeUrls([])
      }
    } else {
      // Clear detected URLs if feature is disabled
      setDetectedYouTubeUrls([])
    }

    // Detect Instagram URLs (using YouTube settings for now)
    if (youtubeSettings.enabled && youtubeSettings.autoDetectUrls) {
      const detectedInstagramUrlsInfo = extractInstagramUrls(newValue)
      if (detectedInstagramUrlsInfo.length > 0) {
        // If auto-download is enabled, trigger download immediately
        if (youtubeSettings.autoDownload && !isDownloadingInstagram && !autoDownloadInProgress) {
          const firstUrl = detectedInstagramUrlsInfo[0]
          const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
          if (urlToDownload) {
            // Clear the URL from input immediately
            const cleanedValue = newValue.replace(urlToDownload, '').trim()
            onChange(cleanedValue)
            console.log('[Instagram] Removed URL from input during auto-download')

            // Start download
            handleInstagramDownload(urlToDownload, true)
          }
          // Clear detected URLs when auto-downloading
          setDetectedInstagramUrls([])
          setInstagramPreviews([])
        } else if (!youtubeSettings.autoDownload) {
          // Show Instagram previews for manual download
          const newPreviews = detectedInstagramUrlsInfo.map(url => ({
            url: url.normalizedUrl || url.url,
            mediaId: url.mediaId || '',
            type: url.type || 'post'
          }))
          setInstagramPreviews(newPreviews)
          // Also keep the old detection for backward compatibility
          setDetectedInstagramUrls(newPreviews)
        }
      } else {
        setInstagramPreviews([])
        setDetectedInstagramUrls([])
      }
    } else {
      setInstagramPreviews([])
      setDetectedInstagramUrls([])
    }

    // Detect TikTok URLs (using YouTube settings for now)
    if (youtubeSettings.enabled && youtubeSettings.autoDetectUrls) {
      const detectedTikTokUrlsInfo = extractTikTokUrls(newValue)
      if (detectedTikTokUrlsInfo.length > 0) {
        // If auto-download is enabled, trigger download immediately
        if (youtubeSettings.autoDownload && !isDownloadingTikTok) {
          const firstUrl = detectedTikTokUrlsInfo[0]
          const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
          if (urlToDownload) {
            // Clear the URL from input immediately
            const cleanedValue = newValue.replace(urlToDownload, '').trim()
            onChange(cleanedValue)
            console.log('[TikTok] Removed URL from input during auto-download')

            // Start download
            // Defer to avoid closure issues
            setTimeout(() => {
              handleTikTokDownload(urlToDownload)
            }, 0)
          }
          // Clear detected URLs when auto-downloading
          setDetectedTikTokUrls([])
        } else {
          // Show detected TikTok URLs for manual download
          setDetectedTikTokUrls(detectedTikTokUrlsInfo.map(url => ({
            url: url.normalizedUrl || url.url,
            videoId: url.videoId,
            username: url.username
          })))
        }
      } else {
        setDetectedTikTokUrls([])
      }
    } else {
      setDetectedTikTokUrls([])
    }

    // Detect Facebook URLs (using YouTube settings for now)
    if (youtubeSettings.enabled && youtubeSettings.autoDetectUrls) {
      const detectedFacebookUrlsInfo = extractFacebookUrls(newValue)
      if (detectedFacebookUrlsInfo.length > 0) {
        // Before processing, remove any existing files that might be from the same Facebook video
        // This prevents using expired file references
        if (selectedFiles && selectedFiles.length > 0) {
          const facebookVideoId = detectedFacebookUrlsInfo[0].videoId
          if (facebookVideoId) {
            const filteredFiles = selectedFiles.filter(file =>
              !file.name.includes(facebookVideoId)
            )
            if (filteredFiles.length !== selectedFiles.length && onFilesSelect) {
              console.log('[Facebook] Removing expired Facebook video file before new download')
              onFilesSelect(filteredFiles)
            }
          }
        }

        // If auto-download is enabled, trigger download immediately
        if (youtubeSettings.autoDownload && !isDownloadingFacebook) {
          const firstUrl = detectedFacebookUrlsInfo[0]
          const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
          if (urlToDownload) {
            // Clear the URL from input immediately
            const cleanedValue = newValue.replace(urlToDownload, '').trim()
            onChange(cleanedValue)
            console.log('[Facebook] Removed URL from input during auto-download')

            // Start download
            handleFacebookDownload(urlToDownload)
          }
          // Clear detected URLs when auto-downloading
          setDetectedFacebookUrls([])
        } else {
          // Show detected Facebook URLs for manual download
          setDetectedFacebookUrls(detectedFacebookUrlsInfo.map(url => ({
            url: url.normalizedUrl || url.url,
            videoId: url.videoId,
            type: url.type
          })))
        }
      } else {
        setDetectedFacebookUrls([])
      }
    } else {
      setDetectedFacebookUrls([])
    }
  }, [onChange, youtubeSettings.enabled, youtubeSettings.autoDetectUrls, youtubeSettings.autoDownload, youtubeSettings.defaultQuality, isDownloadingYoutube, handleYouTubeDownload, isDownloadingInstagram, autoDownloadInProgress, handleInstagramDownload, isDownloadingTikTok, handleTikTokDownload, isDownloadingFacebook, handleFacebookDownload, selectedFiles, onFilesSelect])

  // Paste handler
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Get clipboard text first
    const clipboardText = e.clipboardData.getData('text')

    // Check if we should intercept paste for auto-download
    let shouldBlockPaste = false

    // Check clipboard for text content that might contain social media URLs
    if (youtubeSettings.enabled && youtubeSettings.autoDetectUrls && youtubeSettings.autoDownload && clipboardText) {
      if (clipboardText) {
        // Check for YouTube URLs
        const detectedYouTubeUrlsList = extractYouTubeUrls(clipboardText)
        if (detectedYouTubeUrlsList.length > 0) {
          // Check if auto-download is enabled
          if (youtubeSettings.autoDownload) {
            // Prevent default paste immediately
            e.preventDefault()
            e.stopPropagation()
            shouldBlockPaste = true

            // Clear detected URLs immediately before starting download
            setDetectedYouTubeUrls([])

            // Auto-download the first detected YouTube URL
            const firstUrl = detectedYouTubeUrlsList[0]
            const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
            if (urlToDownload) {
              // Remove URL from input but keep any other text
              const cleanedText = clipboardText.replace(urlToDownload, '').trim()
              if (cleanedText) {
                onChange(value + (value ? ' ' : '') + cleanedText)
              }

              // Start download
              handleYouTubeDownload(urlToDownload, youtubeSettings.defaultQuality)
            }
            return // Exit paste handler completely
          } else {
            // Show the detected URLs UI for manual download
            setDetectedYouTubeUrls(prev => {
              const newUrls = detectedYouTubeUrlsList.map(url => ({
                url: url.normalizedUrl || url.url,
                videoId: url.videoId || ''
              }))
              return [...prev, ...newUrls].filter((url, index, self) =>
                index === self.findIndex(u => u.url === url.url)
              ) // Remove duplicates
            })
          }
        }

        // Check for Instagram URLs
        const detectedInstagramUrlsList = extractInstagramUrls(clipboardText)
        if (detectedInstagramUrlsList.length > 0) {
          // Check if auto-download is enabled (using YouTube settings for now)
          if (youtubeSettings.autoDownload) {
            // Prevent default paste immediately
            e.preventDefault()
            e.stopPropagation()
            shouldBlockPaste = true

            // Clear detected URLs immediately before starting download
            setDetectedInstagramUrls([])

            // Auto-download the first detected Instagram URL
            const firstUrl = detectedInstagramUrlsList[0]
            const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
            if (urlToDownload) {
              // CRITICAL: Clear the current input value completely before download
              onChange('')
              console.log('[Instagram] Cleared input completely before download')

              // Extract any non-URL text from clipboard
              const cleanedText = clipboardText.replace(urlToDownload, '').trim()

              // Start download
              handleInstagramDownload(urlToDownload, true)

              // After a delay, restore any non-URL text
              if (cleanedText) {
                setTimeout(() => {
                  onChange(cleanedText)
                }, 100)
              }
            }
            return // Exit paste handler completely
          } else {
            // Show Instagram previews for manual download
            const newPreviews = detectedInstagramUrlsList.map(url => ({
              url: url.normalizedUrl || url.url,
              mediaId: url.mediaId || '',
              type: url.type || 'post'
            }))
            setInstagramPreviews(prev => {
              const combined = [...prev, ...newPreviews]
              return combined.filter((url, index, self) =>
                index === self.findIndex(u => u.url === url.url)
              ) // Remove duplicates
            })
            // Also keep the old detection for backward compatibility
            setDetectedInstagramUrls(prev => {
              const combined = [...prev, ...newPreviews]
              return combined.filter((url, index, self) =>
                index === self.findIndex(u => u.url === url.url)
              ) // Remove duplicates
            })
          }
        }

        // Check for TikTok URLs
        const detectedTikTokUrlsList = extractTikTokUrls(clipboardText)
        if (detectedTikTokUrlsList.length > 0) {
          // Check if auto-download is enabled (using YouTube settings for now)
          if (youtubeSettings.autoDownload) {
            // Prevent default paste immediately
            e.preventDefault()
            e.stopPropagation()
            shouldBlockPaste = true

            // Clear detected URLs immediately before starting download
            setDetectedTikTokUrls([])

            // Auto-download the first detected TikTok URL
            const firstUrl = detectedTikTokUrlsList[0]
            const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
            if (urlToDownload) {
              // Remove URL from input but keep any other text
              const cleanedText = clipboardText.replace(urlToDownload, '').trim()
              if (cleanedText) {
                onChange(value + (value ? ' ' : '') + cleanedText)
              }

              // Start download
            // Defer to avoid closure issues
            setTimeout(() => {
              handleTikTokDownload(urlToDownload)
            }, 0)
            }
            return // Exit paste handler completely
          } else {
            // Show the detected URLs for manual download
            setDetectedTikTokUrls(prev => {
              const newUrls = detectedTikTokUrlsList.map(url => ({
                url: url.normalizedUrl || url.url,
                videoId: url.videoId,
                username: url.username
              }))
              return [...prev, ...newUrls].filter((url, index, self) =>
                index === self.findIndex(u => u.url === url.url)
              ) // Remove duplicates
            })
          }
        }

        // Check for Facebook URLs
        const detectedFacebookUrlsList = extractFacebookUrls(clipboardText)
        if (detectedFacebookUrlsList.length > 0) {
          // Before processing, remove any existing files that might be from the same Facebook video
          // This prevents using expired file references
          if (selectedFiles && selectedFiles.length > 0) {
            const facebookVideoId = detectedFacebookUrlsList[0].videoId
            if (facebookVideoId) {
              const filteredFiles = selectedFiles.filter(file =>
                !file.name.includes(facebookVideoId)
              )
              if (filteredFiles.length !== selectedFiles.length && onFilesSelect) {
                console.log('[Facebook] Removing expired Facebook video file before new download (paste)')
                onFilesSelect(filteredFiles)
              }
            }
          }

          // Check if auto-download is enabled (using YouTube settings for now)
          if (youtubeSettings.autoDownload) {
            // Prevent default paste immediately
            e.preventDefault()
            e.stopPropagation()
            shouldBlockPaste = true

            // Clear detected URLs immediately before starting download
            setDetectedFacebookUrls([])

            // Auto-download the first detected Facebook URL
            const firstUrl = detectedFacebookUrlsList[0]
            const urlToDownload = firstUrl.normalizedUrl || firstUrl.url
            if (urlToDownload) {
              // Remove URL from input but keep any other text
              const cleanedText = clipboardText.replace(urlToDownload, '').trim()
              if (cleanedText) {
                onChange(value + (value ? ' ' : '') + cleanedText)
              }

              // Start download
              handleFacebookDownload(urlToDownload)
            }
            return // Exit paste handler completely
          } else {
            // Show the detected URLs for manual download
            setDetectedFacebookUrls(prev => {
              const newUrls = detectedFacebookUrlsList.map(url => ({
                url: url.normalizedUrl || url.url,
                videoId: url.videoId,
                type: url.type
              }))
              return [...prev, ...newUrls].filter((url, index, self) =>
                index === self.findIndex(u => u.url === url.url)
              ) // Remove duplicates
            })
          }
        }
      }
    }

    // Only call parent onPaste if we didn't block the paste
    if (!shouldBlockPaste && onPaste) {
      onPaste(e)
    }

    // Handle file pasting if no social media URL was auto-downloaded
    if (!shouldBlockPaste) {
      const items = Array.from(e.clipboardData.items)
      const fileItem = items.find(item => item.kind === 'file')

      if (fileItem && onFileSelect) {
        const file = fileItem.getAsFile()
        if (file && isFileSupported(file)) {
          onFileSelect(file)
        }
      }
    }
  }, [onFileSelect, onPaste, youtubeSettings.enabled, youtubeSettings.autoDetectUrls, youtubeSettings.autoDownload, youtubeSettings.defaultQuality, handleYouTubeDownload, handleInstagramDownload, handleTikTokDownload, handleFacebookDownload, value, onChange])

  // URL detection is handled directly in the onChange handler
  // Removed problematic useEffect that was causing auto-submission loops

  return (
    <div className="w-full py-4">
      <div
        className={cn(
          "bg-[#2B2B2B] rounded-2xl p-1.5 border transition-all duration-200",
          isDragOver
            ? "border-blue-400 ring-2 ring-blue-400 ring-offset-2 ring-offset-[#1E1E1E] bg-blue-500/5"
            : "border-[#4A4A4A] focus-within:ring-2 focus-within:ring-[#4A4A4A] focus-within:ring-offset-2 focus-within:ring-offset-[#1E1E1E]"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Multiple files preview - show when we have multiple files OR both single and multiple */}
        {(selectedFiles && selectedFiles.length > 0) && (
          <div className="mx-4 mt-2 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[#B0B0B0]">
                {/* Count both selectedFile and selectedFiles if both exist */}
                {(selectedFile ? 1 : 0) + selectedFiles.length} file{((selectedFile ? 1 : 0) + selectedFiles.length) > 1 ? 's' : ''} selected
              </span>
              {/* Add clear all button */}
              {onAllFilesRemove && (
                <button
                  type="button"
                  onClick={onAllFilesRemove}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div>
              {/* Responsive grid layout for file thumbnails */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {/* Show selectedFile first if it exists */}
                {selectedFile && (
                  <div className="bg-[#333333] rounded-lg p-2 relative group">
                    <div
                      className="cursor-pointer hover:bg-[#4A4A4A] rounded p-1 -m-1 transition-colors"
                      onClick={() => onFileClick?.(selectedFile)}
                      title={`${selectedFile.file.name}\nClick to view options`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {/* File thumbnail/icon */}
                        <div className="w-16 h-16 rounded overflow-hidden bg-black/30 flex items-center justify-center flex-shrink-0">
                          {selectedFile.file.type.startsWith("image/") ? (
                            <>
                              {selectedFile.preview ? (
                                <img
                                  src={selectedFile.preview}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-[#B0B0B0]" />
                              )}
                            </>
                          ) : selectedFile.file.type.startsWith("video/") ? (
                            <>
                              {(() => {
                                // Check both locations for thumbnail
                                const thumbnailToUse = selectedFile.videoThumbnail || (selectedFile.file as any).videoThumbnail;

                                if (selectedFile.file.name.toLowerCase().includes('instagram')) {
                                  console.log('[Selected Video Thumbnail Debug]', {
                                    fileName: selectedFile.file.name,
                                    hasSelectedFileThumbnail: !!selectedFile.videoThumbnail,
                                    hasFileThumbnail: !!(selectedFile.file as any).videoThumbnail,
                                    thumbnailLength: thumbnailToUse?.length || 0
                                  });
                                }

                                return thumbnailToUse ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={thumbnailToUse}
                                      alt="Video thumbnail"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.error('[Selected Video Thumbnail] Failed to load');
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <Video className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <Video className="w-5 h-5 text-[#B0B0B0]" />
                                );
                              })()}
                            </>
                          ) : (
                            <FileAudio className="w-5 h-5 text-[#B0B0B0]" />
                          )}
                        </div>
                        {/* File name */}
                        <p className="text-xs text-[#B0B0B0] text-center truncate w-full px-1" title={selectedFile.file.name}>
                          {selectedFile.file.name}
                        </p>
                      </div>
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={onFileRemove}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove file"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}

                {/* Then show all files from selectedFiles */}
                {selectedFiles.map((file, index) => (
                  <div key={index} className="bg-[#333333] rounded-lg p-2 relative group">
                    <div
                      className="cursor-pointer hover:bg-[#4A4A4A] rounded p-1 -m-1 transition-colors"
                      onClick={() => onFileClick?.(file, index)}
                      title={`${file.file.name}\nClick to view options`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {/* File thumbnail/icon */}
                        <div className="w-16 h-16 rounded overflow-hidden bg-black/30 flex items-center justify-center flex-shrink-0">
                          {file.file.type.startsWith("image/") ? (
                            <>
                              {file.preview ? (
                                <img
                                  src={file.preview}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-[#B0B0B0]" />
                              )}
                            </>
                          ) : file.file.type.startsWith("video/") ? (
                            <>
                              {(() => {
                                // Debug logging for video thumbnails
                                const hasDirectThumbnail = !!file.videoThumbnail;
                                const hasFileThumbnail = !!(file.file as any).videoThumbnail;
                                const thumbnailToUse = file.videoThumbnail || (file.file as any).videoThumbnail;

                                if (file.file.name.toLowerCase().includes('instagram')) {
                                  console.log('[Video Thumbnail Debug]', {
                                    fileName: file.file.name,
                                    hasDirectThumbnail,
                                    hasFileThumbnail,
                                    directThumbnailLength: file.videoThumbnail?.length || 0,
                                    fileThumbnailLength: (file.file as any).videoThumbnail?.length || 0,
                                    isInstagramVideo: (file.file as any)._isInstagramVideo,
                                    fileObject: file
                                  });
                                }

                                return thumbnailToUse ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={thumbnailToUse}
                                      alt="Video thumbnail"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.error('[Video Thumbnail] Failed to load:', {
                                          fileName: file.file.name,
                                          thumbnailLength: thumbnailToUse.length,
                                          thumbnailPreview: thumbnailToUse.substring(0, 100)
                                        });
                                        // Hide broken image and show video icon
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                      onLoad={() => {
                                        console.log('[Video Thumbnail] Successfully loaded for:', file.file.name);
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <Video className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <Video className="w-5 h-5 text-[#B0B0B0]" />
                                );
                              })()}
                            </>
                          ) : (
                            <FileAudio className="w-5 h-5 text-[#B0B0B0]" />
                          )}
                        </div>
                        {/* File name */}
                        <p className="text-xs text-[#B0B0B0] text-center truncate w-full px-1" title={file.file.name}>
                          {file.file.name}
                        </p>
                      </div>
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => onFilesRemove?.(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove file"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* YouTube download progress indicator */}
        {youtubeDownloadProgress && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-[#B0B0B0] truncate">
                      {youtubeDownloadProgress.message || 'Downloading YouTube video...'}
                    </p>
                    {youtubeDownloadProgress.progress !== undefined && (
                      <span className="text-xs text-[#808080]">
                        {Math.round(youtubeDownloadProgress.progress)}%
                      </span>
                    )}
                  </div>
                  {youtubeDownloadProgress.progress !== undefined && (
                    <div className="w-full bg-[#2B2B2B] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full bg-red-500 rounded-full transition-all duration-300 ${
                          youtubeDownloadProgress.progress === 0 ? 'w-0' :
                          youtubeDownloadProgress.progress <= 5 ? 'w-[5%]' :
                          youtubeDownloadProgress.progress <= 10 ? 'w-[10%]' :
                          youtubeDownloadProgress.progress <= 15 ? 'w-[15%]' :
                          youtubeDownloadProgress.progress <= 20 ? 'w-[20%]' :
                          youtubeDownloadProgress.progress <= 25 ? 'w-1/4' :
                          youtubeDownloadProgress.progress <= 30 ? 'w-[30%]' :
                          youtubeDownloadProgress.progress <= 35 ? 'w-[35%]' :
                          youtubeDownloadProgress.progress <= 40 ? 'w-[40%]' :
                          youtubeDownloadProgress.progress <= 45 ? 'w-[45%]' :
                          youtubeDownloadProgress.progress <= 50 ? 'w-1/2' :
                          youtubeDownloadProgress.progress <= 55 ? 'w-[55%]' :
                          youtubeDownloadProgress.progress <= 60 ? 'w-[60%]' :
                          youtubeDownloadProgress.progress <= 65 ? 'w-[65%]' :
                          youtubeDownloadProgress.progress <= 70 ? 'w-[70%]' :
                          youtubeDownloadProgress.progress <= 75 ? 'w-3/4' :
                          youtubeDownloadProgress.progress <= 80 ? 'w-[80%]' :
                          youtubeDownloadProgress.progress <= 85 ? 'w-[85%]' :
                          youtubeDownloadProgress.progress <= 90 ? 'w-[90%]' :
                          youtubeDownloadProgress.progress <= 95 ? 'w-[95%]' :
                          'w-full'
                        }`}
                        aria-valuenow={youtubeDownloadProgress.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                      />
                    </div>
                  )}
                  {youtubeDownloadProgress.status === 'error' && youtubeDownloadProgress.error && (
                    <p className="text-xs text-red-400 mt-1">
                      {youtubeDownloadProgress.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YouTube URL detection and download prompt */}
        {detectedYouTubeUrls.length > 0 && !isDownloadingYoutube && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <Video className="w-3 h-3 text-white" />
                </div>
                <h3 className="text-sm font-medium text-[#E0E0E0]">
                  YouTube Video{detectedYouTubeUrls.length > 1 ? 's' : ''} Detected
                </h3>
              </div>
              <div className="space-y-3">
                {detectedYouTubeUrls.map((urlData, index) => (
                  <div key={index} className="p-3 bg-[#2B2B2B] rounded border border-[#404040]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#B0B0B0] truncate" title={urlData.url}>
                          Video ID: {urlData.videoId}
                        </p>
                        <p className="text-xs text-[#808080] truncate">
                          {urlData.url}
                        </p>
                      </div>
                    </div>

                    {/* Quality selection - only show if enabled in settings */}
                    {youtubeSettings.showQualitySelector && (
                      <div className="mb-3">
                        <label className="text-xs text-[#B0B0B0] mb-1 block">Quality:</label>
                        <select
                          className="w-full bg-[#1E1E1E] border border-[#4A4A4A] rounded px-2 py-1 text-xs text-white"
                          defaultValue={youtubeSettings.defaultQuality}
                          id={`quality-${index}`}
                          aria-label="Video quality selection"
                        >
                          <option value="auto">Auto (Best Available)</option>
                          <option value="1080p">1080p (High)</option>
                          <option value="720p">720p (Medium)</option>
                          <option value="480p">480p (Low)</option>
                          <option value="audio">Audio Only</option>
                        </select>
                      </div>
                    )}

                    {/* Download buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Get quality from selector if shown, otherwise use default from settings
                          let quality = youtubeSettings.defaultQuality
                          if (youtubeSettings.showQualitySelector) {
                            const qualitySelect = document.getElementById(`quality-${index}`) as HTMLSelectElement
                            quality = qualitySelect?.value || youtubeSettings.defaultQuality
                          }

                          // Pass quality preference to download function
                          handleYouTubeDownload(urlData.url, quality)

                          // Remove this URL from detected list once download starts
                          setDetectedYouTubeUrls(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5 flex-1"
                      >
                        <Video className="w-3 h-3" />
                        Download Video
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Quick download with default settings
                          handleYouTubeDownload(urlData.url, youtubeSettings.defaultQuality)
                          setDetectedYouTubeUrls(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="px-2 py-1.5 bg-[#4A4A4A] hover:bg-[#5A5A5A] text-white text-xs rounded-md transition-colors"
                        title={`Quick download with ${youtubeSettings.defaultQuality} quality`}
                      >
                        Quick
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-[#808080]">
                  Videos will be downloaded and added to your files (max {youtubeSettings.maxFileSize}MB)
                </p>
                <button
                  type="button"
                  onClick={() => setDetectedYouTubeUrls([])}
                  className="text-xs text-[#808080] hover:text-white transition-colors"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instagram download progress indicator */}
        {instagramDownloadProgress && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-[#B0B0B0] truncate">
                      {instagramDownloadProgress.message || 'Downloading Instagram media...'}
                    </p>
                    {instagramDownloadProgress.progress !== undefined && (
                      <span className="text-xs text-[#808080]">
                        {Math.round(instagramDownloadProgress.progress)}%
                      </span>
                    )}
                  </div>
                  {instagramDownloadProgress.progress !== undefined && (
                    <div className="w-full bg-[#2B2B2B] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300 ${
                          instagramDownloadProgress.progress === 0 ? 'w-0' :
                          instagramDownloadProgress.progress <= 5 ? 'w-[5%]' :
                          instagramDownloadProgress.progress <= 10 ? 'w-[10%]' :
                          instagramDownloadProgress.progress <= 15 ? 'w-[15%]' :
                          instagramDownloadProgress.progress <= 20 ? 'w-[20%]' :
                          instagramDownloadProgress.progress <= 25 ? 'w-1/4' :
                          instagramDownloadProgress.progress <= 30 ? 'w-[30%]' :
                          instagramDownloadProgress.progress <= 35 ? 'w-[35%]' :
                          instagramDownloadProgress.progress <= 40 ? 'w-[40%]' :
                          instagramDownloadProgress.progress <= 45 ? 'w-[45%]' :
                          instagramDownloadProgress.progress <= 50 ? 'w-1/2' :
                          instagramDownloadProgress.progress <= 55 ? 'w-[55%]' :
                          instagramDownloadProgress.progress <= 60 ? 'w-[60%]' :
                          instagramDownloadProgress.progress <= 65 ? 'w-[65%]' :
                          instagramDownloadProgress.progress <= 70 ? 'w-[70%]' :
                          instagramDownloadProgress.progress <= 75 ? 'w-3/4' :
                          instagramDownloadProgress.progress <= 80 ? 'w-[80%]' :
                          instagramDownloadProgress.progress <= 85 ? 'w-[85%]' :
                          instagramDownloadProgress.progress <= 90 ? 'w-[90%]' :
                          instagramDownloadProgress.progress <= 95 ? 'w-[95%]' :
                          'w-full'
                        }`}
                        aria-valuenow={instagramDownloadProgress.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                      />
                    </div>
                  )}
                  {instagramDownloadProgress.status === 'error' && instagramDownloadProgress.error && (
                    <p className="text-xs text-red-400 mt-1">
                      {instagramDownloadProgress.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instagram URL detection and download prompt */}
        {detectedInstagramUrls.length > 0 && !isDownloadingInstagram && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-3 h-3 text-white" />
                </div>
                <h3 className="text-sm font-medium text-[#E0E0E0]">
                  Instagram {detectedInstagramUrls.length > 1 ? 'Media' : detectedInstagramUrls[0]?.type === 'reel' ? 'Reel' : 'Post'} Detected
                </h3>
              </div>
              <div className="space-y-3">
                {detectedInstagramUrls.map((urlData, index) => (
                  <div key={index} className="p-3 bg-[#2B2B2B] rounded border border-[#404040]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#B0B0B0] truncate" title={urlData.url}>
                          {urlData.type === 'reel' ? 'Reel' : urlData.type === 'story' ? 'Story' : 'Post'} ID: {urlData.mediaId}
                        </p>
                        <p className="text-xs text-[#808080] truncate">
                          {urlData.url}
                        </p>
                      </div>
                    </div>

                    {/* Download buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleInstagramDownload(urlData.url)

                          // Remove this URL from detected list once download starts
                          setDetectedInstagramUrls(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5 flex-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Download {urlData.type === 'reel' ? 'Reel' : 'Media'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Quick download
                          handleInstagramDownload(urlData.url)
                          setDetectedInstagramUrls(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="px-2 py-1.5 bg-[#4A4A4A] hover:bg-[#5A5A5A] text-white text-xs rounded-md transition-colors"
                        title="Quick download"
                      >
                        Quick
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-[#808080]">
                  Media will be downloaded and added to your files
                </p>
                <button
                  type="button"
                  onClick={() => setDetectedInstagramUrls([])}
                  className="text-xs text-[#808080] hover:text-white transition-colors"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TikTok download progress indicator */}
        {tiktokDownloadProgress && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-[#B0B0B0] truncate">
                      {tiktokDownloadProgress.message || 'Downloading TikTok video...'}
                    </p>
                    {tiktokDownloadProgress.progress !== undefined && (
                      <span className="text-xs text-[#808080]">
                        {Math.round(tiktokDownloadProgress.progress)}%
                      </span>
                    )}
                  </div>
                  {tiktokDownloadProgress.progress !== undefined && (
                    <div className="w-full bg-[#2B2B2B] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-black to-gray-600 rounded-full transition-all duration-300 ${
                          tiktokDownloadProgress.progress === 0 ? 'w-0' :
                          tiktokDownloadProgress.progress <= 5 ? 'w-[5%]' :
                          tiktokDownloadProgress.progress <= 10 ? 'w-[10%]' :
                          tiktokDownloadProgress.progress <= 15 ? 'w-[15%]' :
                          tiktokDownloadProgress.progress <= 20 ? 'w-[20%]' :
                          tiktokDownloadProgress.progress <= 25 ? 'w-1/4' :
                          tiktokDownloadProgress.progress <= 30 ? 'w-[30%]' :
                          tiktokDownloadProgress.progress <= 35 ? 'w-[35%]' :
                          tiktokDownloadProgress.progress <= 40 ? 'w-[40%]' :
                          tiktokDownloadProgress.progress <= 45 ? 'w-[45%]' :
                          tiktokDownloadProgress.progress <= 50 ? 'w-1/2' :
                          tiktokDownloadProgress.progress <= 55 ? 'w-[55%]' :
                          tiktokDownloadProgress.progress <= 60 ? 'w-[60%]' :
                          tiktokDownloadProgress.progress <= 65 ? 'w-[65%]' :
                          tiktokDownloadProgress.progress <= 70 ? 'w-[70%]' :
                          tiktokDownloadProgress.progress <= 75 ? 'w-3/4' :
                          tiktokDownloadProgress.progress <= 80 ? 'w-[80%]' :
                          tiktokDownloadProgress.progress <= 85 ? 'w-[85%]' :
                          tiktokDownloadProgress.progress <= 90 ? 'w-[90%]' :
                          tiktokDownloadProgress.progress <= 95 ? 'w-[95%]' :
                          'w-full'
                        }`}
                        aria-valuenow={tiktokDownloadProgress.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                      />
                    </div>
                  )}
                  {tiktokDownloadProgress.status === 'error' && tiktokDownloadProgress.error && (
                    <p className="text-xs text-red-400 mt-1">
                      {tiktokDownloadProgress.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Facebook download progress indicator */}
        {facebookDownloadProgress && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">f</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-[#B0B0B0] truncate">
                      {facebookDownloadProgress.message || 'Downloading Facebook video...'}
                    </p>
                    {facebookDownloadProgress.progress !== undefined && (
                      <span className="text-xs text-[#808080]">
                        {Math.round(facebookDownloadProgress.progress)}%
                      </span>
                    )}
                  </div>
                  {facebookDownloadProgress.progress !== undefined && (
                    <div className="w-full bg-[#2B2B2B] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full bg-[#1877F2] rounded-full transition-all duration-300 ${
                          facebookDownloadProgress.status === 'error'
                            ? 'bg-red-500'
                            : facebookDownloadProgress.progress < 10
                            ? 'w-[10%]'
                            : facebookDownloadProgress.progress < 20
                            ? 'w-[20%]'
                            : facebookDownloadProgress.progress < 30
                            ? 'w-[30%]'
                            : facebookDownloadProgress.progress < 40
                            ? 'w-[40%]'
                            : facebookDownloadProgress.progress < 50
                            ? 'w-[50%]'
                            : facebookDownloadProgress.progress < 60
                            ? 'w-[60%]'
                            : facebookDownloadProgress.progress < 70
                            ? 'w-[70%]'
                            : facebookDownloadProgress.progress < 80
                            ? 'w-[80%]'
                            : facebookDownloadProgress.progress < 90
                            ? 'w-[90%]'
                            : facebookDownloadProgress.progress < 100
                            ? 'w-[95%]'
                            : 'w-full'
                        }`}
                        aria-valuenow={facebookDownloadProgress.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                      />
                    </div>
                  )}
                  {facebookDownloadProgress.status === 'error' && facebookDownloadProgress.error && (
                    <p className="text-xs text-red-400 mt-1">
                      {facebookDownloadProgress.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TikTok URL detection and download prompt */}
        {detectedTikTokUrls.length > 0 && !isDownloadingTikTok && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3 border border-gray-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <Video className="w-3 h-3 text-white" />
                </div>
                <h3 className="text-sm font-medium text-[#E0E0E0]">
                  TikTok Video{detectedTikTokUrls.length > 1 ? 's' : ''} Detected
                </h3>
              </div>
              <div className="space-y-3">
                {detectedTikTokUrls.map((urlData, index) => (
                  <div key={index} className="p-3 bg-[#2B2B2B] rounded border border-[#404040]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#B0B0B0] truncate" title={urlData.url}>
                          {urlData.username ? `@${urlData.username}` : 'TikTok Video'}
                        </p>
                        <p className="text-xs text-[#808080] truncate">
                          {urlData.url}
                        </p>
                      </div>
                    </div>

                    {/* Download buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTimeout(() => {
                            handleTikTokDownload(urlData.url)
                          }, 0)

                          // Remove this URL from detected list once download starts
                          setDetectedTikTokUrls(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-xs rounded-md transition-colors flex items-center gap-1.5 flex-1"
                      >
                        <Video className="w-3 h-3" />
                        Download Video
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          // Quick download
                          setTimeout(() => {
                            handleTikTokDownload(urlData.url)
                          }, 0)
                          setDetectedTikTokUrls(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="px-2 py-1.5 bg-[#4A4A4A] hover:bg-[#5A5A5A] text-white text-xs rounded-md transition-colors"
                        title="Quick download"
                      >
                        Quick
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-[#808080]">
                  Videos will be downloaded and added to your files
                </p>
                <button
                  type="button"
                  onClick={() => setDetectedTikTokUrls([])}
                  className="text-xs text-[#808080] hover:text-white transition-colors"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Facebook URL detection and download prompt */}
        {detectedFacebookUrls.length > 0 && !isDownloadingFacebook && (
          <div className="mx-4 mt-2 mb-2">
            <div className="bg-[#333333] rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#1877F2] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">f</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Facebook video{detectedFacebookUrls.length > 1 ? 's' : ''} detected</p>
                    <p className="text-xs text-[#808080] mt-0.5">
                      {detectedFacebookUrls.map(f => f.videoId || 'Video').join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetectedFacebookUrls([])}
                  className="text-[#808080] hover:text-white transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {detectedFacebookUrls.map((facebook, index) => (
                  <div key={`${facebook.url}-${index}`} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFacebookDownload(facebook.url)}
                      className="px-3 py-1.5 bg-[#1877F2] hover:bg-[#1565D8] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDownloadingFacebook}
                    >
                      <Video className="w-3 h-3 inline mr-1" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFacebookDownload(facebook.url)}
                      className="px-3 py-1.5 bg-[#3A3A3A] hover:bg-[#454545] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDownloadingFacebook}
                      title="Quick download"
                    >
                      Quick
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#404040]">
                <p className="text-xs text-[#808080]">
                  Download Facebook videos directly
                </p>
                <button
                  type="button"
                  onClick={() => setDetectedFacebookUrls([])}
                  className="text-xs text-[#808080] hover:text-white transition-colors"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instagram Preview Components */}
        {instagramPreviews.length > 0 && !isDownloadingInstagram && (
          <div className="mx-4 mt-2 mb-2 space-y-2">
            {instagramPreviews.map((preview, index) => (
              <InstagramPreview
                key={`${preview.url}-${index}`}
                url={preview.url}
                mediaId={preview.mediaId}
                type={preview.type}
                isDownloading={isDownloadingInstagram}
                downloadProgress={instagramDownloadProgress?.progress}
                onDownload={(url) => handleInstagramDownload(url, false)}
                onRemove={() => handleInstagramPreviewRemove(preview.url)}
              />
            ))}
          </div>
        )}


        {/* Single file preview (for backward compatibility) */}
        {selectedFile && (!selectedFiles || selectedFiles.length === 0) && (
          <div className="mx-4 mt-2 mb-2 bg-[#333333] rounded-lg max-w-[350px]">
            <div className="flex items-center gap-2 p-2">
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-[#4A4A4A] rounded p-1 -m-1 transition-colors"
                onClick={() => onFileClick?.(selectedFile)}
                title="Click to view options"
              >
                {selectedFile.file.type.startsWith("image/") ? (
                  <>
                    {selectedFile.preview ? (
                      <img
                        src={selectedFile.preview}
                        alt="Preview"
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-black/30 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-[#B0B0B0]" />
                      </div>
                    )}
                  </>
                ) : selectedFile.file.type.startsWith("video/") ? (
                  <>
                    {selectedFile.videoThumbnail ? (
                      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={selectedFile.videoThumbnail}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Video className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-black/30 flex items-center justify-center flex-shrink-0">
                        <Video className="w-5 h-5 text-[#B0B0B0]" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-10 h-10 rounded bg-black/30 flex items-center justify-center flex-shrink-0">
                    <FileAudio className="w-5 h-5 text-[#B0B0B0]" />
                  </div>
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm text-[#B0B0B0] truncate" title={selectedFile.file.name}>
                    {selectedFile.file.name}
                  </p>
                  <p className="text-xs text-[#808080]">
                    {formatFileSize(selectedFile.file.size)}
                    {(selectedFile.file.type === 'image/heic' || selectedFile.file.type === 'image/heif' ||
                      selectedFile.file.name.toLowerCase().endsWith('.heic') ||
                      selectedFile.file.name.toLowerCase().endsWith('.heif')) &&
                      " • HEIC format"}
                    {selectedFile.file.type.startsWith("audio/") && selectedFile.preview && " • Ready to play"}
                    {selectedFile.file.type.startsWith("video/") && selectedFile.videoDuration &&
                      ` • ${formatVideoDuration(selectedFile.videoDuration)}`}
                    <span className="text-yellow-500/70" title="Uploaded files expire after 48 hours"> • ⏱️ 48hr</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onFileRemove}
                className="p-1 hover:bg-[#4A4A4A] rounded flex-shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4 text-[#B0B0B0]" />
              </button>
            </div>
            {/* Show transcription preview for audio and video files */}
            {(selectedFile.file.type.startsWith("audio/") || selectedFile.file.type.startsWith("video/")) &&
             selectedFile.transcription && (
              <div className="px-2 pb-2">
                <div className="p-2 bg-black/20 rounded">
                  <p className="text-xs text-gray-400 mb-1">
                    Transcription {selectedFile.transcription.language ? `(${selectedFile.transcription.language})` : ''}
                    {selectedFile.transcription.duration ? ` • ${formatDuration(selectedFile.transcription.duration)}` : ''}
                  </p>
                  <p className="text-xs text-gray-300 italic line-clamp-2">
                    "{selectedFile.transcription.text}"
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="relative">
          <div className="relative flex flex-col">
            <div className={cn(
              "overflow-y-auto transition-all duration-300 ease-out",
              isEnhanced ? "max-h-[800px]" : "max-h-[400px]"
            )}>
              <Textarea
                id="ai-input-15"
                data-testid="chat-input"
                value={value}
                placeholder={placeholder || "What can I do for you?"}
                className={cn(
                  "w-full rounded-xl rounded-b-none px-4 py-3 bg-[#2B2B2B] border-none text-white placeholder:text-[#B0B0B0] resize-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  "min-h-[72px]",
                  "transition-all duration-300 ease-out", // Smooth height transition
                )}
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onChange={(e) => {
                  handleTextChange(e.target.value)

                  // Only adjust height for user typing, not programmatic updates
                  if (!isProgrammaticUpdate) {
                    adjustHeight()
                  }
                }}
                disabled={disabled}
              />
            </div>

            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center z-50">
                <div className="text-center">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm font-medium text-blue-400">Drop your file here</p>
                  <p className="text-xs text-blue-300">Images, audio, and video files supported</p>
                </div>
              </div>
            )}

            <div className="h-14 bg-[#2B2B2B] rounded-b-xl flex items-center">
              <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between w-[calc(100%-24px)]">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs rounded-md text-white bg-[#3C3C3C] hover:bg-[#4A4A4A] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#4A4A4A]"
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={selectedModel}
                            initial={{
                              opacity: 0,
                              y: -5,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              y: 5,
                            }}
                            transition={{
                              duration: 0.15,
                            }}
                            className="flex items-center gap-1"
                          >
                            {MODEL_ICONS[selectedModel]}
                            {selectedModel}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </motion.div>
                        </AnimatePresence>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={cn("min-w-[10rem]", "border-[#333333]", "bg-[#2B2B2B]")}>
                      {AI_MODELS.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => onModelChange?.(model)}
                          className="flex items-center justify-between gap-2 hover:bg-[#3C3C3C]"
                        >
                          <div className="flex items-center gap-2">
                            {MODEL_ICONS[model] || <Bot className="w-4 h-4 opacity-50" />}
                            <span className="text-white">{model}</span>
                          </div>
                          {selectedModel === model && <Check className="w-4 h-4 text-white" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="h-4 w-px bg-[#333333] mx-0.5" />
                  <label
                    className={cn(
                      "rounded-lg p-2 cursor-pointer",
                      "hover:bg-[#4A4A4A] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#4A4A4A]",
                      "text-[#B0B0B0] hover:text-white",
                      selectedFile && "text-white bg-[#4A4A4A]"
                    )}
                    aria-label="Attach file"
                  >
                    <input
                      type="file"
                      className="hidden"
                      id="file-upload-input"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/avif,audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/mp4,audio/m4a,video/mp4,video/mpeg,video/mov,video/avi,video/webm,video/quicktime"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files
                        if (files && files.length > 0) {
                          if (files.length === 1 && onFileSelect) {
                            // Handle single file
                            onFileSelect(files[0])
                          } else if (files.length > 1 && onFilesSelect) {
                            // Handle multiple files
                            const fileArray = Array.from(files)
                            onFilesSelect(fileArray)
                          } else if (onFilesSelect) {
                            // Fallback to multiple file handler for single file if no single file handler
                            const fileArray = Array.from(files)
                            onFilesSelect(fileArray)
                          }
                          // Reset the input so files can be selected again
                          e.target.value = ''
                        }
                      }}
                    />
                    <Paperclip className="w-4 h-4 transition-colors" />
                  </label>
                  <MCPToolsPopup
                    onToolToggle={onToolToggle}
                    onServerToggle={onServerToggle}
                  />
                </div>

                {/* Enhancement controls */}
                <div className="flex items-center gap-2">

                  {/* Enhance button - always visible */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            console.log('[Prompt Enhancer] Button clicked:', {
                              value: value.trim(),
                              valueLength: value.trim().length,
                              isEnhancing,
                              disabled
                            })
                            handleEnhancePrompt()
                          }}
                          disabled={!value.trim() || value.trim().length < 2 || isEnhancing || disabled}
                          className={cn(
                            "rounded-lg p-2 transition-all duration-200 relative group",
                            value.trim() && value.trim().length >= 2 && !disabled && !isEnhancing
                              ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 cursor-pointer"
                              : "text-[#B0B0B0] hover:text-white hover:bg-[#4A4A4A]",
                            "active:scale-95",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                            isEnhancing && "animate-pulse border-purple-400/50 bg-purple-500/20",
                            "shadow-sm hover:shadow-purple-500/20"
                          )}
                          aria-label={isEnhancing ? "Enhancing prompt..." : "Enhance prompt with AI"}
                        >
                          {isEnhancing && (
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse" />
                          )}
                          <Sparkles className={cn(
                            "w-4 h-4 transition-all duration-200 relative z-10",
                            isEnhancing && "animate-spin text-purple-300",
                            !isEnhancing && value.trim().length >= 2 && "group-hover:scale-110 group-hover:rotate-12"
                          )} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-center">
                          <p className="font-medium">Enhance prompt with AI</p>
                          <p className="text-xs opacity-75 mt-1">Keyboard: Ctrl+E</p>
                          {isEnhancing && <p className="text-xs text-purple-400 mt-1">✨ Enhancing...</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Enhancement history buttons - only visible after enhancement */}
                  <AnimatePresence>
                    {hasEnhanced && (
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {/* Undo button */}
                        {console.log('[Prompt Enhancer] Rendering undo button:', {
                          hasEnhanced,
                          historyIndex,
                          historyLength: history.length,
                          canUndo,
                          isDisabled: !canUndo,
                          disabled
                        })}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={handleUndo}
                                disabled={!canUndo}
                                className={cn(
                                  "rounded-lg p-2 transition-all duration-200 relative",
                                  canUndo
                                    ? "bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300"
                                    : "text-[#B0B0B0] hover:text-white hover:bg-[#4A4A4A]",
                                  "active:scale-95",
                                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                )}
                                aria-label="Undo last change"
                              >
                                <RotateCcw className="w-4 h-4 transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Undo (Ctrl+Z)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>


                        {/* Regenerate button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={handleRegenerate}
                                disabled={!canRegenerate}
                                className={cn(
                                  "rounded-lg p-2 transition-all duration-200 relative group",
                                  canRegenerate
                                    ? "bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 hover:text-green-300"
                                    : "text-[#B0B0B0] hover:text-white hover:bg-[#4A4A4A]",
                                  "active:scale-95",
                                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                                  isEnhancing && "animate-pulse border-green-400/50"
                                )}
                                aria-label={isEnhancing ? "Generating new enhancement..." : "Generate new enhancement"}
                              >
                                {isEnhancing && (
                                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 animate-pulse" />
                                )}
                                <RefreshCw className={cn(
                                  "w-4 h-4 transition-all duration-200 relative z-10",
                                  isEnhancing && "animate-spin text-green-300",
                                  !isEnhancing && hasEnhanced && "group-hover:scale-110 group-hover:rotate-180"
                                )} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>New enhancement (Ctrl+Shift+R)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </motion.div>
                    )}
                  </AnimatePresence>



                  {/* Deep Research button - separated with margin for better spacing */}
                  <div className="ml-2 pl-2 border-l border-[#333333]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onDeepResearch?.()}
                            disabled={disabled}
                            className={cn(
                              "rounded-lg p-2 transition-all duration-200",
                              "hover:bg-[#4A4A4A] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#4A4A4A]",
                              isDeepResearchMode
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25"
                                : "text-[#B0B0B0] hover:text-white",
                              "active:scale-95",
                              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            )}
                            aria-label={isDeepResearchMode ? "Deep research mode active" : "Enable deep research mode"}
                          >
                            <Microscope className={cn(
                              "w-4 h-4 transition-all duration-200",
                              isDeepResearchMode && "scale-110"
                            )} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isDeepResearchMode ? "Deep research mode active" : "Enable deep research mode"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid="send-button"
                        className={cn(
                          "rounded-xl transition-all duration-200 ease-out",
                          "focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0",
                          "active:scale-95",
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                          disabled
                            ? "bg-white hover:bg-gray-100 px-4 py-2 flex items-center gap-2"
                            : value.trim() || selectedFile || (selectedFiles?.length ?? 0) > 0
                              ? "bg-white hover:bg-gray-100 p-2"
                              : "bg-[#2B2B2B] hover:bg-[#333333] p-2 border border-[#333333]",
                          // Add visual indicator when download is blocking submission
                          (isDownloadingYoutube || isDownloadingInstagram || isDownloadingTikTok || isDownloadingFacebook || autoDownloadInProgress) && "opacity-50 cursor-wait"
                        )}
                        aria-label={disabled ? "Stop generation" : "Send message"}
                        title={disabled ? "Stop generation" : "Send message"}
                        disabled={!value.trim() && !disabled && !selectedFile && (selectedFiles?.length ?? 0) === 0}
                        onClick={disabled ? onStop : handleSubmit}
                      >
                  {disabled ? (
                    <>
                      <Square className="w-4 h-4 text-black fill-black" />
                      <span className="text-black text-sm font-medium">Stop</span>
                    </>
                  ) : (
                    <ArrowRight
                      className={cn(
                        "w-4 h-4 transition-all duration-200",
                        value.trim() || selectedFile || (selectedFiles?.length ?? 0) > 0 ? "text-black transform hover:translate-x-0.5" : "text-[#666666]",
                      )}
                    />
                  )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {(isDownloadingYoutube || isDownloadingInstagram || isDownloadingTikTok || isDownloadingFacebook || autoDownloadInProgress)
                          ? "Download in progress..."
                          : disabled
                            ? "Stop generation"
                            : "Send message"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Manager Modal */}
      {showCookieManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <CookieManager
            onCookiesReady={handleCookiesReady}
            onClose={handleCookieManagerClose}
          />
        </div>
      )}
    </div>
  )
}
