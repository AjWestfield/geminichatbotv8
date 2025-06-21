# Multi-Image Edit Display Fix

## Issue Analysis
The multi-image comparison view is functioning correctly, but the user experience is confusing because:
1. The AI model (Flux Kontext Max Multi) generates split-screen layouts as output
2. The comparison view shows source images on the left and the generated result on the right
3. This results in seeing the source images twice when the AI output is also a split-screen

## Current Implementation (Working Correctly)
```
[Source Images Grid] | [Generated Result]
     Image 1         |   AI Output:
     Image 2         |   (Split-screen of Image 1 & 2)
```

## Potential Solutions

### Option 1: Disable Comparison View for Multi-Image Edits
Since the AI output is already a split-screen, showing a comparison view is redundant.

```typescript
// In image-gallery.tsx, around line 798
{selectedImage.isMultiImageEdit && selectedImage.inputImages && selectedImage.inputImages.length > 0 ? (
  // Instead of showing comparison view, just show the result directly
  <div className="flex-1 relative bg-[#0A0A0A] p-4">
    <img
      src={selectedImage.url}
      alt="Multi-Image Edit Result"
      className="w-full h-full object-contain"
    />
  </div>
) : (
  // Regular comparison view for single image edits
  ...
)}
```

### Option 2: Add a Note Explaining the Display
Keep the comparison view but add context about what users are seeing.

```typescript
// Add after line 801
<div className="bg-blue-900/20 border border-blue-600/30 rounded p-2 mx-3 mb-2 text-xs text-blue-400">
  <p>Note: The AI model creates split-screen layouts. The right panel shows the AI's output, which is a side-by-side arrangement of your source images.</p>
</div>
```

### Option 3: Change the Labels
Make it clearer what each panel shows:

```typescript
// Line 829
<div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
  Your Original Images
</div>

// Line 863
<div className="absolute top-2 right-2 z-10 bg-purple-600/70 text-white text-xs px-1.5 py-0.5 rounded">
  AI Split-Screen Layout
</div>
```

## Recommendation
I recommend **Option 1** - disable the comparison view for multi-image edits since:
- The AI output is already a comparison/split-screen
- It eliminates the confusion of seeing source images twice
- Users can still see their source images in the metadata panel below

Would you like me to implement this fix?
