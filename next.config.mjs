/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Output standalone for Docker deployments
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  
  webpack: (config, { isServer, dev }) => {
    // Use default cache settings for now to avoid resolution issues
    if (dev) {
      // Keep cache disabled for now to avoid stale chunk issues
      config.cache = false;
    }
    
    if (isServer) {
      // Mark heavy or browser-incompatible packages as external on the server side only
      config.externals = [
        ...(config.externals || []),
        '@langchain/langgraph',
        '@langchain/core',
        '@langchain/community',
        '@langchain/openai',
        '@langchain/anthropic',
        '@langchain/google-genai',
        'langchain',
        // Don't externalize zustand or opentelemetry - they should be bundled
      ];
    }

    if (!isServer) {
      // Mark browser-incompatible packages as externals so webpack doesn't try to bundle them
      const browserExternals = {
        '@langchain/langgraph': 'commonjs2 @langchain/langgraph',
        '@langchain/core': 'commonjs2 @langchain/core',
        '@langchain/community': 'commonjs2 @langchain/community',
        '@langchain/openai': 'commonjs2 @langchain/openai',
        '@langchain/anthropic': 'commonjs2 @langchain/anthropic',
        '@langchain/google-genai': 'commonjs2 @langchain/google-genai',
        'langchain': 'commonjs2 langchain',
        'rrweb-player': 'commonjs2 rrweb-player',
        'rrweb': 'commonjs2 rrweb',
      };
      config.externals = { ...(config.externals || {}), ...browserExternals };

      // Handle node polyfills / stubs
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

      // Stub out browser-incompatible packages and node: scheme imports
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // Stub Node "node:*" scheme imports that appear in langchain packages
        'node:async_hooks': false,
        // Langchain packages – we don’t need them in the browser bundle
        '@langchain/langgraph': false,
        '@langchain/core': false,
        '@langchain/community': false,
        '@langchain/openai': false,
        '@langchain/anthropic': false,
        '@langchain/google-genai': false,
        'langchain': false,
        // rrweb packages (only used on server for recording / playback)
        'rrweb': false,
        'rrweb-player': false,
      };



      
      // Simplified optimization for development
      if (dev) {
        config.optimization = {
          ...config.optimization,
          minimize: false,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true,
              },
              vendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                reuseExistingChunk: true,
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
  
  // Experimental optimization for package imports
  experimental: {
    optimizePackageImports: ['@radix-ui/react-*'],
  },
  
  // External packages for server components (moved from experimental)
  serverExternalPackages: ['sharp', 'onnxruntime-node'],
  
  // Server configuration
  serverRuntimeConfig: {
    // Increase server timeout
    maxDuration: 60,
  },
  
  // HTTP server options for development
  httpAgentOptions: {
    keepAlive: true,
  },

  // Ensure browsers always fetch up-to-date JS chunks
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  }
};

export default nextConfig;
