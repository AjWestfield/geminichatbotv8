# Manual Test Instructions for Image Deletion Fix

## Prerequisites
1. Start the development server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Open the browser developer console (F12)

## Test 1: Basic Image Deletion

1. **Generate a test image:**
   - In the chat, type: "Generate an image of a red cube"
   - Wait for the image to be generated

2. **Navigate to Images tab:**
   - Click on the "Images" tab in the Canvas panel
   - Verify the image appears in the gallery

3. **Delete the image:**
   - Hover over the image
   - Click the trash/delete button
   - Click "Delete Image" in the confirmation dialog

4. **Expected Results:**
   - ✅ Image should be removed from the gallery
   - ✅ Success toast: "Image deleted successfully"
   - ✅ No errors in console
   - ✅ If you refresh the page, the image should remain deleted

## Test 2: Console Test for localStorage Images

Run this in the browser console to test deletion of localStorage-only images:

```javascript
// Add a test image to localStorage
const testImage = {
  id: 'img_manual_test_' + Date.now(),
  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8/5+hnoEIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC',
  prompt: 'Manual test image - red square',
  model: 'test',
  quality: 'standard',
  created_at: new Date().toISOString()
};

const images = JSON.parse(localStorage.getItem('generated-images') || '[]');
images.push(testImage);
localStorage.setItem('generated-images', JSON.stringify(images));

console.log('Test image added. Refresh the Images tab to see it.');
```

Then:
1. Switch to another tab and back to Images tab to refresh
2. Delete the test image using the UI
3. Check that it's removed successfully

## Test 3: API Response Test

Run this in console to verify the API returns success for non-database images:

```javascript
// Test API with a non-existent image ID
fetch('/api/images/img_test_nonexistent_12345', {
  method: 'DELETE'
})
.then(res => res.json())
.then(data => {
  console.log('API Response:', data);
  console.log('Success?', data.success === true);
  console.log('Deleted from:', data.deletedFrom);
});
```

Expected output:
```
API Response: {success: true, message: "Image deleted successfully (localStorage only)", ...}
Success? true
Deleted from: localStorage
```

## Test 4: Verify Fix in Different Scenarios

### With Database Configured:
- Images in database should delete normally
- Images only in localStorage should also delete successfully
- No 404 errors should appear

### Without Database (localStorage only):
- All images should delete successfully
- API should return success for all deletions

## Troubleshooting

If deletion fails:
1. Check browser console for errors
2. Check network tab for API response
3. Verify the image ID format (should start with "img_")
4. Check server logs for detailed error messages

## Success Criteria

The fix is working correctly if:
- ✅ All images can be deleted without errors
- ✅ Success toast appears after deletion
- ✅ API returns 200 status (not 404)
- ✅ Images don't reappear after page refresh
- ✅ Both database and localStorage-only images delete successfully