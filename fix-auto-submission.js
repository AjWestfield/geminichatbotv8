#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function fixAutoSubmissionIssue() {
    const filePath = path.join(process.cwd(), 'components', 'chat-interface.tsx');
    
    try {
        console.log('Reading chat-interface.tsx...');
        let content = await fs.readFile(filePath, 'utf8');
        
        // Count instances before fix
        const beforeCount = (content.match(/^\s*handleInputChange\s*$/gm) || []).length;
        console.log(`Found ${beforeCount} instances of standalone 'handleInputChange'`);
        
        // Replace standalone handleInputChange with proper function calls
        // This regex matches handleInputChange that appears alone on a line or without proper syntax
        content = content.replace(
            /^(\s*)handleInputChange\s*$/gm,
            '$1handleInputChange({ target: { value: analysisPrompt } } as React.ChangeEvent<HTMLInputElement>)'
        );
        
        // Replace handleInputChange that appears without parentheses in specific contexts
        content = content.replace(
            /handleInputChange\s*\n/g,
            'handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)\n'
        );
        
        // Fix other syntax errors like "HandleSubmit" that should be "handleSubmit()"
        content = content.replace(/\bHandleSubmit\b(?!\()/g, 'handleSubmit()');
        
        // Write the fixed content back
        console.log('Writing fixed content back to file...');
        await fs.writeFile(filePath, content, 'utf8');
        
        // Count instances after fix
        const afterContent = await fs.readFile(filePath, 'utf8');
        const afterCount = (afterContent.match(/^\s*handleInputChange\s*$/gm) || []).length;
        
        console.log('✅ Fix applied successfully!');
        console.log(`Standalone 'handleInputChange' instances: ${beforeCount} → ${afterCount}`);
        console.log('\nThe auto-submission issue should now be resolved.');
        console.log('Please restart your development server for the changes to take effect.');
        
    } catch (error) {
        console.error('❌ Error fixing the file:', error.message);
        process.exit(1);
    }
}

fixAutoSubmissionIssue();
