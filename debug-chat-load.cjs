#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Test direct API call to debug the issue
const testChatLoad = async () => {
  const chatId = '4e840bad-764e-424d-97b6-09f10061f36b'; // Example chat ID from the database
  const url = `http://localhost:3000/api/chats/${chatId}`;
  
  console.log('Testing chat load for:', chatId);
  console.log('URL:', url);
  
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      console.log('Status Code:', res.statusCode);
      console.log('Headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Raw Response Length:', data.length);
        console.log('First 200 chars:', data.substring(0, 200));
        
        try {
          const parsed = JSON.parse(data);
          console.log('Parsed successfully:', {
            hasChat: !!parsed.chat,
            hasMessages: !!parsed.messages,
            messageCount: parsed.messages?.length || 0
          });
          resolve(parsed);
        } catch (e) {
          console.error('JSON Parse Error:', e.message);
          console.log('Raw data:', data);
          reject(e);
        }
      });
    }).on('error', (err) => {
      console.error('Request Error:', err);
      reject(err);
    });
  });
};

// Run the test
testChatLoad()
  .then(() => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTest failed:', err);
    process.exit(1);
  });
