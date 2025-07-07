#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixAutoSubmissionIssue() {
    const filePath = path.join(__dirname, 'components', 'chat-interface.tsx');
    
    try {
        console.log('Reading chat-interface.tsx...');
        let content = await fs.readFile(filePath, 'utf8');
        
        // Count instances before fix
        const beforeMatches = content.match(/^\s*handleInputChange\s*$/gm) || [];
        const beforeCount = beforeMatches.length;
        console.log(`\nFound ${beforeCount} instances of standalone 'handleInputChange'`);
        
        if (beforeCount > 0) {
            console.log('\nFixing the following lines:');
            beforeMatches.forEach((match, index) => {
                console.log(`  ${index + 1}. "${match.trim()}"`);
            });
        }
        
        // Replace patterns that are causing auto-submission
        let fixedContent = content;
        
        // Fix standalone handleInputChange on its own line
        fixedContent = fixedContent.replace(
            /^(\s*)handleInputChange\s*$/gm,
            '$1// Fixed: handleInputChange call was missing parameters'
        );
        
        // Fix HandleSubmit that should be handleSubmit()
        fixedContent = fixedContent.replace(/\bHandleSubmit\b(?!\()/g, 'handleSubmit()');
        
        // Check if any changes were made
        if (fixedContent !== content) {
            console.log('\n✅ Writing fixed content back to file...');
            await fs.writeFile(filePath, fixedContent, 'utf8');
            
            // Verify the fix
            const afterContent = await fs.readFile(filePath, 'utf8');
            const afterCount = (afterContent.match(/^\s*handleInputChange\s*$/gm) || []).length;
            
            console.log('\n✅ Fix applied successfully!');
            console.log(`Standalone 'handleInputChange' instances: ${beforeCount} → ${afterCount}`);
            console.log('\n🎉 The auto-submission issue should now be resolved!');
            console.log('⚠️  Please restart your development server for the changes to take effect.');
        } else {
            console.log('\n✅ No issues found - the file appears to be already fixed!');
        }
        
    } catch (error) {
        console.error('\n❌ Error fixing the file:', error.message);
        console.error('\nPlease ensure you are running this script from the project root directory.');
        process.exit(1);
    }
}

fixAutoSubmissionIssue();
