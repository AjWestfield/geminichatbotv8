"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Sparkles, RotateCcw, RotateCw, RefreshCw } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

interface PromptEnhancerProps {
  value: string
  onChange: (value: string) => void
  model?: string
  context?: "chat" | "image-edit" | "video" | "audio" | "multi-image"
  disabled?: boolean
  className?: string
  placeholder?: string
  onReset?: () => void
  isNegativePrompt?: boolean
}

export function PromptEnhancer({
  value,
  onChange,
  model = "gemini",
  context = "chat",
  disabled = false,
  className,
  onReset,
  isNegativePrompt = false
}: PromptEnhancerProps) {
  const { toast } = useToast()
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [hasEnhanced, setHasEnhanced] = useState(false)

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('[PromptEnhancer] State changed:', {
      hasEnhanced,
      historyIndex,
      historyLength: history.length,
      history: history.map((h, i) => `${i}: ${h?.substring(0, 30)}...`),
      undoButtonShouldBeEnabled: historyIndex > 0,
      value: value?.substring(0, 30) + '...'
    })
  }, [hasEnhanced, historyIndex, history, value])

  // Add to history with robust validation
  const addToHistory = useCallback((text: string) => {
    console.log('[PromptEnhancer] Adding to history:', {
      text: text.substring(0, 50) + '...',
      currentHistoryLength: history.length,
      currentHistoryIndex: historyIndex
    })

    // Validate input
    if (!text || typeof text !== 'string') {
      console.error('[PromptEnhancer] Cannot add invalid text to history:', text)
      return
    }

    if (text.trim().length === 0) {
      console.error('[PromptEnhancer] Cannot add empty text to history')
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

      console.log('[PromptEnhancer] History updated:', {
        oldLength: currentHistory.length,
        newLength: newHistory.length,
        newIndex: newHistory.length - 1
      })

      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      setHasEnhanced(true)
    } catch (error) {
      console.error('[PromptEnhancer] Error adding to history:', error)
    }
  }, [history, historyIndex])

  // Enhance prompt with robust initialization
  const handleEnhance = useCallback(async (regenerate = false) => {
    console.log('[PromptEnhancer] Starting enhancement:', {
      value: value.trim(),
      regenerate,
      isEnhancing,
      disabled,
      model,
      valueLength: value.trim().length
    })

    if (!value.trim() || isEnhancing || disabled || value.trim().length < 2) {
      console.log('[PromptEnhancer] Enhancement blocked:', {
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
      console.log('[PromptEnhancer] First enhancement - initializing history with original prompt')
      setHistory([originalText])
      setHistoryIndex(0)
      console.log('[PromptEnhancer] History initialized:', { originalText: originalText.substring(0, 50) + '...' })
    }

    // Determine what prompt to enhance
    const promptToEnhance = regenerate && hasEnhanced && history.length > 0
      ? history[0]  // Use original prompt for regeneration
      : value.trim()  // Use current value for first enhancement

    console.log('[PromptEnhancer] Sending request:', {
      promptToEnhance,
      model: model || 'gemini',
      context,
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
          model: model,
          context: context,
          regenerate: regenerate
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.enhancedPrompt) {
        console.log('[PromptEnhancer] Enhancement successful:', {
          original: data.originalPrompt,
          enhanced: data.enhancedPrompt,
          model: data.model
        })

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
        
        console.log('[PromptEnhancer] Enhancement completed - state updated:', {
          originalPrompt: data.originalPrompt?.substring(0, 50) + '...',
          enhancedPrompt: data.enhancedPrompt?.substring(0, 50) + '...',
          model: data.model,
          newHistoryLength: newHistory.length,
          newHistoryIndex,
          hasEnhanced: true,
          expectedUndoEnabled: newHistoryIndex > 0
        })

        // Show success feedback with enhanced prompt preview
        if (toast) {
          const previewText = data.enhancedPrompt.length > 100
            ? data.enhancedPrompt.substring(0, 100) + '...'
            : data.enhancedPrompt

          const title = regenerate
            ? "🔄 New Enhancement Generated"
            : "✨ Prompt Enhanced"

          const description = regenerate
            ? `Generated new variation with ${data.model || model}${data.fallback ? ' (fallback)' : ''}`
            : `Enhanced with ${data.model || model}${data.fallback ? ' (fallback)' : ''}`

          console.log('[PromptEnhancer] Showing success toast:', { title, description })
          toast({
            title,
            description,
            duration: 3000,
          })
        }
      } else {
        console.error('[PromptEnhancer] Enhancement failed:', data)
        throw new Error(data.error || data.details || 'Failed to enhance prompt - no enhanced text returned')
      }
    } catch (error) {
      console.error('[PromptEnhancer] Error enhancing prompt:', error)

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
      }
    } finally {
      console.log('[PromptEnhancer] Enhancement finished, setting isEnhancing to false')
      setIsEnhancing(false)
    }
  }, [value, isEnhancing, disabled, model, context, onChange, toast, hasEnhanced, history, historyIndex])

  // Undo function with comprehensive validation
  const handleUndo = useCallback(() => {
    console.log('[PromptEnhancer] Undo attempt:', {
      historyIndex,
      historyLength: history.length,
      disabled,
      hasEnhanced,
      currentValue: value?.substring(0, 50) + '...',
      history: history.map((h, i) => `${i}: ${h?.substring(0, 30)}...`)
    })

    // Validation checks
    if (disabled) {
      console.log('[PromptEnhancer] Undo blocked: Component disabled')
      return
    }

    if (!hasEnhanced) {
      console.log('[PromptEnhancer] Undo blocked: No enhancement history')
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
      console.log('[PromptEnhancer] Undo blocked: Already at original version')
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
      console.log('[PromptEnhancer] Undo blocked: Invalid history state')
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
      console.log('[PromptEnhancer] Undo blocked: Invalid previous version at index', newIndex)
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

    console.log('[PromptEnhancer] Undo successful:', {
      fromIndex: historyIndex,
      toIndex: newIndex,
      previousText: previousVersion.substring(0, 50) + '...'
    })

    // Update state
    setHistoryIndex(newIndex)
    onChange(previousVersion)

    if (toast) {
      toast({
        title: "✅ Undone",
        description: "Reverted to previous version",
        duration: 1500,
      })
    }
  }, [historyIndex, history, onChange, disabled, toast, hasEnhanced, value])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && !disabled) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])

      toast({
        title: "Redone",
        description: "Restored next version",
        duration: 1500,
      })
    }
  }, [historyIndex, history, onChange, disabled, toast])

  // Regenerate function with validation
  const handleRegenerate = useCallback(() => {
    console.log('[PromptEnhancer] Regenerate attempt:', {
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
        console.log('[PromptEnhancer] Regenerate blocked: No enhancement history')
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
        console.log('[PromptEnhancer] Regenerate blocked: Already enhancing')
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
        console.log('[PromptEnhancer] Regenerate blocked: Component disabled')
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
        console.log('[PromptEnhancer] Regenerate blocked: History is not an array')
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
        console.log('[PromptEnhancer] Regenerate blocked: Empty history')
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
        console.log('[PromptEnhancer] Regenerate blocked: Invalid original prompt')
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
        console.log('[PromptEnhancer] Regenerate blocked: Original prompt too short')
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

      console.log('[PromptEnhancer] Starting regenerate with prompt:', originalPrompt.substring(0, 100))

      // Call the enhancement function with regenerate=true
      handleEnhance(true)

    } catch (error) {
      console.error('[PromptEnhancer] Regenerate error:', error)
      if (toast) {
        toast({
          title: "🔄 Regeneration Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
          duration: 5000,
        })
      }
    }
  }, [hasEnhanced, isEnhancing, disabled, handleEnhance, history, historyIndex, toast, value])

  // Reset enhancement state
  const resetState = useCallback(() => {
    console.log('[PromptEnhancer] Resetting enhancement state')

    try {
      setHasEnhanced(false)
      setHistory([])
      setHistoryIndex(-1)
      setIsEnhancing(false)

      console.log('[PromptEnhancer] Enhancement state reset successfully')
      onReset?.()
    } catch (error) {
      console.error('[PromptEnhancer] Error resetting enhancement state:', error)
    }
  }, [onReset])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return

      // Ctrl/Cmd + E: Enhance
      if (e.key === 'e' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        handleEnhance()
      }
      // Ctrl/Cmd + Z: Undo (only if enhancement history exists)
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey && hasEnhanced) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo (only if enhancement history exists)
      else if (((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
                (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) && hasEnhanced) {
        e.preventDefault()
        handleRedo()
      }
      // Ctrl/Cmd + R: Regenerate (only if enhancement history exists)
      else if (e.key === 'r' && (e.ctrlKey || e.metaKey) && !e.shiftKey && hasEnhanced) {
        e.preventDefault()
        handleRegenerate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, handleEnhance, handleUndo, handleRedo, handleRegenerate, hasEnhanced])

  // Helper variables for button states - matching chat interface pattern
  const canUndo = hasEnhanced && historyIndex > 0 && !disabled
  const canRedo = hasEnhanced && historyIndex < history.length - 1 && !disabled
  const canEnhance = value.trim().length > 0 && !isEnhancing && !disabled
  const canRegenerate = hasEnhanced && !isEnhancing && !disabled

  return (
    <div className={cn("flex items-center gap-1 p-1 bg-[#2B2B2B] rounded-lg border border-[#333333]", className)}>
      <TooltipProvider>
        {/* Enhance Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('[PromptEnhancer] Button clicked:', {
                  value: value.trim(),
                  valueLength: value.trim().length,
                  isEnhancing,
                  disabled
                })
                handleEnhance()
              }}
              disabled={!canEnhance}
              className={cn(
                "gap-2 text-xs",
                canEnhance
                  ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  : "text-gray-500"
              )}
            >
              <Sparkles className={cn("w-4 h-4", isEnhancing && "animate-spin")} />
              {isNegativePrompt ? "Avoid Suggestions" : "Enhance"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{isNegativePrompt ? "Generate things to avoid" : "Enhance prompt with AI"}</p>
              <p className="text-xs opacity-75 mt-1">Keyboard: Ctrl+E</p>
              {isEnhancing && <p className="text-xs text-purple-400 mt-1">✨ {isNegativePrompt ? "Generating..." : "Enhancing..."}</p>}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Enhancement history buttons - only visible after enhancement */}
        <AnimatePresence>
          {hasEnhanced && (
            <motion.div
              className="flex items-center gap-1"
              initial={{ opacity: 0, x: -10, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* Undo Button */}
              {console.log('[PromptEnhancer] Rendering undo button:', {
                hasEnhanced,
                historyIndex,
                historyLength: history.length,
                canUndo,
                isDisabled: !canUndo,
                disabled
              })}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className={cn(
                      "gap-2 text-xs",
                      canUndo
                        ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        : "text-gray-500"
                    )}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Undo
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo last change</p>
                  <p className="text-xs opacity-75">Ctrl+Z</p>
                </TooltipContent>
              </Tooltip>

              {/* Redo Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className={cn(
                      "gap-2 text-xs",
                      canRedo
                        ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        : "text-gray-500"
                    )}
                  >
                    <RotateCw className="w-4 h-4" />
                    Redo
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Redo last change</p>
                  <p className="text-xs opacity-75">Ctrl+Y</p>
                </TooltipContent>
              </Tooltip>

              {/* Regenerate Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={!canRegenerate}
                    className={cn(
                      "gap-2 text-xs",
                      canRegenerate
                        ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        : "text-gray-500"
                    )}
                  >
                    <RefreshCw className={cn("w-4 h-4", isEnhancing && "animate-spin")} />
                    New
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate new enhancement</p>
                  <p className="text-xs opacity-75">Ctrl+R</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>
    </div>
  )
}
