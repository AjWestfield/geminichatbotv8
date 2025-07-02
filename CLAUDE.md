# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
npm run dev              # Start development server on port 3000
npm run build           # Build for production
npm run start           # Start production server
./start.sh              # Preferred: Start with Node 20 and dependency check
```

### Code Quality
```bash
npm run lint            # Run ESLint (Next.js core-web-vitals)
```

### Testing
```bash
npm run test:e2e        # Run all Playwright E2E tests
npm run test:e2e:ui     # Run tests with Playwright UI
npm run test:e2e:debug  # Debug tests interactively

# Run specific test suites
npm run test:e2e:tts    # Test TTS multi-speaker functionality
npx playwright test tests/e2e/core-functionality.spec.ts
```

### Database Operations (if persistence is configured)
```bash
npm run db:check        # Verify database connection
npm run db:setup-all    # Create all required tables
npm run db:migrate      # Run pending migrations
npm run db:optimize-performance  # Optimize database performance
```

### Verification & Setup
```bash
npm run check-api-keys  # Verify API key configuration
npm run verify:install  # Verify installation completeness
npm run setup-persistence  # Setup database and storage
node test-zapier-social-media.js  # Test Zapier MCP social media integration
node test-zapier-tool-schemas.js  # Discover Zapier tool schemas (debugging)
```

## Architecture Overview

This is a Next.js 15 application using the App Router pattern with React 19. The project follows a modular architecture with clear separation of concerns:

### Core Structure
- **`app/`** - Next.js app directory with API routes and pages
  - `api/` - Backend API endpoints for AI interactions, file handling, and services
  - `page.tsx` - Main application entry point
  - `layout.tsx` - Root layout with providers and global configuration

- **`components/`** - React components organized by feature
  - `ui/` - shadcn/ui components (Radix UI primitives + Tailwind)
  - `chat-interface.tsx` - Main chat component with streaming support
  - `app-sidebar.tsx` - Navigation and chat history
  - `canvas-view.tsx` - Media gallery and file management

- **`lib/`** - Core business logic and utilities
  - `services/` - Service layer for external integrations
  - `database/` - Database utilities and Supabase client
  - `storage/` - File storage handlers (Blob, IndexedDB)
  - AI handlers for image, video, and audio generation

- **`hooks/`** - Custom React hooks
  - `use-chat-with-tools.ts` - Main chat orchestration hook
  - MCP-related hooks for extensible tool integration

### Key Technologies
- **State Management**: Zustand for global state, React Hook Form for forms
- **Styling**: Tailwind CSS with shadcn/ui components
- **AI Integration**: Vercel AI SDK for streaming, multiple provider support
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Storage**: Vercel Blob for files, IndexedDB for audio caching
- **Testing**: Playwright for E2E tests

### API Routes Pattern
All API routes follow RESTful conventions and are located in `app/api/`:
- `/chat` - Main chat endpoint with streaming support
- `/generate-image`, `/generate-video` - Media generation
- `/upload` - File upload handling
- `/mcp/*` - Model Context Protocol server integration

### Environment Configuration
The application uses environment variables for all external services. Minimum requirement is `GEMINI_API_KEY`. The app gracefully degrades functionality when optional services are not configured.

### TypeScript Configuration
- Strict mode enabled
- Path alias `@/*` configured for absolute imports
- Target ES6 with ESNext library features

### Development Workflow
1. Always run `npm run check-api-keys` to verify configuration
2. Use `npm run dev` for development with hot reload
3. Run `npm run lint` before committing
4. Test with `npm run test:e2e` for critical paths
5. Use proper error handling - the app should gracefully degrade

### Important Patterns
- All AI responses use streaming for real-time updates
- File uploads are validated and processed asynchronously
- Database operations use connection pooling
- External API calls implement retry logic
- Components lazy load for performance
- State updates are batched for efficiency

### File Upload Limitations
- Uploaded files (images, videos, audio) are stored in Google's Gemini API temporarily
- Files expire after 48 hours and become unavailable
- If you see "File is not in an ACTIVE state" errors, the file needs to be re-uploaded
- The app now validates file state before use and provides clear error messages
- Consider implementing local file caching for frequently used files

### Security Considerations
- Never commit `.env.local` or expose API keys
- All file uploads are validated and sanitized
- Database uses Row Level Security
- CORS is properly configured for API endpoints
- Cookie encryption for sensitive data