// Test script to verify chat loading functionality
// Run this in the browser console to test the chat loading

async function testChatLoading() {
  console.log('=== Chat Loading Test Script ===');
  
  // Get all chat items from the sidebar
  const chatItems = document.querySelectorAll('[class*="MessageSquare"]');
  console.log(`Found ${chatItems.length} chats in sidebar`);
  
  if (chatItems.length === 0) {
    console.log('No chats found. Create a chat first.');
    return;
  }
  
  // Click on the first chat
  console.log('Clicking on first chat...');
  const firstChat = chatItems[0].closest('[class*="cursor-pointer"]');
  
  if (firstChat) {
    // Check console logs
    console.log('Check console for these logs:');
    console.log('- [PAGE] Selecting chat:');
    console.log('- [CHAT PERSISTENCE] Loading chat:');
    console.log('- [API] GET /api/chats/[chatId]');
    console.log('- [CHAT PERSISTENCE] Fetching chat:');
    console.log('- [PAGE] Loaded chat data:');
    
    // Trigger click
    firstChat.click();
    
    // Wait and check for loading spinner
    setTimeout(() => {
      const spinner = document.querySelector('[class*="animate-spin"]');
      if (spinner) {
        console.log('✓ Loading spinner detected');
      } else {
        console.log('✗ No loading spinner found');
      }
      
      // Check for error toasts
      const errorToast = document.querySelector('[class*="error"]');
      if (errorToast) {
        console.log('✗ Error toast found:', errorToast.textContent);
      } else {
        console.log('✓ No error toasts');
      }
    }, 100);
    
    // Final check after loading
    setTimeout(() => {
      const messages = document.querySelectorAll('[class*="message"]');
      console.log(`✓ Chat loaded with ${messages.length} messages`);
      console.log('=== Test Complete ===');
    }, 2000);
  }
}

// Run the test
testChatLoading();