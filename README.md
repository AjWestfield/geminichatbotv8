# 🤖 GeminiChatbotv7

> **Advanced AI Chatbot with Multi-Modal Capabilities**

A powerful, feature-rich AI chatbot built with Next.js 15 and React 19, featuring multi-modal conversations, content generation, web search, and extensible tool integration through MCP servers.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

## ✨ Current State (June 21, 2025)

This is a stable, production-ready version with all features working. A complete state snapshot is available in [`docs/PROJECT_STATE_JUNE_21_2025.md`](docs/PROJECT_STATE_JUNE_21_2025.md).

### 🎯 Latest Working Features
- **Image Thumbnails in Chat Sidebar**: Hover over any chat to see up to 6 recent images
- **Multi-Image Split-Screen Editing**: Create before/after comparisons and collages
- **Web Search Integration**: Real-time search with Perplexity, including citations
- **Enhanced TTS**: Multi-speaker support with Dia model
- **Video Generation**: Text-to-video with Kling and HunyuanVideo
- **Social Media Downloads**: Cookie-based authentication for protected content
- **MCP Servers**: Desktop Commander, Firecrawl, and Perplexity integrations

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** (use nvm: `nvm use 20`)
- **npm** or **pnpm**
- **Git**
- At least one API key (minimum: `GEMINI_API_KEY`)

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/geminichatbotv6.git
cd geminichatbotv6
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
```env
# Required (get from https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key

# Highly Recommended
PERPLEXITY_API_KEY=your_perplexity_key    # Web search
OPENAI_API_KEY=your_openai_key            # GPT-4, DALL-E

# For Persistence (Recommended)
SUPABASE_URL=your_supabase_url
SUPABASE_API_KEY=your_supabase_anon_key
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### 3. Database Setup (Required for Full Features)
```bash
# Check database connection
npm run db:check

# Apply all migrations
npm run db:setup-all
npm run db:migrate
npm run db:migrate:thumbnails
```

### 4. Start the Application
```bash
npm run dev
# or use the helper script
./start.sh
```

Open [http://localhost:3000](http://localhost:3000) and start chatting! 🎉

## ✨ Core Features

### 🧠 Multi-Modal AI Chat
- **Multiple AI Models**: Gemini 2.0 Flash, GPT-4, Claude 3.5 Sonnet
- **Smart Model Selection**: Automatic routing based on task type
- **Context Awareness**: Full conversation history with persistence
- **File Processing**: Automatic analysis of images, videos, audio, and documents

### 🎨 Content Generation
- **Image Generation**: 
  - DALL-E 3 for highest quality
  - Flux Pro/Dev/Schnell for speed and variety
  - Replicate models for specialized styles
- **Image Editing**: 
  - AI-powered modifications with mask support
  - Multi-image split-screen compositions
  - Upscaling to 4K resolution
- **Video Creation**: 
  - Text-to-video generation
  - Image-to-video animation
  - Multiple model options (Kling, HunyuanVideo)
- **Audio Synthesis**: 
  - Multi-speaker TTS with Dia model
  - Context-aware voice selection
  - High-quality audio output

### 🌐 Web Integration
- **Smart Web Search**: Real-time information with Perplexity
- **Deep Research**: Multi-step analysis with source citations
- **Content Extraction**: Via Firecrawl MCP server
- **Social Media**: Download content with cookie authentication
- **URL Processing**: Automatic detection and handling

### 🔧 Tool Ecosystem
- **MCP Servers**: Extensible tool integration
  - Desktop Commander: File system and terminal access
  - Firecrawl: Web content extraction
  - Perplexity: Advanced web search
- **Sequential Thinking**: Advanced reasoning for complex tasks
- **GitHub Integration**: Repository management
- **Database Tools**: Direct SQL query execution

### 💾 Storage & Persistence
- **Chat History**: Complete conversation persistence
- **Media Gallery**: Organized storage with metadata
- **Cloud Storage**: Vercel Blob for media files
- **Database**: PostgreSQL with optimized indexes
- **Caching**: Performance optimization with Redis
- **Auto-Save**: Real-time persistence of all data

## 📋 Complete Feature List

### Chat Features
- [x] Multi-model support (Gemini, GPT-4, Claude)
- [x] Streaming responses
- [x] Message editing and regeneration
- [x] Code syntax highlighting
- [x] Markdown rendering
- [x] File attachments
- [x] Voice input (browser-based)
- [x] Chat history persistence
- [x] Export conversations

### Image Features
- [x] Generation with multiple models
- [x] Editing with AI assistance
- [x] Multi-image compositions
- [x] Upscaling and enhancement
- [x] Gallery view with metadata
- [x] Drag-and-drop upload
- [x] Comparison slider for edits
- [x] Thumbnail previews in sidebar
- [x] Batch operations

### Video Features
- [x] Text-to-video generation
- [x] Image-to-video animation
- [x] Transcription with Gemini
- [x] Gallery organization
- [x] Progress tracking
- [x] Multiple model support

### Audio Features
- [x] Text-to-speech synthesis
- [x] Multi-speaker support
- [x] Audio transcription
- [x] Playback controls
- [x] Download options

### Web Features
- [x] Real-time web search
- [x] Source citations
- [x] Deep research mode
- [x] Content extraction
- [x] Social media support

### Developer Features
- [x] MCP server integration
- [x] API route handlers
- [x] Database migrations
- [x] E2E testing
- [x] Comprehensive logging

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 15.2.4 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui
- **Animation**: Framer Motion
- **State**: Zustand

### Backend
- **Runtime**: Node.js 20+
- **Database**: Supabase (PostgreSQL)
- **Storage**: Vercel Blob
- **Caching**: Redis (optional)
- **APIs**: RESTful + Streaming

### AI/ML
- **Vercel AI SDK**: Unified interface
- **LangChain**: Advanced workflows
- **Provider SDKs**: Direct integrations
- **MCP Protocol**: Tool extensions

### DevOps
- **Testing**: Playwright E2E
- **Linting**: ESLint
- **Building**: Next.js compiler
- **Deployment**: Vercel-ready

## 📚 Documentation

### Setup Guides
- [`PROJECT_STATE_JUNE_21_2025.md`](docs/PROJECT_STATE_JUNE_21_2025.md) - Current stable state
- [`SETUP.md`](docs/SETUP.md) - Detailed setup instructions
- [`DATABASE_SETUP.md`](docs/DATABASE_SETUP.md) - Database configuration
- [`APPLYING_DATABASE_MIGRATIONS.md`](docs/APPLYING_DATABASE_MIGRATIONS.md) - Migration guide

### Feature Documentation
- [`IMAGE_THUMBNAILS_IN_TOOLTIP.md`](docs/IMAGE_THUMBNAILS_IN_TOOLTIP.md) - Sidebar previews
- [`MULTI_IMAGE_FEATURE_EXPLAINED.md`](docs/MULTI_IMAGE_FEATURE_EXPLAINED.md) - Split-screen editing
- [`PERPLEXITY_INTEGRATION.md`](docs/PERPLEXITY_INTEGRATION.md) - Web search setup

### Troubleshooting
- [`TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) - Common issues
- [`DATABASE_TROUBLESHOOTING.md`](docs/DATABASE_TROUBLESHOOTING.md) - DB problems
- [`VERIFICATION.md`](docs/VERIFICATION.md) - Installation verification

