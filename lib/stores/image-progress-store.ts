import { create } from 'zustand'
import type { GeneratedImage } from '@/lib/image-utils'

export type ImageGenerationStage =
  | 'initializing'
  | 'processing'
  | 'finalizing'
  | 'completed'
  | 'failed'

export interface ImageGenerationProgress {
  imageId: string
  prompt: string
  originalImageId?: string // For edited images
  originalImageUrl?: string
  progress: number
  stage: ImageGenerationStage
  stageMessage: string
  status: 'generating' | 'completed' | 'failed'
  elapsedTime: number
  estimatedRemainingTime: number
  estimatedTotalTime: number
  error?: string
  createdAt: Date
  completedAt?: Date
  lastUpdated: Date
  quality?: string
  style?: string
  size?: string
  model?: string
  generatedImage?: GeneratedImage // The final result
}

export interface ImageGenerationState {
  [imageId: string]: ImageGenerationProgress
}

interface ImageProgressStore {
  progress: ImageGenerationState
  updateProgress: (imageId: string, progress: Partial<ImageGenerationProgress>) => void
  removeProgress: (imageId: string) => void
  getProgress: (imageId: string) => ImageGenerationProgress | undefined
  addImageGeneration: (
    imageId: string,
    prompt: string,
    options?: {
      originalImageId?: string
      originalImageUrl?: string
      quality?: string
      style?: string
      size?: string
      model?: string
    }
  ) => void
  completeImageGeneration: (imageId: string, generatedImage: GeneratedImage) => void
  failImageGeneration: (imageId: string, error: string) => void
  updateStage: (imageId: string, stage: ImageGenerationStage, message?: string) => void
  calculateProgress: (imageId: string) => void
  getAllGeneratingImages: () => ImageGenerationProgress[]
}

// Enhanced progress calculation helpers
const getEstimatedTotalTime = (quality: string = 'standard', model: string = '', isEdit: boolean = false): number => {
  // Model-specific timing with more realistic estimates
  let baseTime = 15 // Default fallback
  
  if (model.includes('gpt-image-1')) {
    // GPT-Image-1 (DALL-E 3) - slower but high quality
    baseTime = quality === 'hd' ? 25 : 18
  } else if (model === 'flux-kontext-pro') {
    // Flux Kontext Pro - balanced speed and quality
    baseTime = quality === 'hd' ? 20 : 14
  } else if (model === 'flux-kontext-max') {
    // Flux Kontext Max - highest quality, longer time
    baseTime = quality === 'hd' ? 28 : 22
  } else if (model === 'flux-dev-ultra-fast') {
    // WaveSpeed AI - fastest generation
    baseTime = quality === 'hd' ? 12 : 8
  }

  // Edit operations typically take 30-50% longer due to analysis overhead
  const editMultiplier = isEdit ? (1.3 + Math.random() * 0.2) : 1
  
  // Add some natural variance (±20%)
  const variance = 0.8 + Math.random() * 0.4
  
  return Math.round(baseTime * editMultiplier * variance)
}

