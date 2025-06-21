# GeminiChatbotv7 Setup Instructions

## Starting Point
This repository was created from geminichatbotv6 on June 21, 2025, with all features working and tested.

## Quick Setup from Clone

### 1. Prerequisites
- Node.js 20+ (use nvm: `nvm install 20 && nvm use 20`)
- npm or pnpm
- Git

### 2. Install Dependencies
```bash
cd geminichatbotv7
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:
```env
# REQUIRED - Without this, the app won't start
GEMINI_API_KEY=your_gemini_api_key_here

# HIGHLY RECOMMENDED - For full features
PERPLEXITY_API_KEY=your_perplexity_key    # Web search
OPENAI_API_KEY=your_openai_key            # GPT-4, DALL-E

# FOR PERSISTENCE - Recommended
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_API_KEY=your_anon_key_here
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# OPTIONAL - Nice to have
ANTHROPIC_API_KEY=                        # Claude models
REPLICATE_API_KEY=                        # Video generation
WAVESPEED_API_KEY=                        # Advanced TTS
AUTH_SECRET=                              # Generate with: openssl rand -base64 32
COOKIE_ENCRYPTION_KEY=                    # Generate with: openssl rand -base64 32
```

### 4. Database Setup (IMPORTANT)
If using Supabase for persistence:

```bash
# First, check if database is connected
npm run db:check

# If connected, run ALL migrations in order:
npm run db:setup-all
npm run db:migrate
npm run db:migrate:thumbnails
```

**Manual SQL Option:**
If the scripts fail, run these SQL files in Supabase SQL Editor in this order:
1. `lib/database/schema.sql`
2. `lib/database/add-videos-table.sql`
3. `scripts/database/add-image-thumbnails-to-chat-summaries.sql`

### 5. MCP Configuration (Optional)
```bash
cp mcp.config.example.json mcp.config.json
```

Edit if you want MCP server tools.

### 6. Start the Application
```bash
npm run dev
# or
./start.sh
```

Open http://localhost:3000

## Current Working Features (as of June 21, 2025)

### ✅ Fully Functional
- Multi-model chat (Gemini 2.0, GPT-4, Claude 3.5)
- Web search with Perplexity (real-time, with citations)
- Image generation (DALL-E 3, Flux models)
- Image editing and multi-image split-screen
- Video generation (text-to-video)
- Audio transcription and multi-speaker TTS
- File uploads with auto-analysis
- Chat persistence with Supabase
- Image thumbnails in sidebar (hover preview)
- Social media downloads with cookies
- MCP server integrations

### 🎯 Latest Additions
- **Image Thumbnails**: Shows up to 6 images when hovering over chats
- **Multi-Image Editing**: Creates split-screen comparisons (not compositing)
- **Enhanced Database**: Optimized views with thumbnail data

## Verification Steps

### 1. Check Installation
```bash
npm run verify:install
npm run check-api-keys
```

### 2. Test Core Features
1. **Chat**: Send a message to Gemini
2. **Web Search**: Ask about current events
3. **Image Generation**: Type "generate an image of..."
4. **File Upload**: Drop an image and ask about it
5. **Persistence**: Refresh and check if chat history remains

### 3. Test Advanced Features
1. **Image Thumbnails**: Hover over a chat with images
2. **Multi-Image Edit**: Select 2+ images and click edit
3. **Video Generation**: Type "create a video of..."
4. **TTS**: Look for speaker icon on AI responses

## Common Issues & Solutions

### "Cannot connect to database"
- Check SUPABASE_URL and SUPABASE_API_KEY
- Make sure you're using the anon key, not service role
- Run `npm run db:check` to verify connection

### "Image thumbnails show 'not yet available'"
- Run `npm run db:migrate:thumbnails`
- Or manually run `scripts/database/add-image-thumbnails-to-chat-summaries.sql`

### "Web search not working"
- Verify PERPLEXITY_API_KEY is set
- Check if you have API credits at perplexity.ai

### "Images/videos not saving"
- Check BLOB_READ_WRITE_TOKEN
- Verify Vercel Blob storage is set up

## Development Workflow

### Branch Strategy
- `main`: Current development
- `geminichatbotv7-fallback`: Stable v6 state for recovery

### Making Changes
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test
3. Commit: `git commit -m "feat: your feature"`
4. Push: `git push origin feature/your-feature`
5. Create PR to main

### Testing
```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

## Fallback Instructions

If something breaks and you need to revert:

### Option 1: From v7 Repo
```bash
git checkout geminichatbotv7-fallback
npm install
npm run dev
```

### Option 2: From v6 Repo
```bash
cd ../geminichatbotv6
git checkout geminichatbotv7-fallback
npm install
npm run dev
```

## State Reference
For complete state documentation, see:
- `docs/PROJECT_STATE_JUNE_21_2025.md` - Full snapshot
- `docs/` folder - All feature documentation

## Support
- Check `docs/TROUBLESHOOTING.md` for common issues
- Review commit history for recent changes
- Database issues: See `docs/DATABASE_TROUBLESHOOTING.md`

---

**Remember**: This is a working snapshot from June 21, 2025. All features listed above were tested and functional at that time.
