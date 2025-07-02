#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 Fixing Next.js 15 Webpack Chunk Loading Error...\n');

async function fixWebpackChunkError() {
  try {
    // Step 1: Stop the dev server
    console.log('1️⃣ Stopping dev server...');
    try {
      await execAsync('pkill -f "next dev"');
      console.log('   ✅ Stopped dev server');
    } catch {
      console.log('   ℹ️  No dev server running');
    }

    // Step 2: Clear all Next.js caches
    console.log('\n2️⃣ Clearing all Next.js caches...');
    const cacheDirs = [
      '.next',
      'node_modules/.cache',
      '.next/cache',
      '.next/static',
      '.next/server'
    ];

    for (const dir of cacheDirs) {
      try {
        await fs.rm(path.join(__dirname, dir), { recursive: true, force: true });
        console.log(`   ✅ Cleared ${dir}`);
      } catch {
        console.log(`   ℹ️  ${dir} not found`);
      }
    }

    // Step 3: Create a simplified next.config.mjs
    console.log('\n3️⃣ Creating optimized Next.js configuration...');
    const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Disable experimental features that might cause issues
  experimental: {
    turbo: false,
    forceSwcTransforms: false,
  },
  
  webpack: (config, { isServer, dev }) => {
    // Disable webpack cache to prevent stale chunks
    config.cache = false;
    
    if (!isServer) {
      // Handle node polyfills
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        async_hooks: false,
        child_process: false,
      };

      // Mark server-only packages as external
      config.externals = [
        ...(config.externals || []),
        '@langchain/langgraph',
        '@langchain/core',
        '@langchain/community',
        '@langchain/openai',
        '@langchain/anthropic',
        '@langchain/google-genai',
        'langchain',
        'rrweb-player',
        'rrweb',
      ];
      
      // Disable problematic optimizations in development
      if (dev) {
        config.optimization = {
          ...config.optimization,
          minimize: false,
          concatenateModules: false,
          usedExports: false,
          sideEffects: false,
          providedExports: false,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              // Only create vendor chunk for framework code
              framework: {
                name: 'framework',
                test: /[\\\\/]node_modules[\\\\/](react|react-dom|scheduler|use-subscription)[\\\\/]/,
                priority: 40,
                chunks: 'all',
              },
            },
          },
        };
      }
    }

    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node:/ },
      { message: /Critical dependency/ },
      { message: /Failed to parse source map/ },
      { message: /Module not found.*rrweb/ },
      ...(config.ignoreWarnings || []),
    ];

    return config;
  },
};

export default nextConfig;
`;

    await fs.writeFile(path.join(__dirname, 'next.config.mjs'), nextConfigContent);
    console.log('   ✅ Created optimized next.config.mjs');

    // Step 4: Create a package.json script for clean development
    console.log('\n4️⃣ Updating package.json scripts...');
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Update scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'dev': 'next dev',
      'dev:clean': 'rm -rf .next && rm -rf node_modules/.cache && next dev',
      'dev:fix': 'node fix-next15-webpack.js && npm run dev:clean',
      'build:clean': 'rm -rf .next && next build',
    };

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Updated package.json scripts');

    // Step 5: Install any missing dependencies
    console.log('\n5️⃣ Checking dependencies...');
    try {
      await execAsync('npm ls webpack', { cwd: __dirname });
      console.log('   ✅ Dependencies OK');
    } catch {
      console.log('   📦 Installing missing dependencies...');
      await execAsync('npm install', { cwd: __dirname });
    }

    console.log('\n✅ Fix applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the development server: npm run dev:clean');
    console.log('2. If errors persist, try: npm run dev:fix');
    console.log('3. Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)');
    console.log('\n💡 The app should now load without chunk errors.');

  } catch (error) {
    console.error('\n❌ Error applying fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixWebpackChunkError();
