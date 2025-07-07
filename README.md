# 🤖 GeminiChatbotv8

> **Advanced AI Chatbot with Multi-Modal Capabilities - Now More Stable Than Ever!**

A powerful, feature-rich AI chatbot built with Next.js 15 and React 19, featuring multi-modal conversations, content generation, web search, and rock-solid stability improvements.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

## 🎉 What's New in v8 (July 7, 2025)

### 🐛 Major Bug Fixes
- **✅ Video Playback Fixed**: Gemini-hosted videos now play correctly in the modal
- **✅ Auto-Send Bug Eliminated**: Chat no longer sends messages automatically
- **✅ Rate Limit Handling**: Clear user feedback when hitting API limits
- **✅ Image Generation Stability**: Fixed timeouts and database issues
- **✅ Social Media Downloads**: Enhanced reliability with better error handling

### 🚀 Performance Improvements
- Increased server timeouts for generation endpoints (30s → 60s)
- Better error messages throughout the application
- Optimized database queries and indexes
- Simplified configuration (MCP temporarily disabled)

### 📋 Developer Experience
- Added comprehensive test scripts
- Enhanced debug logging
- Better documentation
- Cleaner codebase

## 🚀 Quick Start (Get Running in 5 Minutes!)

### Prerequisites
- **Node.js 20+** (Required - use `nvm install 20` if needed)
- **Git**
- At least one API key (minimum: `GEMINI_API_KEY`)

### 1. Clone the Repository
```bash
git clone https://github.com/ajwestfield/geminichatbotv8.git
cd geminichatbotv8
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your API keys
nano .env.local  # or use your preferred editor
```

**Minimum Configuration** (just add this one key to get started):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your free Gemini API key at: https://aistudio.google.com/

### 4. Database Setup (Required for Full Features)

#### Option A: Quick Setup (Recommended)
```bash
# This command does everything for you
npm run db:setup-all
```

#### Option B: Manual Setup
If you prefer to set up the database manually:

1. Create a Supabase account at https://supabase.com/
2. Create a new project
3. Go to Settings → API
4. Copy your URL and anon key to `.env.local`:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_API_KEY=your_anon_key
   ```
5. Run migrations:
   ```bash
   npm run db:setup-all
   npm run db:migrate
   npm run db:optimize-performance
   ```

### 5. Start the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting! 🎉

## ✨ Core Features

### 🧠 Multi-Modal AI Chat
- **Multiple AI Models**: Gemini 2.0 Flash, GPT-4, Claude 3.5 Sonnet
- **Smart Model Selection**: Automatic routing based on task type
- **Context Awareness**: Full conversation history with persistence
- **File Processing**: Automatic analysis of images, videos, audio, and documents

### 🎨 Content Generation
- **Image Generation**: DALL-E 3, Flux models, and more
- **Image Editing**: AI-powered modifications with mask support
- **Video Creation**: Text-to-video and image-to-video animation
- **Audio Synthesis**: Multi-speaker TTS with context awareness

### 🌐 Web Integration
- **Smart Web Search**: Real-time information with Perplexity
- **Content Extraction**: Download and analyze web content
- **Social Media**: Download videos/images from major platforms
- **URL Processing**: Automatic detection and handling

### 💾 Storage & Persistence
- **Chat History**: Complete conversation persistence
- **Media Gallery**: Organized storage with metadata
- **Cloud Storage**: Vercel Blob for media files
- **Local Caching**: Performance optimization

## 🔧 Configuration Guide

### Essential API Keys (for full features)
```env
# AI Chat (Required)
GEMINI_API_KEY=your_key                # Free tier available

# Recommended Additions
PERPLEXITY_API_KEY=your_key           # Web search
OPENAI_API_KEY=your_key               # GPT-4 and DALL-E

# Database & Storage
SUPABASE_URL=your_url                 # Free tier available
SUPABASE_API_KEY=your_anon_key        # Use the anon key
BLOB_READ_WRITE_TOKEN=your_token      # Vercel Blob storage
```

### Optional Enhancements
```env
# Additional AI Providers
ANTHROPIC_API_KEY=your_key            # Claude models
REPLICATE_API_KEY=your_key            # Video generation
WAVESPEED_API_KEY=your_key            # Advanced features

