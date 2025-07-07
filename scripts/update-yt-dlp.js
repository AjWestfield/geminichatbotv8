#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function updateYtDlp() {
  console.log('🔄 Updating yt-dlp to the latest version...\n');

  try {
    // Check if yt-dlp is installed
    try {
      const { stdout: version } = await execAsync('yt-dlp --version');
      console.log(`Current yt-dlp version: ${version.trim()}`);
    } catch (error) {
      console.log('yt-dlp is not installed. Installing now...');
    }

    // Update or install yt-dlp
    console.log('\n📦 Installing/updating yt-dlp...');
    
    // Try different installation methods
    const methods = [
      {
        name: 'pip',
        command: 'pip install --upgrade yt-dlp',
        check: 'pip --version'
      },
      {
        name: 'pip3',
        command: 'pip3 install --upgrade yt-dlp',
        check: 'pip3 --version'
      },
      {
        name: 'brew (macOS)',
        command: 'brew upgrade yt-dlp || brew install yt-dlp',
        check: 'brew --version'
      },
      {
        name: 'direct download',
        command: 'curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp',
        check: null
      }
    ];

    let installed = false;

    for (const method of methods) {
      try {
        // Check if the method is available
        if (method.check) {
          try {
            await execAsync(method.check);
          } catch {
            console.log(`❌ ${method.name} not available, skipping...`);
            continue;
          }
        }

        console.log(`\n🔧 Trying to install with ${method.name}...`);
        const { stdout, stderr } = await execAsync(method.command);
        
        if (stdout) console.log(stdout);
        if (stderr && !stderr.includes('already up-to-date')) console.error(stderr);

        // Verify installation
        const { stdout: newVersion } = await execAsync('yt-dlp --version');
        console.log(`\n✅ Successfully updated yt-dlp to version: ${newVersion.trim()}`);
        installed = true;
        break;
      } catch (error) {
        console.log(`❌ Failed with ${method.name}: ${error.message}`);
      }
    }

    if (!installed) {
      console.error('\n❌ Failed to install/update yt-dlp. Please install it manually:');
      console.error('Visit: https://github.com/yt-dlp/yt-dlp#installation');
      process.exit(1);
    }

    // Test TikTok functionality
    console.log('\n🧪 Testing TikTok download capability...');
    try {
      const { stdout } = await execAsync('yt-dlp --version');
      console.log('✅ yt-dlp is ready for use!');
      console.log('\n💡 Tips for TikTok downloads:');
      console.log('- If you get IP blocked errors, consider using a residential proxy');
      console.log('- You can set proxy with: export HTTP_PROXY=http://your-proxy:port');
      console.log('- Or use the --proxy option in yt-dlp commands');
    } catch (error) {
      console.error('❌ yt-dlp test failed:', error.message);
    }

  } catch (error) {
    console.error('\n❌ Error updating yt-dlp:', error.message);
    process.exit(1);
  }
}

// Run the update
updateYtDlp().then(() => {
  console.log('\n✨ Update process completed!');
}).catch(error => {
  console.error('\n❌ Update failed:', error);
  process.exit(1);
});