const getStageMessage = (stage: ImageGenerationStage, model?: string, progress?: number, isEdit: boolean = false): string => {
  const modelName = model?.includes('gpt-image-1') ? 'GPT-Image-1' :
                   model === 'flux-kontext-pro' ? 'Flux Kontext Pro' :
                   model === 'flux-kontext-max' ? 'Flux Kontext Max' :
                   model === 'flux-dev-ultra-fast' ? 'WaveSpeed AI' : 
                   'AI model'
  
  const isGPT = model?.includes('gpt-image-1')
  const isFluxMax = model === 'flux-kontext-max'
  const isWaveSpeed = model === 'flux-dev-ultra-fast'
  
  switch (stage) {
    case 'initializing':
      if (isEdit) {
        return `${modelName} analyzing source image...`
      } else {
        return isGPT ? `${modelName} understanding your vision...` :
               isWaveSpeed ? `${modelName} preparing ultra-fast generation...` :
               `${modelName} initializing neural networks...`
      }
    
    case 'processing':
      if (isEdit) {
        if (progress && progress < 25) return 'Analyzing image composition and style...'
        if (progress && progress < 50) return 'Applying intelligent modifications...'
        if (progress && progress < 75) return 'Refining edited regions with precision...'
        return 'Harmonizing changes with original style...'
      } else {
        if (progress && progress < 20) {
          return isGPT ? 'Interpreting creative vision...' :
                 isWaveSpeed ? 'Accelerated concept formation...' :
                 'Understanding prompt semantics...'
        }
        if (progress && progress < 40) {
          return isFluxMax ? 'Crafting ultra-high quality foundation...' :
                 isWaveSpeed ? 'Rapid visual synthesis in progress...' :
                 'Building initial image structure...'
        }
        if (progress && progress < 65) {
          return isGPT ? 'Rendering artistic details...' :
                 isWaveSpeed ? 'Lightning-fast detail generation...' :
                 'Adding fine details and textures...'
        }
        if (progress && progress < 85) {
          return isFluxMax ? 'Perfecting every pixel...' :
                 'Enhancing visual coherence...'
        }
        return 'Applying final artistic touches...'
      }
    
    case 'finalizing':
      return isEdit ? 'Polishing edited masterpiece...' :
             isGPT ? 'GPT-Image-1 final quality check...' :
             isWaveSpeed ? 'WaveSpeed final optimization...' :
             'Finalizing your creation...'
    
    case 'completed':
      return isEdit ? '✨ Edit completed successfully!' : 
             isWaveSpeed ? '⚡ Generated at lightning speed!' :
             '🎨 Your image is ready!'
    
    case 'failed':
      return '❌ Generation encountered an issue'
    
    default:
      return 'Processing with advanced AI...'
  }
}

const calculateProgressFromElapsed = (elapsedTime: number, estimatedTotal: number, stage: ImageGenerationStage, model: string = ''): number => {
  // Enhanced stage ranges with more realistic distribution
  const stageRanges = {
    initializing: { min: 0, max: 15 },
    processing: { min: 15, max: 88 },
    finalizing: { min: 88, max: 100 },
    completed: { min: 100, max: 100 },
    failed: { min: 0, max: 0 }
  }

  const range = stageRanges[stage]

  if (stage === 'completed') return 100
  if (stage === 'failed') return 0

  // Model-specific progress curves
  const isWaveSpeed = model === 'flux-dev-ultra-fast'
  const isFluxMax = model === 'flux-kontext-max'
  const isGPT = model?.includes('gpt-image-1')

  // Calculate base time progress with model-specific curves
  let timeProgress = Math.min(elapsedTime / estimatedTotal, 1)
  
  // Apply model-specific progress curves
  if (isWaveSpeed) {
    // WaveSpeed: Fast initial progress, then steady
    timeProgress = Math.pow(timeProgress, 0.7)
  } else if (isFluxMax) {
    // Flux Max: Slower start, faster middle, careful finish
    timeProgress = timeProgress < 0.3 ? timeProgress * 0.6 :
                   timeProgress < 0.8 ? 0.18 + (timeProgress - 0.3) * 1.4 :
                   0.88 + (timeProgress - 0.8) * 0.6
  } else if (isGPT) {
    // GPT-Image-1: Steady but with creative bursts
    const creativeBurst = Math.sin(timeProgress * Math.PI * 2) * 0.1
    timeProgress = timeProgress + creativeBurst * timeProgress * (1 - timeProgress)
  }
  
  // Enhanced smoothstep function for natural progression
  const smoothProgress = timeProgress * timeProgress * timeProgress * (timeProgress * (timeProgress * 6 - 15) + 10)
  
  // Calculate progress within stage range
  let calculatedProgress = range.min + (smoothProgress * (range.max - range.min))

  // Add realistic micro-variations (smaller variance)
  const microVariance = (Math.random() - 0.5) * 0.5
  calculatedProgress += microVariance

  // Ensure we don't go backwards or exceed stage limits
  const finalProgress = Math.max(range.min, Math.min(calculatedProgress, range.max))

  return Math.floor(finalProgress)
}