# Security
AUTH_SECRET=your_32_char_string       # Session encryption
COOKIE_ENCRYPTION_KEY=your_key        # Cookie security
```

## 📚 Detailed Setup Instructions

### Setting Up Persistence (Recommended)

1. **Supabase Setup**:
   - Sign up at [supabase.com](https://supabase.com/)
   - Create a new project (free tier is fine)
   - Go to Settings → API
   - Copy the URL and anon key to `.env.local`

2. **Vercel Blob Setup**:
   - Sign up at [vercel.com](https://vercel.com/)
   - Go to Storage → Create Blob Store
   - Copy the token to `.env.local`

3. **Run Database Setup**:
   ```bash
   npm run db:check        # Verify connection
   npm run db:setup-all    # Create all tables
   npm run db:migrate      # Apply migrations
   ```

### Troubleshooting Common Issues

#### "Too Many Requests" Error
You're hitting the Gemini API free tier limit (15 requests/minute).

**Solutions**:
1. Wait 30-60 seconds between requests
2. Upgrade to paid Gemini API tier
3. Switch to a different model in Settings

#### Video Playback Issues
If videos aren't playing:
1. Check browser console for errors
2. Ensure the video file is supported
3. Try downloading the video as a fallback

#### Database Connection Failed
1. Verify your Supabase credentials
2. Check if your IP is allowed in Supabase settings
3. Run `npm run db:check` to diagnose

#### Missing Features
Some features require additional API keys:
- Web search → Add `PERPLEXITY_API_KEY`
- Image generation → Add `OPENAI_API_KEY`
- Video generation → Add `REPLICATE_API_KEY`

## 🧪 Testing

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Tests
```bash
# Test video functionality
npm run test:e2e tests/e2e/video-upload-playback.spec.ts

# Test with UI
npm run test:e2e:ui
```

### Verify Installation
```bash
npm run verify:install
npm run check-api-keys
```

## 📋 Migration from v7

If you're upgrading from v7:

1. **Backup your data** (if using persistence)
2. **Update environment variables** - Check `.env.example` for new variables
3. **Run migrations**:
   ```bash
   npm run db:setup-all
   npm run db:migrate
   ```
4. **Clear browser cache** to avoid conflicts
5. **Review breaking changes**:
   - MCP servers are disabled by default
   - Auto-analysis feature has been removed

## 🚀 Deployment

### Vercel (Recommended)
1. Fork this repository
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Self-Hosted
```bash
# Build for production
npm run build

# Start production server
PORT=3000 npm start
```

### Docker
```bash
# Build image
docker build -t geminichatbotv8 .

# Run container
docker run -p 3000:3000 --env-file .env.local geminichatbotv8
```

## 📊 v8 Technical Improvements

### Video Playback Fix
- Enhanced video proxy to handle Gemini URIs
- Fixed FilePreviewModal source detection
- Added comprehensive error handling
- Improved user feedback

### Auto-Send Bug Fix
- Corrected handleSubmitRef implementation
- Disabled problematic auto-analysis feature
- Prevented unwanted form submissions

### Rate Limit Handling
- Added clear error messages
- Implemented 30-second cooldown
- Enhanced debug logging
- Improved retry logic

### Database Enhancements
- Added `image_source_relations` table
- Optimized indexes for performance
- Fixed RLS policy violations
- Enhanced migration scripts

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vercel](https://vercel.com) - Hosting and AI SDK
- [Supabase](https://supabase.com) - Database
- [shadcn/ui](https://ui.shadcn.com) - UI components
- AI Providers: Google, OpenAI, Anthropic, Perplexity
- The amazing open source community

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/ajwestfield/geminichatbotv8/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ajwestfield/geminichatbotv8/discussions)
- **Documentation**: Check the `docs/` folder for detailed guides

---

**Built with ❤️ using the latest AI technologies**

⭐ If you find this helpful, please star the repository!