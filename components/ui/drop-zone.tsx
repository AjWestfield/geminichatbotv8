"use client"

import React, { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Upload, ImageIcon, FileIcon } from "lucide-react"

interface DropZoneProps {
  onDrop: (files: File[]) => void
  acceptedFileTypes?: string[]
  maxFiles?: number
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  showBorder?: boolean
  showOverlay?: boolean
  overlayMessage?: string
  overlayIcon?: React.ReactNode
}

export function DropZone({
  onDrop,
  acceptedFileTypes = ["image/*", "video/*"],
  maxFiles,
  disabled = false,
  className,
  children,
  showBorder = true,
  showOverlay = true,
  overlayMessage = "Drop files here",
  overlayIcon = <Upload className="w-8 h-8" />
}: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)
  const dragDepthRef = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    dragDepthRef.current++
    setDragDepth(dragDepthRef.current)
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    dragDepthRef.current--
    setDragDepth(dragDepthRef.current)
    
    if (dragDepthRef.current === 0) {
      setIsDragActive(false)
    }
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    // Set drop effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy"
    }
  }, [disabled])

  const isAcceptedFileType = (file: File): boolean => {
    if (acceptedFileTypes.length === 0) return true
    
    return acceptedFileTypes.some(type => {
      if (type.endsWith("/*")) {
        const category = type.replace("/*", "")
        return file.type.startsWith(category + "/")
      }
      return file.type === type
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    // Reset drag state
    dragDepthRef.current = 0
    setDragDepth(0)
    setIsDragActive(false)
    
    // Get files from the drop event
    const files = Array.from(e.dataTransfer.files)
    
    // Filter accepted files
    const acceptedFiles = files.filter(isAcceptedFileType)
    
    if (acceptedFiles.length === 0) {
      console.warn("[DropZone] No accepted files in drop")
      return
    }
    
    // Apply max files limit if specified
    const filesToProcess = maxFiles
      ? acceptedFiles.slice(0, maxFiles)
      : acceptedFiles
    
    // Call the onDrop callback with accepted files
    onDrop(filesToProcess)
  }, [disabled, onDrop, acceptedFileTypes, maxFiles])

  return (
    <div
      className={cn(
        "relative",
        showBorder && isDragActive && "ring-2 ring-blue-500",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Overlay when dragging */}
      {showOverlay && isDragActive && !disabled && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg transition-all duration-300 animate-in fade-in"
          onDragEnter={(e) => e.preventDefault()}
          onDragLeave={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-blue-500/30 transform transition-transform duration-200 scale-105">
            <div className="mb-4 text-blue-400 animate-pulse">
              {overlayIcon}
            </div>
            <p className="text-lg font-semibold text-white mb-2">
              {overlayMessage}
            </p>
            <p className="text-sm text-gray-400">
              Release to upload files
            </p>
          </div>
        </div>
      )}
    </div>
  )
}