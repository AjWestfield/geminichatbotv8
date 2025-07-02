# IMPORTANT: npm run dev now starts EVERYTHING!

As of June 23, 2025, running `npm run dev` will automatically start:
1. Browser-use service (for Deep Research)
2. Next.js development server

## Quick Commands:

```bash
npm run dev              # Starts everything (recommended)
npm run dev:nextjs-only  # Just Next.js (without Deep Research)
```

## What Happens:

When you run `npm run dev`:
- Browser-use service starts first on port 8002
- Next.js starts on port 3000 (or next available)
- Both services are managed together
- Ctrl+C stops both cleanly

## Status Messages:

You'll see:
```
✅ All services started successfully!

📦 Services running:
   - Next.js: http://localhost:3000
   - Browser-Use API: http://localhost:8002

🔍 Deep Research is ready to use!
```

That's it! Just use `npm run dev` like always, and Deep Research will be ready automatically.