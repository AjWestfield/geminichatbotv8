"use client"

import { useState } from "react"
import Image from "next/image"
import { ContentItem } from "./content-library-tab"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MoreVertical, 
  Trash2, 
  Share2, 
  Edit, 
  Download,
  FileVideo,
  FileAudio,
  FileText,
  FileImage,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Linkedin
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"

interface ContentLibraryGalleryProps {
  items: ContentItem[]
  onItemClick: (item: ContentItem) => void
  onItemDelete?: (itemId: string) => void
  onItemEdit?: (item: ContentItem) => void
}

export function ContentLibraryGallery({ 
  items, 
  onItemClick, 
  onItemDelete,
  onItemEdit 
}: ContentLibraryGalleryProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <FileImage className="w-5 h-5" />
      case 'video':
        return <FileVideo className="w-5 h-5" />
      case 'audio':
        return <FileAudio className="w-5 h-5" />
      case 'document':
        return <FileText className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="w-3 h-3" />
      case 'youtube':
        return <Youtube className="w-3 h-3" />
      case 'facebook':
        return <Facebook className="w-3 h-3" />
      case 'x':
      case 'twitter':
        return <Twitter className="w-3 h-3" />
      case 'linkedin':
        return <Linkedin className="w-3 h-3" />
      default:
        return null
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const renderThumbnail = (item: ContentItem) => {
    if (item.fileType === 'image' && item.fileUrl) {
      return (
        <div className="relative w-full h-48 bg-[#2B2B2B] rounded-t-lg overflow-hidden">
          <Image
            src={item.thumbnailUrl || item.fileUrl}
            alt={item.title || 'Content'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {item.duration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(item.duration)}
            </div>
          )}
        </div>
      )
    }

    if (item.fileType === 'video' && item.thumbnailUrl) {
      return (
        <div className="relative w-full h-48 bg-[#2B2B2B] rounded-t-lg overflow-hidden">
          <Image
            src={item.thumbnailUrl}
            alt={item.title || 'Video thumbnail'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <FileVideo className="w-6 h-6 text-white" />
            </div>
          </div>
          {item.duration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(item.duration)}
            </div>
          )}
        </div>
      )
    }

    // Default icon-based thumbnail
    return (
      <div className="w-full h-48 bg-[#2B2B2B] rounded-t-lg flex items-center justify-center">
        <div className="text-gray-500">
          {getFileIcon(item.fileType)}
        </div>
      </div>
    )
  }

  const getPublishedPlatforms = (item: ContentItem) => {
    if (!item.platforms) return []
    return Object.entries(item.platforms)
      .filter(([_, data]: [string, any]) => data.published)
      .map(([platform]) => platform)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const publishedPlatforms = getPublishedPlatforms(item)
        
        return (
          <Card
            key={item.id}
            className="bg-[#1A1A1A] border-[#333333] overflow-hidden hover:border-[#444444] transition-colors cursor-pointer group"
            onClick={() => onItemClick(item)}
          >
            {/* Thumbnail */}
            {renderThumbnail(item)}

            {/* Content Info */}
            <div className="p-4">
              {/* Title and Type */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-white truncate">
                    {item.title || 'Untitled'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    {getFileIcon(item.fileType)}
                    <span>{formatFileSize(item.fileSize)}</span>
                  </div>
                </div>
                
                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onItemClick(item)
                    }}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Publish
                    </DropdownMenuItem>
                    {onItemEdit && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onItemEdit(item)
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      // Download functionality
                      window.open(item.fileUrl, '_blank')
                    }}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    {onItemDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to delete this item?')) {
                              onItemDelete(item.id)
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs bg-[#2B2B2B] text-gray-400"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-[#2B2B2B] text-gray-400"
                    >
                      +{item.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Published Platforms */}
              {publishedPlatforms.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">Published to:</span>
                  <div className="flex gap-1">
                    {publishedPlatforms.map((platform) => (
                      <div
                        key={platform}
                        className="w-6 h-6 bg-[#2B2B2B] rounded flex items-center justify-center"
                        title={platform}
                      >
                        {getPlatformIcon(platform)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Time */}
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}