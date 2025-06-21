# Multi-Image Edit Split Screen Issue Analysis

## Issue Summary
The WaveSpeed Flux Kontext Max Multi model is creating split-screen/side-by-side layouts instead of true composite images where subjects from different images are merged into a single coherent scene.

## Current Behavior
When given a prompt like "the man with the hat is at the location with the man with the blue jacket", the model:
- Creates a split-screen image with both men shown separately
- Places white borders between the images
- Does NOT composite the subjects into a single scene

## Root Cause Analysis

### 1. Model Design Limitation
The Flux Kontext Max Multi model appears to be designed primarily for:
- **Side-by-side comparisons**: Before/after, style comparisons
- **Collage layouts**: Multiple images arranged together
- **Split-screen compositions**: Showing multiple subjects separately

### 2. API Parameters
The API only accepts these parameters:
```json
{
  "guidance_scale": 3.5,
  "images": ["image1", "image2"],
  "prompt": "your prompt",
  "safety_tolerance": "2"
}
```

There are NO parameters to control:
- Composition style (merged vs split)
- Layout type (horizontal, vertical, grid)
- Blending mode or seamless integration

### 3. Prompt Interpretation
The model seems to interpret ALL prompts as requests for side-by-side layouts, regardless of wording:
- "Put X at the location with Y" → Split screen
- "Combine these images" → Split screen
- "Merge X and Y into one scene" → Split screen

## Potential Solutions

### Solution 1: Adjust User Expectations (Recommended)
Update the UI and documentation to set proper expectations:

```typescript
// Update the modal description
"Create comparisons, collages, and split-screen compositions from multiple images"

// Update example prompts
"Show both subjects side by side"
"Create a before and after comparison"
"Make a collage of these images"
```

### Solution 2: Use a Different Model
For true image compositing, consider:
1. **Stable Diffusion Inpainting**: Can merge subjects into scenes
2. **DALL-E 3 Edit**: Better at understanding spatial relationships
3. **Custom Compositing Pipeline**: Use multiple steps (segment → compose → refine)

### Solution 3: Pre-process Images
Create a custom pipeline:
1. Use image segmentation to extract subjects
2. Manually composite them into a single image
3. Use single-image generation to refine the result

### Solution 4: Contact WaveSpeed Support
Ask if they have:
- A different endpoint for true compositing
- Plans to add composition style parameters
- Alternative models better suited for merging

## Recommended Implementation

### 1. Update UI Text (Immediate)
```typescript
// In multi-image-edit-modal.tsx
<DialogDescription>
  Create split-screen comparisons and collages from multiple images.
  Perfect for before/after shots, style comparisons, and image collections.
</DialogDescription>
```

### 2. Update Prompt Examples
```typescript
const examplePrompts = [
  "Create a side-by-side comparison",
  "Show both images together",
  "Make a before and after layout",
  "Create a collage of these images"
]
```

### 3. Add Layout Options (Future)
If WaveSpeed adds support:
```typescript
interface WaveSpeedMultiImageRequest {
  images: string[]
  prompt: string
  guidanceScale?: number
  safetyTolerance?: string
  layoutStyle?: 'split' | 'merged' | 'collage' // Future parameter
  compositionMode?: 'side-by-side' | 'seamless' // Future parameter
}
```

## Testing Results
- ✅ Split-screen layouts work perfectly
- ✅ API integration is stable
- ✅ Image quality is good
- ❌ True scene merging not supported
- ❌ No seamless compositing available

## Conclusion
The Flux Kontext Max Multi model is working as designed - it creates split-screen layouts, not true composites. This is a model limitation, not a bug in our implementation.