export const useImageProgressStore = create<ImageProgressStore>((set, get) => ({
  progress: {},

  updateProgress: (imageId: string, updates: Partial<ImageGenerationProgress>) => {
    set((state) => ({
      progress: {
        ...state.progress,
        [imageId]: {
          ...state.progress[imageId],
          ...updates,
          imageId,
          lastUpdated: new Date()
        }
      }
    }))
  },

  removeProgress: (imageId: string) => {
    set((state) => {
      const { [imageId]: _, ...rest } = state.progress
      return { progress: rest }
    })
  },

  getProgress: (imageId: string) => {
    return get().progress[imageId]
  },

  addImageGeneration: (imageId: string, prompt: string, options = {}) => {
    const isEdit = !!options.originalImageId
    const estimatedTotal = getEstimatedTotalTime(options.quality, options.model, isEdit)

    set((state) => ({
      progress: {
        ...state.progress,
        [imageId]: {
          imageId,
          prompt,
          originalImageId: options.originalImageId,
          originalImageUrl: options.originalImageUrl,
          progress: 0,
          stage: 'initializing',
          stageMessage: getStageMessage('initializing', options.model, 0, isEdit),
          status: 'generating',
          elapsedTime: 0,
          estimatedRemainingTime: estimatedTotal,
          estimatedTotalTime: estimatedTotal,
          createdAt: new Date(),
          lastUpdated: new Date(),
          quality: options.quality,
          style: options.style,
          size: options.size,
          model: options.model
        }
      }
    }))
  },

  completeImageGeneration: (imageId: string, generatedImage: GeneratedImage) => {
    const current = get().progress[imageId]
    if (!current) return

    set((state) => ({
      progress: {
        ...state.progress,
        [imageId]: {
          ...state.progress[imageId],
          progress: 100,
          status: 'completed',
          stage: 'completed',
          stageMessage: getStageMessage('completed', current.model, 100, !!current.originalImageId),
          estimatedRemainingTime: 0,
          completedAt: new Date(),
          lastUpdated: new Date(),
          generatedImage
        }
      }
    }))
  },

  failImageGeneration: (imageId: string, error: string) => {
    set((state) => ({
      progress: {
        ...state.progress,
        [imageId]: {
          ...state.progress[imageId],
          status: 'failed',
          stage: 'failed',
          stageMessage: getStageMessage('failed'),
          error,
          completedAt: new Date(),
          lastUpdated: new Date()
        }
      }
    }))
  },

  updateStage: (imageId: string, stage: ImageGenerationStage, message?: string) => {
    const currentProgress = get().progress[imageId]
    if (!currentProgress) return

    const isEdit = !!currentProgress.originalImageId
    const stageMessage = message || getStageMessage(stage, currentProgress.model, currentProgress.progress, isEdit)

    set((state) => ({
      progress: {
        ...state.progress,
        [imageId]: {
          ...state.progress[imageId],
          stage,
          stageMessage,
          lastUpdated: new Date()
        }
      }
    }))
  },

  calculateProgress: (imageId: string) => {
    const current = get().progress[imageId]
    if (!current || current.status !== 'generating') return

    const now = new Date()
    const elapsedTime = Math.floor((now.getTime() - current.createdAt.getTime()) / 1000)

    const progress = calculateProgressFromElapsed(
      elapsedTime,
      current.estimatedTotalTime,
      current.stage,
      current.model || ''
    )

    const remainingTime = Math.max(0, current.estimatedTotalTime - elapsedTime)

    // Update progress more frequently for better visual feedback
    const progressChanged = Math.abs((current.progress || 0) - progress) >= 0.5
    const timeChanged = Math.abs(current.elapsedTime - elapsedTime) >= 1

    if (progressChanged || timeChanged) {
      const isEdit = !!current.originalImageId
      const stageMessage = getStageMessage(current.stage, current.model, progress, isEdit)
      
      // Auto-advance stages based on progress
      let newStage = current.stage
      if (current.stage === 'initializing' && progress >= 15) {
        newStage = 'processing'
      } else if (current.stage === 'processing' && progress >= 88) {
        newStage = 'finalizing'
      }
      
      set((state) => ({
        progress: {
          ...state.progress,
          [imageId]: {
            ...state.progress[imageId],
            elapsedTime,
            progress: Math.min(progress, current.stage === 'completed' ? 100 : 99),
            estimatedRemainingTime: remainingTime,
            stage: newStage,
            stageMessage: getStageMessage(newStage, current.model, progress, isEdit),
            lastUpdated: now
          }
        }
      }))
    }
  },

  getAllGeneratingImages: () => {
    const state = get()
    return Object.values(state.progress).filter(img => img.status === 'generating')
  }
}))