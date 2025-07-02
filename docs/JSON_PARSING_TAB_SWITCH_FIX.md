# JSON Parsing Error Fix - Tab Switching Issue

## Problem
Users were experiencing `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` errors when clicking on browser tabs. This occurred because corrupted data in localStorage (possibly HTML error pages stored instead of JSON) was being parsed when the app tried to sync settings across tabs.

## Root Cause
The `lib/settings-sync.ts` file has a storage event listener that fires when localStorage changes in other tabs. When switching tabs, if localStorage contained corrupted data (HTML instead of JSON), the parsing would fail with the error shown above.

## Solution Implemented

### 1. Enhanced Error Handling in settings-sync.ts
- Added comprehensive JSON validation before parsing any data from storage events
- Automatically clears corrupted data instead of propagating errors
- Validates all JSON-like values (not just specific keys)

### 2. Robust JSON Validation Across the App
The following files already had good JSON validation, but we ensured consistency:
- `lib/contexts/settings-context.tsx` - Validates all settings before parsing
- `lib/localStorage-persistence.ts` - Validates chat and message data
- `app/page.tsx` - Validates video settings initialization

### 3. Cleanup Script
Created `scripts/clean-localStorage.js` to help users clean existing corrupted data:
```bash
node scripts/clean-localStorage.js
```

## How the Fix Works

1. **Prevention**: All JSON parsing now validates data structure first (checks for `{}` or `[]`)
2. **Auto-Cleanup**: If corrupted data is detected, it's automatically removed
3. **Error Isolation**: Storage events with invalid data are ignored, preventing error propagation
4. **Graceful Fallbacks**: Always return default values when data is corrupted

## For Users with Existing Errors

If you're still experiencing errors after updating:

1. Run the cleanup script:
   ```bash
   node scripts/clean-localStorage.js
   ```

2. Follow the instructions to run the cleanup code in your browser console

3. Refresh the page

## Technical Details

The main changes were in `lib/settings-sync.ts` in the `handleStorageChange` method:
- Validates all JSON-like values before parsing
- Clears corrupted entries automatically
- Prevents invalid data from being propagated to listeners

This ensures that tab switching never triggers JSON parsing errors, even if localStorage becomes corrupted.