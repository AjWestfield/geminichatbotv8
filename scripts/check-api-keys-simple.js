// Simple script to check API keys configuration
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

console.log('Checking API Keys Configuration...');
console.log('=================================');

// Check GEMINI_API_KEY
if (process.env.GEMINI_API_KEY) {
    console.log('✓ GEMINI_API_KEY: Configured');
} else {
    console.log('✗ GEMINI_API_KEY: Missing (REQUIRED for chat functionality)');
}

// Check OPENAI_API_KEY
if (process.env.OPENAI_API_KEY) {
    console.log('✓ OPENAI_API_KEY: Configured');
} else {
    console.log('✗ OPENAI_API_KEY: Missing (Optional - needed for GPT-4 and DALL-E)');
}

// Check PERPLEXITY_API_KEY
if (process.env.PERPLEXITY_API_KEY) {
    console.log('✓ PERPLEXITY_API_KEY: Configured');
} else {
    console.log('✗ PERPLEXITY_API_KEY: Missing (Optional - needed for web search)');
}

// Check WAVESPEED_API_KEY
if (process.env.WAVESPEED_API_KEY) {
    console.log('✓ WAVESPEED_API_KEY: Configured');
} else {
    console.log('✗ WAVESPEED_API_KEY: Missing (Optional - needed for advanced features)');
}

// Check REPLICATE_API_KEY
if (process.env.REPLICATE_API_KEY) {
    console.log('✓ REPLICATE_API_KEY: Configured');
} else {
    console.log('✗ REPLICATE_API_KEY: Missing (Optional - needed for video generation)');
}

// Check persistence configuration
if (process.env.SUPABASE_URL && process.env.SUPABASE_API_KEY) {
    console.log('✓ SUPABASE: Configured');
} else {
    console.log('✗ SUPABASE: Missing (Optional - needed for chat persistence)');
}

if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('✓ BLOB_STORAGE: Configured');
} else {
    console.log('✗ BLOB_STORAGE: Missing (Optional - needed for media storage)');
}

console.log('=================================');

// Summary
const hasGemini = !!process.env.GEMINI_API_KEY;
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
const hasWaveSpeed = !!process.env.WAVESPEED_API_KEY;
const hasReplicate = !!process.env.REPLICATE_API_KEY;
const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_API_KEY);

if (hasGemini && hasOpenAI && hasPerplexity) {
    console.log('✨ Core features configured! Chat, image generation, and web search will work.');
} else if (hasGemini) {
    console.log('✅ Basic chat functionality will work.');
    if (!hasOpenAI) console.log('⚠️  GPT-4 and DALL-E features will not be available.');
    if (!hasPerplexity) console.log('⚠️  Web search will not be available.');
} else {
    console.log('❌ GEMINI_API_KEY is required for the chat to function.');
}

if (hasSupabase) {
    console.log('💾 Chat persistence is enabled.');
} else {
    console.log('📝 Chat history will only be stored locally.');
}
