#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing webpack chunk issues...\n');

// Step 1: Clean build directories
console.log('1. Cleaning build directories...');
const dirsToClean = ['.next', 'node_modules/.cache'];

const projectRoot = path.resolve(__dirname, '..');

dirsToClean.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`   Removing ${dir}...`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

// Step 2: Clear npm cache
console.log('\n2. Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
} catch (error) {
  console.warn('   Warning: Failed to clear npm cache');
}

// Step 3: Reinstall dependencies if needed
if (process.argv.includes('--reinstall')) {
  console.log('\n3. Reinstalling dependencies...');
  console.log('   Removing node_modules...');
  fs.rmSync(path.join(projectRoot, 'node_modules'), { recursive: true, force: true });
  
  console.log('   Running npm install...');
  execSync('npm install', { stdio: 'inherit', cwd: projectRoot });
}

// Step 4: Create .next directories to ensure proper structure
console.log('\n4. Creating .next directory structure...');
const nextDirs = [
  '.next',
  '.next/cache',
  '.next/server',
  '.next/static'
];

nextDirs.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`   Created ${dir}`);
  }
});

console.log('\n✅ Webpack chunk fix complete!');
console.log('\n📌 Next steps:');
console.log('   1. Run "npm run dev" to start the development server');
console.log('   2. If issues persist, run this script with --reinstall flag');
console.log('   3. Consider running "npm run db:optimize-performance" for database issues\n');