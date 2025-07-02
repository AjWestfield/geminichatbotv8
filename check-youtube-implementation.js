import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 YouTube Download Implementation Status Check\n');

// Check if key files exist
const checkFiles = () => {
    const files = [
        {
            path: 'lib/youtube-url-utils.ts',
            description: 'YouTube URL detection utilities'
        },
        {
            path: 'app/api/youtube-download/route.ts',
            description: 'YouTube download API endpoint'
        },
        {
            path: 'components/ui/animated-ai-input.tsx',
            description: 'Input component with auto-download'
        },
        {
            path: 'lib/contexts/settings-context.tsx',
            description: 'Settings context with YouTube options'
        }
    ];

    console.log('📁 Required Files:\n');
    
    files.forEach(file => {
        const fullPath = path.join(__dirname, file.path);
        const exists = fs.existsSync(fullPath);
        console.log(`${exists ? '✅' : '❌'} ${file.path}`);
        console.log(`   ${file.description}\n`);
    });
};

// Check for YouTube-related code in key files
const checkImplementation = () => {
    console.log('🔧 Implementation Details:\n');
    
    // Check animated-ai-input.tsx for auto-download logic
    const inputPath = path.join(__dirname, 'components/ui/animated-ai-input.tsx');
    if (fs.existsSync(inputPath)) {
        const content = fs.readFileSync(inputPath, 'utf8');
        const hasAutoDownload = content.includes('youtubeSettings.autoDownload');
        const hasUrlDetection = content.includes('extractYouTubeUrl');
        
        console.log('animated-ai-input.tsx:');
        console.log(`  ${hasAutoDownload ? '✅' : '❌'} Auto-download logic`);
        console.log(`  ${hasUrlDetection ? '✅' : '❌'} YouTube URL detection\n`);
    }
    
    // Check settings context
    const settingsPath = path.join(__dirname, 'lib/contexts/settings-context.tsx');
    if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf8');
        const hasYouTubeSettings = content.includes('youtubeSettings');
        const hasAutoDownload = content.includes('autoDownload');
        
        console.log('settings-context.tsx:');
        console.log(`  ${hasYouTubeSettings ? '✅' : '❌'} YouTube settings structure`);
        console.log(`  ${hasAutoDownload ? '✅' : '❌'} Auto-download setting\n`);
    }
};

// Check package.json for yt-dlp
const checkDependencies = () => {
    console.log('📦 Dependencies:\n');
    
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const hasYtDlp = packageJson.dependencies?.['yt-dlp-wrap'] || 
                        packageJson.devDependencies?.['yt-dlp-wrap'];
        
        console.log(`  ${hasYtDlp ? '✅' : '❌'} yt-dlp-wrap package\n`);
    }
};

// Run all checks
console.log('=' .repeat(50) + '\n');
checkFiles();
console.log('=' .repeat(50) + '\n');
checkImplementation();
console.log('=' .repeat(50) + '\n');
checkDependencies();
console.log('=' .repeat(50) + '\n');

console.log('📋 Summary:');
console.log('  - Check the test guide: YOUTUBE_DOWNLOAD_TEST_GUIDE.md');
console.log('  - Open browser test: test-youtube-browser.html');
console.log('  - App should be running on http://localhost:3000\n');