# Next.js Build Error Fix

## Error
```
Error: ENOENT: no such file or directory, open '/Users/andersonwestfield/Desktop/geminichatbotv7/.next/server/vendor-chunks/next.js'
```

## Cause
This error occurs when the Next.js build cache (`.next` directory) becomes corrupted or incomplete. This can happen due to:
- Interrupted builds
- File system issues
- Version mismatches
- Corrupted cache files

## Solution

1. **Stop the development server** (if running)
   ```bash
   # Press Ctrl+C or kill the process
   ```

2. **Remove the corrupted build directory**
   ```bash
   rm -rf .next
   ```

3. **Clear Node.js module cache** (optional but recommended)
   ```bash
   rm -rf node_modules/.cache
   ```

4. **Restart the development server**
   ```bash
   ./dev.sh
   # or
   npm run dev
   ```

## Prevention
- Always stop the dev server gracefully (Ctrl+C)
- Avoid force-killing the Next.js process
- Keep your dependencies up to date
- Use the provided `dev.sh` script which ensures correct Node.js version

## Additional Troubleshooting
If the error persists:
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install --legacy-peer-deps`
2. Clear all caches: `rm -rf .next node_modules/.cache`
3. Check disk space availability
4. Verify file permissions

## Fixed on
June 21, 2025
