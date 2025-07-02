"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Wand2, Images, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { generateImageId } from "@/lib/image-utils"
import { useImageProgressStore } from "@/lib/stores/image-progress-store"
import type { GeneratedImage } from "@/lib/image-utils"
import { motion, AnimatePresence } from "framer-motion"

interface MultiImageEditModalProps {
  isOpen: boolean
  onClose: () => void
  images: string[] // Array of image URLs
  imageIds?: string[] // Optional array of image IDs for source tracking
  onEditComplete: (editedImage: GeneratedImage) => void
}

export function MultiImageEditModal({
  isOpen,
  onClose,
  images,
  imageIds,
  onEditComplete
}: MultiImageEditModalProps) {
  const [editPrompt, setEditPrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false)

  const { addImageGeneration, updateStage, completeImageGeneration, failImageGeneration } = useImageProgressStore()

  // Fetch AI suggestions when modal opens with images
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Only fetch if modal is open, we have images, not already loading, and haven't fetched yet
      if (!isOpen || !images || images.length < 2 || isLoadingSuggestions || hasFetchedSuggestions) return

      console.log('[MultiImageEditModal] Fetching AI suggestions for', images.length, 'images')
      setIsLoadingSuggestions(true)
      setSuggestionsError(null)
      setSuggestions([])

      try {
        // Convert all images to data URLs for the API
        const processedImages: string[] = []
        
        for (let i = 0; i < images.length; i++) {
          const imageUrl = images[i]
          
          if (imageUrl.startsWith('data:')) {
            processedImages.push(imageUrl)
          } else {
            try {
              const dataUrl = await convertBlobToDataUrl(imageUrl)
              processedImages.push(dataUrl)
            } catch (error) {
              console.error(`[MultiImageEditModal] Failed to convert image ${i + 1} for suggestions:`, error)
              // Skip this image but continue with others
            }
          }
        }

        if (processedImages.length < 2) {
          throw new Error('Not enough valid images for suggestions')
        }

        // Call the suggestions API
        const response = await fetch('/api/multi-image-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            images: processedImages
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('[MultiImageEditModal] Suggestions API error:', {
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            fullResponse: data
          })
          throw new Error(data.error || 'Failed to generate suggestions')
        }

        if (data.success && data.suggestions) {
          console.log('[MultiImageEditModal] Received suggestions:', data.suggestions)
          setSuggestions(data.suggestions)
          setHasFetchedSuggestions(true) // Mark that we've successfully fetched suggestions
        } else {
          throw new Error('No suggestions returned')
        }

      } catch (error) {
        console.error('[MultiImageEditModal] Error fetching suggestions:', error)
        
        // Determine user-friendly error message
        let userMessage = 'Unable to generate suggestions at this time'
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            userMessage = 'AI suggestions unavailable (API key not configured)'
          } else if (error.message.includes('rate limit')) {
            userMessage = 'Too many requests - please try again later'
          } else if (error.message.includes('safety')) {
            userMessage = 'Content blocked by safety filters'
          }
        }
        
        setSuggestionsError(userMessage)
        // Don't throw the error - let the modal continue to work without suggestions
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    fetchSuggestions()
  }, [isOpen, images?.length, hasFetchedSuggestions, isLoadingSuggestions]) // Use images.length instead of images array reference

  // Helper function to convert any URL (blob: or http:) to data URL
  const convertBlobToDataUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const blob = await response.blob()

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('[MultiImageEditModal] Failed to convert URL to data URL:', error)
      throw new Error(`Failed to convert URL to data URL: ${error}`)
    }
  }

  const handleEdit = async () => {
    if (!images || images.length < 2 || !editPrompt.trim()) return

    // Additional safety check for maximum images
    if (images.length > 10) {
      toast.error("Too many images selected", {
        description: "Maximum 10 images allowed for multi-image editing. Please deselect some images.",
        duration: 5000
      })
      return
    }

    console.log('[MultiImageEditModal] handleEdit called with:', {
      imageCount: images.length,
      hasImageIds: !!imageIds,
      imageIdCount: imageIds?.length || 0,
      prompt: editPrompt,
      images: images.map((url, index) => ({
        index: index + 1,
        preview: url.substring(0, 50) + '...',
        type: url.startsWith('data:') ? 'data URL' : url.startsWith('blob:') ? 'blob URL' : 'external URL'
      }))
    })

    setIsSubmitting(true)
    setError(null)

    // Generate unique ID for the new image
    const editedImageId = `multi-edited-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Add to progress store
    addImageGeneration(editedImageId, editPrompt, {
      quality: "hd",
      style: "vivid",
      size: "1024x1024",
      model: "flux-kontext-max-multi"
    })

    try {
      updateStage(editedImageId, 'processing', 'Preparing images...')

      // Convert any blob URLs to data URLs before sending to API
      const processedImages: string[] = []

      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i]
        console.log(`[MultiImageEditModal] Processing image ${i + 1}:`, imageUrl.substring(0, 50) + '...')

        if (imageUrl.startsWith('data:')) {
          // Already a data URL - use as-is
          processedImages.push(imageUrl)
          console.log(`[MultiImageEditModal] Image ${i + 1} is already a data URL`)
        } else {
          // Convert blob: or http: URLs to data URLs to prevent expiration issues
          console.log(`[MultiImageEditModal] Converting ${imageUrl.startsWith('blob:') ? 'blob' : 'HTTP'} URL to data URL for image ${i + 1}`)
          updateStage(editedImageId, 'processing', `Converting image ${i + 1} to data URL...`)
          try {
            const dataUrl = await convertBlobToDataUrl(imageUrl)
            processedImages.push(dataUrl)
            console.log(`[MultiImageEditModal] Successfully converted image ${i + 1} to data URL`)
          } catch (error) {
            console.error(`[MultiImageEditModal] Failed to convert image ${i + 1}:`, error)
            // Continue with other images, but track the error
            const errorMessage = error instanceof Error && error.message.includes('404') 
              ? `Image ${i + 1} is no longer available. The URL may have expired. Please select the image again.`
              : `Failed to process image ${i + 1}. It may have expired or be inaccessible.`
            setError(errorMessage)
            failImageGeneration(editedImageId, `Failed to process image ${i + 1}`)
            setIsSubmitting(false) // Reset submitting state
            return
          }
        }
      }

      updateStage(editedImageId, 'processing', 'Combining multiple images...')

      console.log('[DEBUG] Final processedImages before API call:', {
        count: processedImages.length,
        types: processedImages.map(url => url.startsWith('data:') ? 'data URL' : 'other'),
        previews: processedImages.map((url, i) => `${i+1}: ${url.substring(0, 50)}...`),
        sizes: processedImages.map(url => `${(url.length / 1024).toFixed(2)}KB`)
      })

      const requestBody = {
        images: processedImages,
        prompt: editPrompt,
        guidanceScale: 3.5,
        safetyTolerance: "2"
      }

      console.log('[MultiImageEditModal] Sending API request with:', {
        imageCount: processedImages.length,
        prompt: editPrompt,
        imageTypes: processedImages.map(url => {
          if (url.startsWith('data:')) return 'data URL'
          if (url.startsWith('blob:')) return 'blob URL'
          if (url.startsWith('http')) return 'HTTP URL'
          return 'unknown'
        })
      })

      const response = await fetch("/api/edit-multi-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to edit multiple images")
      }

      console.log('[MultiImageEditModal] API response:', data)

      // Enhanced response logging
      if (data.metadata) {
        console.log('[MultiImageEditModal] API metadata:', {
          processedImages: data.metadata.input?.images?.length || 'unknown',
          usedPrompt: data.metadata.input?.prompt || 'unknown',
          model: data.metadata.model,
          fullMetadata: data.metadata
        })
      }

      if (!data.success || !data.images || data.images.length === 0) {
        throw new Error("No edited image returned from API")
      }

      updateStage(editedImageId, 'finalizing', 'Processing final image...')

      // Create the edited image object
      const editedImage: GeneratedImage = {
        id: editedImageId,
        prompt: editPrompt,
        url: data.images[0].url,
        timestamp: new Date(),
        quality: 'hd',
        model: 'flux-kontext-max-multi',
        style: 'vivid',
        size: '1024x1024',
        isGenerating: false,
        isMultiImageEdit: true,
        inputImages: images,
        metadata: {
          ...data.metadata,
          sourceImageCount: images.length,
          // Only include imageIds if they were provided
          ...(imageIds && { sourceImageIds: imageIds })
        }
      }

      // Only add sourceImages if imageIds were provided
      if (imageIds) {
        (editedImage as any).sourceImages = imageIds;
      }

      console.log('[MultiImageEditModal] Created edited image:', {
        id: editedImage.id,
        url: editedImage.url?.substring(0, 50) + '...',
        model: editedImage.model,
        hasSourceImages: !!(editedImage as any).sourceImages
      })

      // Complete the generation
      completeImageGeneration(editedImageId, editedImage)
      onEditComplete(editedImage)

      // Show success message
      toast.success("Multi-image edit completed!", {
        description: `Combined ${images.length} images using Flux Kontext Max Multi`,
        duration: 3000
      })

      // Close modal and reset form
      onClose()
      setEditPrompt("")

    } catch (error: any) {
      console.error("Multi-image edit error:", error)
      setError(error.message)

      failImageGeneration(
        editedImageId,
        error.message || "Failed to edit multiple images"
      )

      toast.error("Multi-image edit failed", {
        description: error.message || "An error occurred while editing the images",
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setEditPrompt("")
      setError(null)
      setSuggestions([])
      setSuggestionsError(null)
      setHasFetchedSuggestions(false) // Reset flag so suggestions are fetched on next open
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-[#2B2B2B] border-[#333333]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Images className="w-5 h-5" />
            Multi Image Edit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview Grid */}
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">
              Selected Images ({images.length}/10 max)
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-3 bg-[#1A1A1A] rounded-lg">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-[#333333] min-h-[160px]">
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      console.error(`[MultiImageEditModal] Image ${index + 1} failed to load:`, imageUrl)
                      const target = e.currentTarget
                      target.style.display = 'none'

                      // Show error indicator
                      const parent = target.parentElement
                      if (parent && !parent.querySelector('.broken-image-indicator')) {
                        const errorDiv = document.createElement('div')
                        errorDiv.className = 'broken-image-indicator w-full h-full bg-red-900/20 flex items-center justify-center border border-red-500/30'
                        errorDiv.innerHTML = `
                          <div class="text-center">
                            <div class="text-red-400 text-xs">⚠️</div>
                            <div class="text-red-400 text-xs">Failed</div>
                          </div>
                        `
                        parent.appendChild(errorDiv)
                      }
                    }}
                  />
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Prompt */}
          <div className="space-y-2">
            <Label htmlFor="edit-prompt" className="text-white text-sm font-medium">
              Edit Instructions
            </Label>


            <EnhancedTextarea
              id="edit-prompt"
              placeholder={
                images.length === 1
                  ? "Describe how to edit this image... (e.g., 'Make the colors more vibrant', 'Add a vintage filter', 'Change the background')"
                  : images.length === 2
                  ? "Describe how to combine or edit these images... (e.g., 'Show both images side by side', 'Create a before and after comparison', 'Apply the same style to both')"
                  : "Describe your multi-image edit... (e.g., 'Arrange all images in a grid', 'Create a collage', 'Apply consistent lighting across all images')"
              }
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              context="multi-image"
              disabled={isSubmitting}
            />
          </div>

          {/* AI-Generated Suggestions */}
          <AnimatePresence>
            {(isLoadingSuggestions || suggestions.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-white text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  AI Suggestions
                </Label>
                
                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Analyzing images and generating suggestions...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {suggestions.map((suggestion, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => {
                          setEditPrompt(suggestion)
                          toast.success("Suggestion selected", {
                            description: "You can modify the prompt as needed before generating",
                            duration: 2000
                          })
                        }}
                        disabled={isSubmitting}
                        className="w-full text-left p-3 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] hover:border-purple-500/50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm font-medium group-hover:bg-purple-500/30 transition-colors">
                            {index + 1}
                          </div>
                          <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2">
                            {suggestion}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestions Error */}
          {suggestionsError && !isLoadingSuggestions && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                Could not generate AI suggestions: {suggestionsError}
              </p>
              <p className="text-xs text-yellow-400/70 mt-1">
                You can still enter your own prompt manually.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="bg-transparent border-[#333333] text-white hover:bg-[#333333]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSubmitting || !editPrompt.trim() || images.length < 1}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Edit Images
                </>
              )}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}