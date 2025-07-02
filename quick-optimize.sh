#!/bin/bash

echo "🚀 Quick Performance Optimization for geminichatbotv7"
echo ""
echo "This script will apply immediate performance improvements"
echo ""

# 1. Check current server status
echo "1. Checking current server status..."
if pgrep -f "node.*server.mjs" > /dev/null; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not running"
fi

# 2. Install ioredis for caching (already done)
echo ""
echo "2. Redis client installed ✅"

# 3. Create optimized server configuration
echo ""
echo "3. Creating optimized server configuration..."

cat > server-optimized.mjs << 'EOF'
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
EOF

chmod +x server-optimized.mjs
echo "   ✅ Created server-optimized.mjs"

# 4. Create start script with optimizations
echo ""
echo "4. Creating optimized start script..."

cat > start-optimized.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting geminichatbotv7 with optimizations..."

# Set Node.js optimizations
export NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"

# Set production-like optimizations
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1

# Clear Next.js cache for fresh start
echo "Clearing cache..."
rm -rf .next/cache

# Kill any existing server
pkill -f "node.*server" || true

# Start optimized server
echo "Starting optimized server..."
node server-optimized.mjs
EOF

chmod +x start-optimized.sh
echo "   ✅ Created start-optimized.sh"

echo ""
echo "✅ Optimization complete!"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. CRITICAL: Run the database optimization in Supabase:"
echo "   - Go to your Supabase dashboard"
echo "   - Open SQL Editor"
echo "   - Copy and run the contents of: optimize-database.sql"
echo ""
echo "2. Start the optimized server:"
echo "   ./start-optimized.sh"
echo ""
echo "3. The server will run with:"
echo "   - 2GB memory allocation"
echo "   - 60-second API timeouts"
echo "   - Compression enabled"
echo "   - Optimized caching"
echo ""
echo "4. For full Docker optimization later:"
echo "   - Fix dependency issues"
echo "   - Run: docker-compose -f docker-compose.optimized.yml up"
