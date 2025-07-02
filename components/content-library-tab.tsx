"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { ContentLibraryGallery } from "./content-library-gallery"
import { ContentUploadZone } from "./content-upload-zone"
import { ContentPublishModal } from "./content-publish-modal"
import { toast } from "sonner"
import { Upload, Loader2 } from "lucide-react"

export interface ContentItem {
  id: string
  userId?: string
  fileUrl: string
  fileType: 'image' | 'video' | 'audio' | 'document'
  mimeType?: string
  fileSize?: number
  title?: string
  description?: string
  tags?: string[]
  platforms?: Record<string, any>
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
  thumbnailUrl?: string
  duration?: number
  dimensions?: { width: number; height: number }
}

interface ContentLibraryTabProps {
  chatId?: string
  onFileUpload?: (files: File[]) => Promise<void>
}

export function ContentLibraryTab({ chatId, onFileUpload }: ContentLibraryTabProps) {
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  // Load content items on mount
  useEffect(() => {
    loadContentItems()
  }, [chatId])

  const loadContentItems = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/content-library/list')
      if (!response.ok) {
        throw new Error('Failed to load content')
      }
      const data = await response.json()
      setContentItems(data.items || [])
    } catch (error) {
      console.error('[ContentLibrary] Error loading content:', error)
      toast.error('Failed to load content library')
    } finally {
      setLoading(false)
    }
  }

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return

    const uploadPromises = files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)
      
      // Generate a temporary ID for progress tracking
      const tempId = `upload-${Date.now()}-${Math.random()}`
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }))

      try {
        const response = await fetch('/api/content-library/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Upload failed')
        }

        const result = await response.json()
        
        // Remove from progress tracking
        setUploadProgress(prev => {
          const updated = { ...prev }
          delete updated[tempId]
          return updated
        })

        return result.item
      } catch (error) {
        console.error('[ContentLibrary] Upload error:', error)
        // Remove from progress tracking
        setUploadProgress(prev => {
          const updated = { ...prev }
          delete updated[tempId]
          return updated
        })
        throw error
      }
    })

    try {
      toast.info(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`)
      const uploadedItems = await Promise.all(uploadPromises)
      
      // Add new items to the list
      setContentItems(prev => [...uploadedItems, ...prev])
      
      toast.success(`Successfully uploaded ${uploadedItems.length} file${uploadedItems.length > 1 ? 's' : ''}`)
    } catch (error) {
      toast.error('Some files failed to upload')
    }
  }

  const handleItemClick = (item: ContentItem) => {
    setSelectedItem(item)
    setPublishModalOpen(true)
  }

  const handlePublishComplete = async (platformResults: Record<string, any>) => {
    // Refresh the item to show updated platform status
    await loadContentItems()
    setPublishModalOpen(false)
    setSelectedItem(null)
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/content-library/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      // Remove from local state
      setContentItems(prev => prev.filter(item => item.id !== itemId))
      toast.success('Item deleted successfully')
    } catch (error) {
      console.error('[ContentLibrary] Delete error:', error)
      toast.error('Failed to delete item')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Upload Zone */}
      <div className="mb-6">
        <ContentUploadZone
          onFilesSelected={handleFilesSelected}
          acceptedFileTypes={['image/*', 'video/*', 'audio/*']}
          maxFileSize={500 * 1024 * 1024} // 500MB
          className="h-32"
        />
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card className="mb-4 p-4 bg-[#2B2B2B] border-[#333333]">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading {Object.keys(uploadProgress).length} file{Object.keys(uploadProgress).length > 1 ? 's' : ''}...
          </div>
        </Card>
      )}

      {/* Content Gallery */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : contentItems.length === 0 ? (
          <Card className="flex flex-col items-center justify-center h-full bg-[#1A1A1A] border-[#333333] border-dashed">
            <Upload className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-gray-400 text-center">
              Your content library is empty
              <br />
              <span className="text-sm">Upload files to get started</span>
            </p>
          </Card>
        ) : (
          <ContentLibraryGallery
            items={contentItems}
            onItemClick={handleItemClick}
            onItemDelete={handleDeleteItem}
          />
        )}
      </div>

      {/* Publish Modal */}
      {selectedItem && (
        <ContentPublishModal
          open={publishModalOpen}
          onOpenChange={setPublishModalOpen}
          contentItem={selectedItem}
          onPublishComplete={handlePublishComplete}
        />
      )}
    </div>
  )
}