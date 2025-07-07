import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixAutoSubmissionIssue() {
    const filePath = path.join(__dirname, 'components', 'ui', 'animated-ai-input.tsx');
    
    try {
        console.log('Reading animated-ai-input.tsx...');
        let content = await fs.readFile(filePath, 'utf8');
        
        // Create backup
        const backupPath = filePath + '.backup';
        await fs.writeFile(backupPath, content, 'utf8');
        console.log('Created backup at:', backupPath);
        
        // Fix the syntax error on line 865
        // Replace the broken if statement
        const brokenPattern = /if\s*\(false\s*\/\*.*?\*\/\s*{/g;
        const fixedPattern = 'if (false) /* Auto-download disabled */ {';
        
        if (content.includes('if (false /* Auto-download disabled - was checking download progress */ {')) {
            content = content.replace(
                'if (false /* Auto-download disabled - was checking download progress */ {',
                'if (false) /* Auto-download disabled - was checking download progress */ {'
            );
            console.log('✅ Fixed syntax error on line 865');
        }
        
        // Also fix line 934 if it has the same issue
        content = content.replace(
            /if\s*\(\s*isDownloadingYoutube\s*\|\|\s*isDownloadingInstagram\s*\|\|\s*isDownloadingTikTok\s*\|\|\s*isDownloadingFacebook\s*\|\|\s*autoDownloadInProgress\s*\)\s*{/g,
            'if (false /* Auto-download check disabled */) {'
        );
        
        // Write the fixed content back
        await fs.writeFile(filePath, content, 'utf8');
        
        console.log('\n✅ Syntax errors fixed successfully!');
        console.log('\n⚠️  Please restart your development server for changes to take effect.');
        console.log('\n📌 The auto-download feature has been disabled to prevent auto-submission.');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

fixAutoSubmissionIssue();
