# Docker Performance Optimization Setup

## Quick Start (Using Docker)

### 1. First, optimize your database:
```bash
# Run the optimization script in Supabase SQL Editor
# Copy contents of optimize-database.sql
```

### 2. Create optimized Docker build:
```bash
# Build with caching and optimizations
docker-compose -f docker-compose.optimized.yml build --no-cache

# Start the application
docker-compose -f docker-compose.optimized.yml up -d
```

## Benefits of Docker Setup

### Performance Improvements:
1. **Reduced Memory Usage**: Alpine Linux base uses ~10MB vs ~150MB
2. **Faster Startup**: Pre-built dependencies and optimized Node.js
3. **Better Caching**: Persistent volumes for Next.js cache
4. **Connection Pooling**: Built-in connection management
5. **Health Checks**: Automatic restart on failures

### Reliability Improvements:
1. **Isolated Environment**: No conflicts with system packages
2. **Consistent Dependencies**: Same versions across all environments
3. **Automatic Restarts**: Health check failures trigger restarts
4. **Resource Limits**: Prevents memory leaks from crashing system

## Environment Variables

Create a `.env.docker` file:
```env
# Copy from your .env.local
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
SUPABASE_URL=your_url_here
SUPABASE_API_KEY=your_key_here
BLOB_READ_WRITE_TOKEN=your_token_here

# Docker-specific optimizations
NODE_OPTIONS=--max-old-space-size=2048
NEXT_TELEMETRY_DISABLED=1
```

## Monitoring Performance

### Check container stats:
```bash
docker stats
```

### View logs:
```bash
docker-compose -f docker-compose.optimized.yml logs -f app
```

### Access the application:
- Application: http://localhost:3000
- Health check: http://localhost:3000/api/health

## Troubleshooting

### If images load slowly:
1. Check Docker volume permissions
2. Increase memory limits in docker-compose
3. Use production build: `NODE_ENV=production`

### If database is still slow:
1. Consider upgrading Supabase plan
2. Implement Redis caching (add to docker-compose)
3. Use connection pooling with pgBouncer

## Next Steps

1. **Add Redis Cache**:
   - Cache frequently accessed data
   - Session storage
   - Rate limiting

2. **Add CDN**:
   - Use Cloudflare for static assets
   - Cache API responses

3. **Implement Edge Functions**:
   - Move heavy computations to edge
   - Reduce main server load
