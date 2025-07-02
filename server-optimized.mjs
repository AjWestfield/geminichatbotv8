#!/usr/bin/env node

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

// Performance optimizations
process.env.NODE_OPTIONS = '--max-old-space-size=2048';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js with optimizations
const app = next({ 
  dev, 
  hostname, 
  port,
  conf: {
    // Disable telemetry for performance
    telemetry: false,
    // Enable compression
    compress: true,
    // Optimize for production even in dev
    optimizeFonts: true,
    // Cache static assets
    onDemandEntries: {
      maxInactiveAge: 1000 * 60 * 60, // 1 hour
      pagesBufferLength: 5,
    },
  }
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Set longer timeouts for API routes
      if (req.url && req.url.startsWith('/api/')) {
        req.setTimeout(60000); // 60 seconds
        res.setTimeout(60000);
      }
      
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Increase server timeout
  server.timeout = 60000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Performance optimizations enabled:');
    console.log('  - Max memory: 2048MB');
    console.log('  - API timeout: 60s');
    console.log('  - Compression: enabled');
    console.log('  - Font optimization: enabled');
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
