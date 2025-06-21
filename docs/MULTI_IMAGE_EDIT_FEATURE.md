# Multi-Image Edit Feature Documentation

## Overview
The multi-image edit feature allows users to combine 2-10 images using the WaveSpeed Flux Kontext Max Multi model. The feature is accessible through the multi-image edit button in the image gallery.

## Current Behavior (As of June 20, 2025)

### What Works
✅ Multi-image selection (2-10 images)
✅ API integration with WaveSpeed
✅ Image validation and conversion to base64
✅ Progress tracking during generation
✅ Error handling with detailed messages
✅ Automatic retry with exponential backoff

### Known Limitations
1. **Output Format**: The model currently generates side-by-side comparisons or split-screen layouts rather than true composites where subjects from different images are merged into a single scene.

2. **Content Type Issue**: Fixed - WaveSpeed returns images with `binary/octet-stream` content type, now handled properly.

## How It Works

### Process Flow
1. User selects 2-10 images from the gallery
2. User enters a prompt describing how to combine them
3. Images are validated and converted to base64 if needed
4. Request sent to WaveSpeed API
5. System polls for completion (typically 5-10 seconds)
6. Generated image is saved to database and blob storage

### API Details
- **Model**: `wavespeed-ai/flux-kontext-max/multi`
- **Endpoint**: `/api/edit-multi-image`
- **Supported formats**: HTTP URLs and data URLs
- **Size limits**: Images are automatically converted to prevent timeout

## Example Use Cases

### Current Capability
- Creating before/after comparisons
- Side-by-side layouts
- Split-screen compositions
- Collage-style outputs

### Prompts That Work Well
- "Show both images side by side"
- "Create a before and after comparison"
- "Combine these images into a collage"

### Prompts That May Not Work As Expected
- "Put the man with the hat at the beach with the man in blue jacket" (creates split screen instead of composite)
- "Merge these subjects into one scene" (creates side-by-side instead)

## Troubleshooting

### Common Issues
1. **"Unknown error"** - Usually means the API returned an unexpected response format
2. **Binary/octet-stream error** - Fixed by detecting image type from file signature
3. **Timeout errors** - Images may be too large; system now converts to base64 automatically

### Debug Information
Enable console logging to see:
- `[API]` - API route processing
- `[WaveSpeed Multi]` - Client operations  
- `[WaveSpeed DEBUG]` - Detailed request/response data
- `[BLOB]` - Blob storage operations

## Future Improvements
1. Better composite generation (may require different model)
2. Support for more sophisticated merging operations
3. Preview of expected output style before generation
4. Client-side image optimization before upload

## Technical Details

### Image Validation
- Checks URL accessibility with HEAD request
- Validates file size (warns if < 1KB)
- Converts HTTP URLs to base64 to prevent expiration
- Supports both data URLs and HTTP URLs

### Error Handling
- Exponential backoff for polling (1s → 1.5s → 2.25s... max 10s)
- Detailed error messages from API
- Fallback to original URL if blob upload fails
- Feature flag support (`DISABLE_WAVESPEED_MULTI_IMAGE`)
