
// Run this in your browser console to clear old file references
(function clearOldFileReferences() {
  console.log('Clearing old file references from localStorage...');
  
  // Get all chat keys
  const keys = Object.keys(localStorage).filter(key => 
    key.includes('chat-') || key.includes('messages-') || key.includes('files-')
  );
  
  console.log(`Found ${keys.length} potential chat-related keys`);
  
  // Clear file-related data
  keys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (data && data.includes('geminiFile')) {
        console.log(`Clearing key with file data: ${key}`);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error(`Error processing key ${key}:`, e);
    }
  });
  
  console.log('✅ Cleanup complete! Refresh the page.');
})();
