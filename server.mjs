#!/usr/bin/env node

/**
 * Custom Next.js Server
 * 
 * This server runs Next.js with custom configuration.
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: join(__dirname, '.env.local') });
} catch (error) {
  console.log('dotenv not found, continuing without it');
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Increase timeout for API routes that might need database access
      if (req.url && req.url.startsWith('/api/')) {
        // Set longer timeout for image/video generation endpoints
        if (req.url.includes('/api/generate-image') || 
            req.url.includes('/api/generate-video') ||
            req.url.includes('/api/chat')) {
          // Set 60 second timeout for generation endpoints
          req.setTimeout(60000);
          res.setTimeout(60000);
        } else {
          // Set 30 second timeout for other API routes
          req.setTimeout(30000);
          res.setTimeout(30000);
        }
      }
      
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Handle graceful shutdown
  const cleanup = () => {
    console.log('\nShutting down server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
});