/**
 * Instagram Video Thumbnail Fix Utilities
 */

export function ensureInstagramThumbnail(file: any): void {
  if (!file || !file.name?.toLowerCase().includes('instagram')) {
    return;
  }
  
  // Check all possible thumbnail locations
  const thumbnailSources = [
    file.videoThumbnail,
    file.thumbnail,
    file.preview,
    file._thumbnail,
    file.file?.videoThumbnail,
    file.file?.thumbnail
  ];
  
  let validThumbnail = null;
  for (const source of thumbnailSources) {
    if (source && typeof source === 'string' && source.startsWith('data:image/')) {
      validThumbnail = source;
      break;
    }
  }
  
  if (validThumbnail && !file.videoThumbnail) {
    file.videoThumbnail = validThumbnail;
    console.log('[Instagram Thumbnail Fix] Applied thumbnail from alternate source');
  }
}

export function debugFileObject(file: any, context: string): void {
  if (!file?.name?.toLowerCase().includes('instagram')) {
    return;
  }
  
  console.log(`[${context}] Instagram file debug:`, {
    fileName: file.name,
    fileType: file.type || file.contentType,
    hasVideoThumbnail: !!file.videoThumbnail,
    thumbnailType: file.videoThumbnail ? typeof file.videoThumbnail : 'none',
    thumbnailLength: file.videoThumbnail?.length || 0,
    thumbnailStart: file.videoThumbnail?.substring(0, 50),
    allKeys: Object.keys(file).filter(k => k.includes('thumb') || k.includes('preview')),
    isFile: file instanceof File,
    hasFileProperty: !!file.file
  });
}
