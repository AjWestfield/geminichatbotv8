"use client"

import { useState, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, X, FileIcon, ImageIcon, VideoIcon, AudioLines } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ContentUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
  maxFiles?: number
  className?: string
}

export function ContentUploadZone({
  onFilesSelected,
  acceptedFileTypes = ['image/*', 'video/*', 'audio/*'],
  maxFileSize = 500 * 1024 * 1024, // 500MB default
  maxFiles = 10,
  className
}: ContentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />
    if (file.type.startsWith('video/')) return <VideoIcon className="w-5 h-5" />
    if (file.type.startsWith('audio/')) return <AudioLines className="w-5 h-5" />
    return <FileIcon className="w-5 h-5" />
  }

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name} exceeds maximum size of ${formatFileSize(maxFileSize)}`)
        continue
      }

      // Check file type
      const isValidType = acceptedFileTypes.some(type => {
        if (type.endsWith('/*')) {
          const category = type.split('/')[0]
          return file.type.startsWith(category + '/')
        }
        return file.type === type
      })

      if (!isValidType) {
        errors.push(`${file.name} is not an accepted file type`)
        continue
      }

      validFiles.push(file)
    }

    // Check max files
    if (validFiles.length + selectedFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`)
      validFiles.splice(maxFiles - selectedFiles.length)
    }

    if (errors.length > 0) {
      toast.error(errors.join('\n'))
    }

    return validFiles
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only set dragging to false if we're leaving the zone entirely
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const validFiles = validateFiles(files)
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }, [selectedFiles, validateFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = validateFiles(files)
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast.error('No files selected')
      return
    }
    
    onFilesSelected(selectedFiles)
    setSelectedFiles([])
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          "hover:border-[#444444] hover:bg-[#2B2B2B]/50",
          isDragging ? "border-blue-500 bg-blue-500/10" : "border-[#333333] bg-[#1A1A1A]"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="p-8 text-center">
          <Upload className={cn(
            "w-12 h-12 mx-auto mb-4",
            isDragging ? "text-blue-500" : "text-gray-500"
          )} />
          <p className="text-white font-medium mb-2">
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            or click to browse
          </p>
          <p className="text-xs text-gray-500">
            Supported: Images, Videos, Audio • Max size: {formatFileSize(maxFileSize)}
          </p>
        </div>
      </Card>

      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card className="p-4 bg-[#1A1A1A] border-[#333333]">
          <div className="space-y-2 mb-4">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-[#2B2B2B] rounded"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-gray-400">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              className="flex-1"
            >
              Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedFiles([])}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}