## 🔧 Configuration

### Environment Variables

#### Essential
```env
GEMINI_API_KEY=your_key                   # Required for basic functionality
```

#### Recommended
```env
PERPLEXITY_API_KEY=your_key              # Web search
OPENAI_API_KEY=your_key                  # GPT-4 and DALL-E
SUPABASE_URL=your_url                    # Database
SUPABASE_API_KEY=your_anon_key          # Database auth
BLOB_READ_WRITE_TOKEN=your_token         # Media storage
```

#### Optional Enhancements
```env
ANTHROPIC_API_KEY=your_key               # Claude models
REPLICATE_API_KEY=your_key               # Video generation
WAVESPEED_API_KEY=your_key               # Advanced features
FIRECRAWL_API_KEY=your_key               # Web extraction
AUTH_SECRET=your_secret                  # Session encryption
COOKIE_ENCRYPTION_KEY=your_key           # Cookie security
```

### MCP Configuration

Create `mcp.config.json`:
```json
{
  "servers": {
    "desktop-commander": {
      "command": "npx",
      "args": ["@puzzlet/desktop-commander"],
      "env": {}
    },
    "firecrawl": {
      "command": "npx",
      "args": ["@puzzlet/mcp-server-firecrawl"],
      "env": {
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
      }
    }
  }
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Fork/clone this repository
2. Connect to Vercel
3. Add environment variables
4. Deploy automatically

### Self-Hosted
```bash
# Build
npm run build

# Start production server
PORT=3000 npm start
```

### Docker (Coming Soon)
```bash
docker build -t geminichatbot .
docker run -p 3000:3000 --env-file .env.local geminichatbot
```

## 🧪 Testing

### Run Tests
```bash
# All E2E tests
npm run test:e2e

# With UI
npm run test:e2e:ui

# Specific test
npm run test:e2e tests/chat-functionality.spec.ts
```

### Verify Installation
```bash
# Check API keys
npm run check-api-keys

# Verify database
npm run db:check

# Test features
npm run verify:install
```

## 🔄 Version History

### v6 (Current - June 21, 2025)
- Added image thumbnails in chat sidebar
- Fixed multi-image modal issues
- Enhanced database performance
- Improved error handling

### v5
- Multi-image editing support
- Enhanced TTS with multi-speaker
- Social media download integration
- MCP server support

### v4
- Added Perplexity web search
- Video generation features
- Improved UI/UX
- Database persistence

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing`)
5. Open Pull Request

### Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits focused

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vercel](https://vercel.com) - AI SDK and hosting
- [Supabase](https://supabase.com) - Database and auth
- [shadcn/ui](https://ui.shadcn.com) - Component library
- AI Providers: OpenAI, Google, Anthropic, Perplexity
- Open source community

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/geminichatbotv6/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/geminichatbotv6/discussions)
- **Documentation**: See `docs/` folder

---

**Built with ❤️ by the GeminiChatbot community**
