/**
 * Integration tests for Instagram URL-to-video enhancement features
 * Tests the complete workflow from URL detection to video display
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { InstagramPreview } from '@/components/ui/instagram-preview'
import { EnhancedVideoModal } from '@/components/ui/enhanced-video-modal'
import { detectInstagramUrl, extractInstagramUrls } from '@/lib/instagram-url-utils'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock toast notifications
const mockToast = jest.fn()
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

describe('Instagram URL-to-Video Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('URL Detection', () => {
    test('should detect Instagram reel URLs correctly', () => {
      const testUrls = [
        'https://www.instagram.com/reel/ABC123/',
        'https://instagram.com/p/DEF456/',
        'https://www.instagram.com/stories/username/789/',
        'https://www.instagram.com/tv/GHI789/'
      ]

      testUrls.forEach(url => {
        const detection = detectInstagramUrl(url)
        expect(detection.isValid).toBe(true)
        expect(detection.url).toBe(url)
      })
    })

    test('should extract multiple Instagram URLs from text', () => {
      const text = `
        Check out this reel: https://www.instagram.com/reel/ABC123/
        And this post: https://instagram.com/p/DEF456/
        Also this story: https://www.instagram.com/stories/user/789/
      `
      
      const extracted = extractInstagramUrls(text)
      expect(extracted).toHaveLength(3)
      expect(extracted[0].type).toBe('reel')
      expect(extracted[1].type).toBe('post')
      expect(extracted[2].type).toBe('story')
    })

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'https://youtube.com/watch?v=123',
        'https://tiktok.com/@user/video/123',
        'not-a-url',
        'https://instagram.com/invalid-path'
      ]

      invalidUrls.forEach(url => {
        const detection = detectInstagramUrl(url)
        expect(detection.isValid).toBe(false)
      })
    })
  })

  describe('Instagram Preview Component', () => {
    const mockProps = {
      url: 'https://www.instagram.com/reel/ABC123/',
      mediaId: 'ABC123',
      type: 'reel',
      isDownloading: false,
      downloadProgress: 0,
      onDownload: jest.fn(),
      onRemove: jest.fn()
    }

    test('should render Instagram preview with correct metadata', async () => {
      // Mock successful metadata fetch
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isVideo: true,
          title: 'Test Instagram Reel',
          author: 'testuser',
          duration: 30
        })
      })

      render(<InstagramPreview {...mockProps} />)

      expect(screen.getByText('Instagram Reel Preview')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Test Instagram Reel')).toBeInTheDocument()
        expect(screen.getByText('by testuser')).toBeInTheDocument()
      })
    })

    test('should handle download button click', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isVideo: true, title: 'Test Reel' })
      })

      render(<InstagramPreview {...mockProps} />)

      const downloadButton = screen.getByRole('button', { name: /download/i })
      fireEvent.click(downloadButton)

      expect(mockProps.onDownload).toHaveBeenCalledWith(mockProps.url)
    })

    test('should handle remove button click', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isVideo: true, title: 'Test Reel' })
      })

      render(<InstagramPreview {...mockProps} />)

      const removeButton = screen.getByRole('button', { name: /remove preview/i })
      fireEvent.click(removeButton)

      expect(mockProps.onRemove).toHaveBeenCalled()
    })

    test('should show loading state during download', async () => {
      const loadingProps = { ...mockProps, isDownloading: true, downloadProgress: 45 }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isVideo: true, title: 'Test Reel' })
      })

      render(<InstagramPreview {...loadingProps} />)

      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /downloading/i })).toBeDisabled()
    })

    test('should handle metadata fetch errors gracefully', async () => {
      // Mock failed metadata fetch
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<InstagramPreview {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Enhanced Video Modal', () => {
    const mockVideoFile = {
      name: 'Instagram_Reel_ABC123.mp4',
      url: 'https://example.com/video.mp4',
      contentType: 'video/mp4',
      videoThumbnail: 'https://example.com/thumb.jpg',
      videoDuration: 30
    }

    const mockModalProps = {
      isOpen: true,
      onClose: jest.fn(),
      file: mockVideoFile,
      onAnalyze: jest.fn(),
      onReverseEngineer: jest.fn()
    }

    test('should render enhanced video modal with Instagram branding', () => {
      render(<EnhancedVideoModal {...mockModalProps} />)

      expect(screen.getByText('Instagram_Reel_ABC123.mp4')).toBeInTheDocument()
      expect(screen.getByText('IG')).toBeInTheDocument() // Instagram badge
    })

    test('should handle analyze button click', () => {
      render(<EnhancedVideoModal {...mockModalProps} />)

      const analyzeButton = screen.getByRole('button', { name: /analyze/i })
      fireEvent.click(analyzeButton)

      expect(mockModalProps.onAnalyze).toHaveBeenCalledWith(
        mockVideoFile.name,
        mockVideoFile.contentType
      )
      expect(mockModalProps.onClose).toHaveBeenCalled()
    })

    test('should handle reverse engineer button click', () => {
      render(<EnhancedVideoModal {...mockModalProps} />)

      const reverseButton = screen.getByRole('button', { name: /reverse engineer/i })
      fireEvent.click(reverseButton)

      expect(mockModalProps.onReverseEngineer).toHaveBeenCalledWith(
        mockVideoFile.name,
        mockVideoFile.contentType
      )
      expect(mockModalProps.onClose).toHaveBeenCalled()
    })

    test('should handle download button click', () => {
      // Mock createElement and click for download
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

      render(<EnhancedVideoModal {...mockModalProps} />)

      const downloadButton = screen.getByRole('button', { name: /download/i })
      fireEvent.click(downloadButton)

      expect(mockAnchor.href).toBe(mockVideoFile.url)
      expect(mockAnchor.download).toBe(mockVideoFile.name)
      expect(mockAnchor.click).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should handle API errors with specific messages', async () => {
      const errorCases = [
        { status: 404, expectedMessage: /content not found/i },
        { status: 429, expectedMessage: /rate limited/i },
        { status: 500, expectedMessage: /failed to load preview/i }
      ]

      for (const { status, expectedMessage } of errorCases) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status
        })

        render(
          <InstagramPreview
            url="https://www.instagram.com/reel/ABC123/"
            mediaId="ABC123"
            type="reel"
            onDownload={jest.fn()}
            onRemove={jest.fn()}
          />
        )

        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeInTheDocument()
        })

        // Clean up for next iteration
        screen.unmount?.()
      }
    })

    test('should handle network timeouts', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      )

      render(
        <InstagramPreview
          url="https://www.instagram.com/reel/ABC123/"
          mediaId="ABC123"
          type="reel"
          onDownload={jest.fn()}
          onRemove={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Responsive Design', () => {
    test('should adapt to different screen sizes', () => {
      const { container } = render(
        <InstagramPreview
          url="https://www.instagram.com/reel/ABC123/"
          mediaId="ABC123"
          type="reel"
          onDownload={jest.fn()}
          onRemove={jest.fn()}
        />
      )

      // Check for responsive classes
      const previewContainer = container.querySelector('.sm\\:p-4')
      expect(previewContainer).toBeInTheDocument()

      const thumbnail = container.querySelector('.sm\\:w-20')
      expect(thumbnail).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      render(
        <InstagramPreview
          url="https://www.instagram.com/reel/ABC123/"
          mediaId="ABC123"
          type="reel"
          onDownload={jest.fn()}
          onRemove={jest.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /remove preview/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /download instagram media/i })).toBeInTheDocument()
    })

    test('should handle keyboard navigation', () => {
      render(
        <InstagramPreview
          url="https://www.instagram.com/reel/ABC123/"
          mediaId="ABC123"
          type="reel"
          onDownload={jest.fn()}
          onRemove={jest.fn()}
        />
      )

      const downloadButton = screen.getByRole('button', { name: /download/i })
      downloadButton.focus()
      expect(document.activeElement).toBe(downloadButton)
    })
  })
})
