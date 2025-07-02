"use client"

import { useState } from "react"
import Image from "next/image"
import { ContentItem } from "./content-library-tab"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Instagram, 
  Youtube, 
  Facebook, 
  Twitter, 
  Linkedin,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Hash,
  Type,
  FileText,
  Calendar,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { isZapierMCPConfigured, PLATFORM_CONFIGS } from "@/lib/mcp/zapier-mcp-config"

interface ContentPublishModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentItem: ContentItem
  onPublishComplete: (results: Record<string, any>) => void
}

interface PlatformSettings {
  enabled: boolean
  caption?: string
  title?: string
  description?: string
  hashtags?: string[]
  scheduledTime?: string
  platformSpecific?: Record<string, any>
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-600 to-pink-600' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'tiktok', name: 'TikTok', icon: Globe, color: 'bg-black' },
  { id: 'x', name: 'X', icon: Twitter, color: 'bg-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' }
]

export function ContentPublishModal({
  open,
  onOpenChange,
  contentItem,
  onPublishComplete
}: ContentPublishModalProps) {
  const [platformSettings, setPlatformSettings] = useState<Record<string, PlatformSettings>>({
    instagram: { enabled: false, caption: '', hashtags: [] },
    youtube: { enabled: false, title: '', description: '', hashtags: [] },
    facebook: { enabled: false, caption: '' },
    tiktok: { enabled: false, caption: '', hashtags: [] },
    x: { enabled: false, caption: '' },
    linkedin: { enabled: false, caption: '' }
  })
  
  const [publishing, setPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState<Record<string, { status: 'pending' | 'success' | 'error', message?: string }>>({})
  const [activeTab, setActiveTab] = useState('platforms')

  const zapierConfigured = isZapierMCPConfigured()

  const handlePlatformToggle = (platformId: string, enabled: boolean) => {
    setPlatformSettings(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        enabled
      }
    }))
  }

  const updatePlatformSetting = (platformId: string, field: string, value: any) => {
    setPlatformSettings(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value
      }
    }))
  }

  const handleHashtagsChange = (platformId: string, value: string) => {
    const hashtags = value
      .split(/[\s,]+/)
      .filter(tag => tag.length > 0)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    
    updatePlatformSetting(platformId, 'hashtags', hashtags)
  }

  const validatePlatformContent = (platformId: string): boolean => {
    const settings = platformSettings[platformId]
    const config = PLATFORM_CONFIGS[platformId as keyof typeof PLATFORM_CONFIGS]
    
    if (!config) return true

    // Check file type compatibility
    if (contentItem.fileType === 'video' && platformId === 'instagram' && !contentItem.duration) {
      toast.error(`Instagram requires video duration information`)
      return false
    }

    // Check file size
    if (contentItem.fileSize) {
      const maxSize = contentItem.fileType === 'video' ? config.maxVideoSize : config.maxImageSize
      if (contentItem.fileSize > maxSize) {
        toast.error(`File too large for ${platformId}. Max size: ${(maxSize / 1024 / 1024).toFixed(0)}MB`)
        return false
      }
    }

    // Platform-specific validations
    if (platformId === 'youtube' && contentItem.fileType !== 'video') {
      toast.error('YouTube only supports video content')
      return false
    }

    if (platformId === 'x' && settings.caption && settings.caption.length > PLATFORM_CONFIGS.x.maxCharacters) {
      toast.error(`X post exceeds ${PLATFORM_CONFIGS.x.maxCharacters} characters`)
      return false
    }

    return true
  }

  const handlePublish = async () => {
    if (!zapierConfigured) {
      toast.error('Zapier MCP is not configured. Please add your API credentials.')
      return
    }

    const enabledPlatforms = Object.entries(platformSettings)
      .filter(([_, settings]) => settings.enabled)
      .map(([platform]) => platform)

    if (enabledPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    // Validate all platforms
    for (const platform of enabledPlatforms) {
      if (!validatePlatformContent(platform)) {
        return
      }
    }

    setPublishing(true)
    setPublishResults({})
    setActiveTab('progress')

    // Initialize all platforms as pending
    const initialResults: Record<string, any> = {}
    enabledPlatforms.forEach(platform => {
      initialResults[platform] = { status: 'pending' }
    })
    setPublishResults(initialResults)

    try {
      const response = await fetch('/api/content-library/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: contentItem.id,
          platforms: platformSettings
        })
      })

      if (!response.ok) {
        throw new Error('Failed to publish content')
      }

      const results = await response.json()
      setPublishResults(results.platformResults || {})
      
      // Show success/error toasts
      Object.entries(results.platformResults).forEach(([platform, result]: [string, any]) => {
        if (result.status === 'success') {
          toast.success(`Published to ${platform}`)
        } else if (result.status === 'error') {
          toast.error(`Failed to publish to ${platform}: ${result.message}`)
        }
      })

      // Call completion handler
      onPublishComplete(results.platformResults)
    } catch (error) {
      console.error('[PublishModal] Error:', error)
      toast.error('Failed to publish content')
      
      // Mark all as failed
      const failedResults: Record<string, any> = {}
      enabledPlatforms.forEach(platform => {
        failedResults[platform] = { 
          status: 'error', 
          message: 'Network error' 
        }
      })
      setPublishResults(failedResults)
    } finally {
      setPublishing(false)
    }
  }

  function renderPlatformSettings(platformId: string) {
    const settings = platformSettings[platformId]
    const platform = PLATFORMS.find(p => p.id === platformId)
    if (!platform) return null
    
    const Icon = platform.icon

    return (
      <Card key={platformId} className="p-4 bg-[#2B2B2B] border-[#333333]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-medium text-white">{platform.name}</h3>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => handlePlatformToggle(platformId, checked)}
          />
        </div>

        {settings.enabled && (
          <div className="space-y-4 mt-4">
            {/* Caption/Description */}
            {platformId === 'youtube' ? (
              <>
                <div>
                  <Label htmlFor={`${platformId}-title`}>Title</Label>
                  <Input
                    id={`${platformId}-title`}
                    value={settings.title || ''}
                    onChange={(e) => updatePlatformSetting(platformId, 'title', e.target.value)}
                    placeholder="Enter video title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`${platformId}-description`}>Description</Label>
                  <Textarea
                    id={`${platformId}-description`}
                    value={settings.description || ''}
                    onChange={(e) => updatePlatformSetting(platformId, 'description', e.target.value)}
                    placeholder="Enter video description"
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor={`${platformId}-caption`}>
                  Caption
                  {platformId === 'x' && (
                    <span className="text-xs text-gray-400 ml-2">
                      {settings.caption?.length || 0}/{PLATFORM_CONFIGS.x.maxCharacters}
                    </span>
                  )}
                </Label>
                <Textarea
                  id={`${platformId}-caption`}
                  value={settings.caption || ''}
                  onChange={(e) => updatePlatformSetting(platformId, 'caption', e.target.value)}
                  placeholder={`Enter ${platformId === 'x' ? 'tweet' : 'caption'}`}
                  className="mt-1"
                  maxLength={platformId === 'x' ? PLATFORM_CONFIGS.x.maxCharacters : undefined}
                />
              </div>
            )}

            {/* Hashtags */}
            {['instagram', 'youtube', 'tiktok'].includes(platformId) && (
              <div>
                <Label htmlFor={`${platformId}-hashtags`}>
                  Hashtags
                  <span className="text-xs text-gray-400 ml-2">(space or comma separated)</span>
                </Label>
                <Input
                  id={`${platformId}-hashtags`}
                  value={settings.hashtags?.join(' ') || ''}
                  onChange={(e) => handleHashtagsChange(platformId, e.target.value)}
                  placeholder="#example #hashtags"
                  className="mt-1"
                />
              </div>
            )}

            {/* Schedule (future feature) */}
            {false && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Scheduling coming soon</span>
              </div>
            )}
          </div>
        )}
      </Card>
    )
  }

  function renderProgressTab() {
    const enabledPlatforms = Object.entries(platformSettings)
      .filter(([_, settings]) => settings.enabled)
      .map(([platform]) => platform)

    return (
      <div className="space-y-4">
        {enabledPlatforms.map(platformId => {
          const platform = PLATFORMS.find(p => p.id === platformId)
          const result = publishResults[platformId]
          
          if (!platform) return null
          
          const Icon = platform.icon
          
          return (
            <Card key={platformId} className="p-4 bg-[#2B2B2B] border-[#333333]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{platform.name}</h4>
                    {result?.message && (
                      <p className="text-sm text-gray-400">{result.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  {!result || result.status === 'pending' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : result.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#1A1A1A] border-[#333333]">
        <DialogHeader>
          <DialogTitle>Publish Content</DialogTitle>
          <DialogDescription>
            Select platforms and customize your content for each
          </DialogDescription>
        </DialogHeader>

        {/* Content Preview */}
        <div className="flex gap-4 p-4 bg-[#2B2B2B] rounded-lg">
          {contentItem.fileType === 'image' && contentItem.fileUrl && (
            <div className="relative w-24 h-24 rounded overflow-hidden flex-shrink-0">
              <Image
                src={contentItem.thumbnailUrl || contentItem.fileUrl}
                alt={contentItem.title || 'Content'}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">
              {contentItem.title || 'Untitled'}
            </h3>
            <p className="text-sm text-gray-400 capitalize">{contentItem.fileType}</p>
            {contentItem.tags && contentItem.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {contentItem.tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {!zapierConfigured && (
          <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <p className="text-sm text-yellow-500">
              Zapier MCP is not configured. Please add your API credentials to enable publishing.
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="progress" disabled={!publishing && Object.keys(publishResults).length === 0}>
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platforms" className="space-y-4 max-h-[400px] overflow-y-auto">
            {PLATFORMS.map(platform => renderPlatformSettings(platform.id))}
          </TabsContent>

          <TabsContent value="progress">
            {renderProgressTab()}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {activeTab === 'platforms' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={!zapierConfigured || publishing}
              >
                {publishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish'
                )}
              </Button>
            </>
          )}
          {activeTab === 'progress' && !publishing && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}