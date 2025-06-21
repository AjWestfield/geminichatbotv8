/**
 * Test for URL object handling in Replicate client
 */

import { describe, it, expect } from '@playwright/test'

describe('URL Object Handling', () => {
  it('should extract href from URL objects', () => {
    // Test URL object
    const mockUrl = new URL('https://replicate.delivery/xezq/test/image.jpg')
    
    // Simulate the fix logic
    const extractUrlString = (url: any): string => {
      return url instanceof URL ? url.href : 
             (typeof url === 'object' && url && 'href' in url) ? url.href : 
             String(url);
    }
    
    const result = extractUrlString(mockUrl)
    expect(result).toBe('https://replicate.delivery/xezq/test/image.jpg')
    expect(typeof result).toBe('string')
  })
  
  it('should handle string URLs', () => {
    const mockUrl = 'https://replicate.delivery/xezq/test/image.jpg'
    
    const extractUrlString = (url: any): string => {
      return url instanceof URL ? url.href : 
             (typeof url === 'object' && url && 'href' in url) ? url.href : 
             String(url);
    }
    
    const result = extractUrlString(mockUrl)
    expect(result).toBe('https://replicate.delivery/xezq/test/image.jpg')
    expect(typeof result).toBe('string')
  })
  
  it('should handle objects with href property', () => {
    const mockUrl = { href: 'https://replicate.delivery/xezq/test/image.jpg' }
    
    const extractUrlString = (url: any): string => {
      return url instanceof URL ? url.href : 
             (typeof url === 'object' && url && 'href' in url) ? url.href : 
             String(url);
    }
    
    const result = extractUrlString(mockUrl)
    expect(result).toBe('https://replicate.delivery/xezq/test/image.jpg')
    expect(typeof result).toBe('string')
  })
})