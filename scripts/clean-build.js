#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function cleanBuild() {
  console.log('🧹 Starting clean build process...
');

  // Clean directories
  const toClean = ['.next', 'node_modules/.cache', '.next/cache'];
  for (const dir of toClean) {
    try {
      await fs.rm(path.join(rootDir, dir), { recursive: true, force: true });
      console.log(`✅ Cleaned ${dir}`);
    } catch {}
  }

  console.log('\n🔨 Running build...');
  try {
    const { stdout, stderr } = await execAsync('npm run build', { cwd: rootDir });
    if (stderr) console.error(stderr);
    console.log(stdout);
    console.log('\n✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

cleanBuild().catch(console.error);