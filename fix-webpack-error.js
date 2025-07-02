#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 Fixing Webpack Chunk Loading Error...\n');

async function fixWebpackError() {
  try {
    // Step 1: Stop any running dev server
    console.log('1️⃣ Stopping any running dev servers...');
    try {
      await execAsync('pkill -f "next dev"');
      console.log('   ✅ Stopped running dev servers');
    } catch {
      console.log('   ℹ️  No running dev servers found');
    }

    // Step 2: Clear all caches and build artifacts
    console.log('\n2️⃣ Clearing all caches and build artifacts...');
    const dirsToRemove = [
      '.next',
      'node_modules/.cache',
      '.next/cache',
      '.next/static'
    ];

    for (const dir of dirsToRemove) {
      try {
        await fs.rm(path.join(__dirname, dir), { recursive: true, force: true });
        console.log(`   ✅ Removed ${dir}`);
      } catch {
        console.log(`   ℹ️  ${dir} not found`);
      }
    }

    // Step 3: Update next.config.mjs with improved webpack configuration
    console.log('\n3️⃣ Updating webpack configuration...');
    const nextConfigPath = path.join(__dirname, 'next.config.mjs');
    const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Handle node: protocol imports in client-side bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        stream: false,
        crypto: false,
        buffer: false,
        http: false,
        https: false,
        zlib: false,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
      };

      // Mark problematic packages as external
      config.externals = [
        ...(config.externals || []),
        '@langchain/langgraph',
        '@langchain/core',
        '@langchain/community',
        '@langchain/openai',
        '@langchain/anthropic',
        '@langchain/google-genai',
        'rrweb-player',
        'rrweb',
      ];
    }

    // Ignore warnings
    config.ignoreWarnings = [
      { module: /node:/ },
      { message: /Critical dependency.*the request of a dependency is an expression/ },
      { message: /Failed to parse source map/ },
      { message: /Module not found.*rrweb/ },
      ...(config.ignoreWarnings || []),
    ];

    // Optimize chunk splitting for production
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: !dev, // Enable minification only in production
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              test: /[\\\\/]node_modules[\\\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
            app: {
              name: 'app',
              test: /[\\\\/](app|components|lib|hooks)[\\\\/]/,
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };

      // Add webpack performance hints
      config.performance = {
        ...config.performance,
        hints: false, // Disable performance warnings
      };
    }

    return config;
  },

  // Add experimental features to help with chunk loading
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-*',
      'lucide-react',
      'framer-motion',
      '@tabler/icons-react',
    ],
  },
};

export default nextConfig;`;

    await fs.writeFile(nextConfigPath, nextConfigContent);
    console.log('   ✅ Updated next.config.mjs');

    // Step 4: Add chunk error handler to app layout
    console.log('\n4️⃣ Adding chunk error handler...');
    const errorHandlerPath = path.join(__dirname, 'lib/chunk-error-handler.ts');
    const errorHandlerContent = `// Chunk error handler with automatic retry
export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return;

  // Track retry attempts
  const retryAttempts = new Map<string, number>();
  const MAX_RETRIES = 3;

  // Handle chunk loading errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    if (error && error.name === 'ChunkLoadError') {
      console.error('ChunkLoadError detected:', error.message);
      
      // Extract chunk name from error message
      const chunkMatch = error.message.match(/Loading chunk (\\S+) failed/);
      const chunkName = chunkMatch ? chunkMatch[1] : 'unknown';
      
      // Get retry count
      const retries = retryAttempts.get(chunkName) || 0;
      
      if (retries < MAX_RETRIES) {
        retryAttempts.set(chunkName, retries + 1);
        console.log(\`Retrying chunk \${chunkName} (attempt \${retries + 1}/\${MAX_RETRIES})...\`);
        
        // Wait a bit before retrying
        setTimeout(() => {
          window.location.reload();
        }, 1000 * (retries + 1)); // Exponential backoff
      } else {
        console.error(\`Failed to load chunk \${chunkName} after \${MAX_RETRIES} attempts\`);
        
        // Show user-friendly error
        if (window.confirm('The application encountered an error loading resources. Would you like to refresh the page?')) {
          // Clear all caches and reload
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            }).then(() => {
              window.location.reload(true);
            });
          } else {
            window.location.reload(true);
          }
        }
      }
      
      // Prevent default error handling
      event.preventDefault();
    }
  });

  // Handle unhandled promise rejections (often from dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.name === 'ChunkLoadError') {
      console.error('Unhandled ChunkLoadError:', event.reason);
      // Let the error event handler deal with it
      throw event.reason;
    }
  });
}

// Lazy loading wrapper with retry logic
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName?: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const MAX_RETRY_COUNT = 3;
    const RETRY_DELAY = 1000;

    for (let i = 0; i < MAX_RETRY_COUNT; i++) {
      try {
        return await importFunc();
      } catch (error: any) {
        console.error(\`Failed to load component \${componentName || 'unknown'} (attempt \${i + 1}):\`, error);
        
        if (i === MAX_RETRY_COUNT - 1) {
          // Last attempt failed
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
    
    throw new Error(\`Failed to load component after \${MAX_RETRY_COUNT} attempts\`);
  });
}`;

    await fs.mkdir(path.join(__dirname, 'lib'), { recursive: true });
    await fs.writeFile(errorHandlerPath, errorHandlerContent);
    console.log('   ✅ Created chunk error handler');

    // Step 5: Create a clean build script
    console.log('\n5️⃣ Creating clean build script...');
    const cleanBuildPath = path.join(__dirname, 'scripts/clean-build.js');
    const cleanBuildContent = `#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function cleanBuild() {
  console.log('🧹 Starting clean build process...\n');

  // Clean directories
  const toClean = ['.next', 'node_modules/.cache', '.next/cache'];
  for (const dir of toClean) {
    try {
      await fs.rm(path.join(rootDir, dir), { recursive: true, force: true });
      console.log(\`✅ Cleaned \${dir}\`);
    } catch {}
  }

  console.log('\\n🔨 Running build...');
  try {
    const { stdout, stderr } = await execAsync('npm run build', { cwd: rootDir });
    if (stderr) console.error(stderr);
    console.log(stdout);
    console.log('\\n✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

cleanBuild().catch(console.error);`;

    await fs.mkdir(path.join(__dirname, 'scripts'), { recursive: true });
    await fs.writeFile(cleanBuildPath, cleanBuildContent);
    await fs.chmod(cleanBuildPath, '755');
    console.log('   ✅ Created clean build script');

    // Step 6: Run a clean build
    console.log('\n6️⃣ Running clean build...');
    const { stdout, stderr } = await execAsync('npm run build', { cwd: __dirname });
    if (stderr && !stderr.includes('warn')) {
      console.error('   ⚠️  Build warnings:', stderr);
    }
    console.log('   ✅ Build completed');

    console.log('\n✅ Webpack error fix completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. If the error persists, run: npm run dev:clean');
    console.log('3. For production builds, use: node scripts/clean-build.js');

  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  }
}

fixWebpackError();
