import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function disableAutoDownload() {
    const filePath = path.join(__dirname, 'components', 'ui', 'animated-ai-input.tsx');
    
    try {
        console.log('Reading animated-ai-input.tsx...');
        let content = await fs.readFile(filePath, 'utf8');
        
        // Find and disable auto-download checks
        const patterns = [
            // Pattern 1: Disable auto-download condition checks
            {
                search: /if\s*\(\s*youtubeSettings\.autoDownload\s*&&\s*!isDownloading/g,
                replace: 'if (false && youtubeSettings.autoDownload && !isDownloading'
            },
            // Pattern 2: Disable the autoDownload flag check
            {
                search: /youtubeSettings\.autoDownload\s*&&\s*!autoDownloadInProgress/g,
                replace: 'false && youtubeSettings.autoDownload && !autoDownloadInProgress'
            },
            // Pattern 3: Set autoDownloadInProgress checks to always false
            {
                search: /if\s*\(\s*isDownloadingYoutube\s*\|\|\s*isDownloadingInstagram\s*\|\|\s*isDownloadingTikTok\s*\|\|\s*isDownloadingFacebook\s*\|\|\s*autoDownloadInProgress\s*\)/g,
                replace: 'if (false /* Auto-download disabled - was checking download progress */'
            }
        ];
        
        let modifiedContent = content;
        let totalReplacements = 0;
        
        console.log('\nApplying fixes to disable auto-download...\n');
        
        patterns.forEach((pattern, index) => {
            const matches = modifiedContent.match(pattern.search) || [];
            if (matches.length > 0) {
                console.log(`Pattern ${index + 1}: Found ${matches.length} occurrences`);
                modifiedContent = modifiedContent.replace(pattern.search, pattern.replace);
                totalReplacements += matches.length;
            }
        });
        
        if (totalReplacements > 0) {
            // Write the modified content back
            await fs.writeFile(filePath, modifiedContent, 'utf8');
            
            console.log('\n✅ Successfully disabled auto-download feature!');
            console.log(`Total replacements made: ${totalReplacements}`);
            console.log('\n⚠️  Important: Please restart your development server for changes to take effect.');
            console.log('\n💡 You can still manually download social media content using the download buttons.');
        } else {
            console.log('\n✅ No auto-download patterns found - the feature may already be disabled.');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

disableAutoDownload();
