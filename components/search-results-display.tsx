import { Card } from "@/components/ui/card"
import { ExternalLink, Calendar, Globe, ChevronRight, Search, Sparkles } from "lucide-react"
import { useState } from "react"
import { SearchImageModal } from "./search-image-modal"
import { Button } from "@/components/ui/button"
import { EnhancedTable, parseTableFromMarkdown } from "./enhanced-table"
import { getSourceLogo } from "@/lib/source-logos"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { extractMainContent, formatSearchDescription, extractDomain, formatSearchDate } from "@/lib/search-content-cleaner"

interface SearchResult {
  title: string
  url: string
  date?: string
  thumbnail?: string
  description?: string
}

interface SearchImage {
  url?: string
  image_url?: string
  title?: string
  source?: string
  origin_url?: string
  height?: number
  width?: number
}

interface SearchResultsDisplayProps {
  content: string
  searchResults?: SearchResult[]
  images?: SearchImage[]
  followUpQuestions?: string[]
  onFollowUpClick?: (question: string) => void
}

// Simple markdown parser similar to chat-message.tsx
function parseSimpleMarkdown(text: string) {
  // Split by double asterisks to handle bold text
  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove asterisks and make bold
      const boldText = part.slice(2, -2)
      return <strong key={index} className="font-semibold">{boldText}</strong>
    }

    // Handle line breaks
    const lines = part.split('\n')
    return lines.map((line, lineIndex) => (
      <span key={`${index}-${lineIndex}`}>
        {line}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    ))
  })
}

export function SearchResultsDisplay({ content, searchResults, images, followUpQuestions, onFollowUpClick }: SearchResultsDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<SearchImage | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Clean the content using our utility function
  const cleanContent = extractMainContent(content)

  // Check if content contains a table
  const tableData = parseTableFromMarkdown(cleanContent)
  const contentWithoutTable = tableData
    ? cleanContent.replace(/\|(.+)\|[\s\S]*?\n\|[-:\s|]+\|[\s\S]*?\n((?:\|.+\|\n?)+)/, '').replace(/#+\s*Summary Table[\s\S]*?\n\n((?:\|.+\|\n?)+)/i, '').trim()
    : cleanContent

  const handleImageClick = (image: SearchImage) => {
    setSelectedImage(image)
    setIsImageModalOpen(true)
  }

  return (
    <div className="space-y-6 w-full">
      {/* Search Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Web Search Results
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Found {searchResults?.length || 0} sources with current information
            </p>
          </div>
        </div>
        <div className="sm:ml-auto">
          <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400">
            <Sparkles className="w-3 h-3 mr-1" />
            Live Results
          </Badge>
        </div>
      </div>
      {/* Enhanced Table if present */}
      {tableData && (
        <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700">
          <div className="w-full overflow-x-auto">
            <EnhancedTable data={tableData} />
          </div>
        </Card>
      )}

      {/* Main content (without table) */}
      {contentWithoutTable && (
        <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {parseSimpleMarkdown(contentWithoutTable)}
            </div>
          </div>
        </Card>
      )}

      {/* Images Grid */}
      {images && images.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Related Images</h3>
            <Badge variant="outline" className="text-xs">
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.slice(0, 8).map((image, index) => (
              <Card
                key={index}
                className="group cursor-pointer rounded-xl overflow-hidden hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-[1.02] border-gray-200 dark:border-gray-700"
                onClick={() => handleImageClick(image)}
              >
                <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={image.url || image.image_url || ''}
                    alt={image.title || `Search result ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      // Hide broken images
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                {image.title && (
                  <div className="p-3 bg-white dark:bg-gray-900">
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {image.title}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {searchResults && searchResults.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sources</h3>
              <Badge variant="outline" className="text-xs">
                {searchResults.length} {searchResults.length === 1 ? 'source' : 'sources'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click to visit original source
            </p>
          </div>
          <div className="grid gap-4">
            {searchResults.map((result, index) => {
              const domain = extractDomain(result.url)
              // Try to find a matching image for this source
              const matchingImage = images?.find(img =>
                img.source?.includes(domain) ||
                img.origin_url?.includes(domain)
              )
              // Get source logo
              const sourceLogo = getSourceLogo(result.url)
              const displayImage = matchingImage?.url || matchingImage?.image_url || sourceLogo

              return (
                <Card key={index} className="group p-4 sm:p-6 hover:shadow-lg hover:shadow-blue-500/15 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {displayImage ? (
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all duration-300">
                        <img
                          src={displayImage}
                          alt={result.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to numbered circle on error
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold flex items-center justify-center shadow-sm">${index + 1}</span>`;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <span className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                        {index + 1}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug mb-3 group-hover:underline text-base">
                          {result.title}
                        </h4>
                      </a>
                      {result.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4">
                          {formatSearchDescription(result.description)}
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            <span className="font-medium">{domain}</span>
                          </div>
                          {result.date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatSearchDate(result.date)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="font-medium">Visit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Follow-up Questions */}
      {followUpQuestions && followUpQuestions.length > 0 && onFollowUpClick && (
        <div className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Related Questions</h3>
            <Badge variant="outline" className="text-xs">
              {followUpQuestions.length} suggestions
            </Badge>
          </div>
          <div className="grid gap-3">
            {followUpQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="lg"
                className="text-sm text-left justify-between items-center gap-3 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-950/50 dark:hover:border-blue-800 dark:hover:text-blue-300 transition-all duration-200 whitespace-normal h-auto py-4 px-4 border-gray-200 dark:border-gray-700"
                onClick={() => onFollowUpClick(question)}
              >
                <span className="flex-1 text-left leading-relaxed">{question}</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      <SearchImageModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false)
          setSelectedImage(null)
        }}
        image={selectedImage}
      />
    </div>
  )
}
