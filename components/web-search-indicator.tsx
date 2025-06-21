import React from 'react'
import { Search, Globe, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WebSearchIndicatorProps {
  isSearching: boolean
  searchQuery?: string
  resultsCount?: number
}

export function WebSearchIndicator({ isSearching, searchQuery, resultsCount }: WebSearchIndicatorProps) {
  return (
    <AnimatePresence>
      {isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl mb-4 border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
        >
          <div className="relative">
            <Globe className="w-5 h-5 text-blue-500" />
            <Loader2 className="absolute inset-0 w-5 h-5 text-blue-600 animate-spin" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Searching the web...
              </span>
            </div>
            {searchQuery && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 truncate font-medium">
                "{searchQuery}"
              </p>
            )}
          </div>

          {resultsCount !== undefined && (
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-full text-xs text-blue-700 dark:text-blue-300 font-semibold">
              {resultsCount} results
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface WebSearchResultsProps {
  results: Array<{
    title: string
    url: string
    content: string
    score: number
    published_date?: string
  }>
  isVisible: boolean
}

export function WebSearchResults({ results, isVisible }: WebSearchResultsProps) {
  if (!isVisible || results.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Web Search Results
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({results.length} sources)
        </span>
      </div>

      <div className="space-y-2">
        {results.slice(0, 3).map((result, index) => (
          <div
            key={index}
            className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                >
                  {result.title}
                </a>
                <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {result.content}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">{Math.round(result.score * 100)}%</span>
              </div>
            </div>
            {result.published_date && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(result.published_date).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
