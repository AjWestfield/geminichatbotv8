#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import https from 'https'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// GitHub releases API for yt-dlp
const YTDLP_RELEASES_API = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'

// Platform detection
function getPlatform() {
  const platform = process.platform
  const arch = process.arch
  
  console.log(`Detected platform: ${platform} (${arch})`)
  
  if (platform === 'win32') {
    return 'yt-dlp.exe'
  } else if (platform === 'darwin') {
    return 'yt-dlp_macos'
  } else if (platform === 'linux') {
    return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux'
  } else {
    throw new Error(`Unsupported platform: ${platform}`)
  }
}

// Create binaries directory
function ensureBinDirectory() {
  const binDir = path.join(__dirname, '..', 'bin')
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
    console.log(`Created bin directory: ${binDir}`)
  }
  return binDir
}

// Download file from URL
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`)
    console.log(`Saving to: ${outputPath}`)
    
    const file = fs.createWriteStream(outputPath)
    
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject)
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`))
        return
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0')
      let downloadedSize = 0
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length
        if (totalSize > 0) {
          const progress = ((downloadedSize / totalSize) * 100).toFixed(1)
          process.stdout.write(`\rDownload progress: ${progress}%`)
        }
      })
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        console.log('\nDownload completed successfully')
        resolve()
      })
      
      file.on('error', (error) => {
        fs.unlink(outputPath, () => {}) // Delete partial file
        reject(error)
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

// Fetch latest release information
function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    console.log('Fetching latest yt-dlp release information...')
    
    https.get(YTDLP_RELEASES_API, {
      headers: {
        'User-Agent': 'geminichatbotv7-ytdlp-installer'
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch release info: HTTP ${response.statusCode}`))
        return
      }
      
      let data = ''
      response.on('data', (chunk) => {
        data += chunk
      })
      
      response.on('end', () => {
        try {
          const releaseInfo = JSON.parse(data)
          resolve(releaseInfo)
        } catch (error) {
          reject(new Error('Failed to parse release information'))
        }
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

// Make file executable (Unix/Linux/macOS)
function makeExecutable(filePath) {
  if (process.platform !== 'win32') {
    try {
      execSync(`chmod +x "${filePath}"`)
      console.log('Made yt-dlp executable')
    } catch (error) {
      console.warn('Warning: Could not make yt-dlp executable:', error.message)
    }
  }
}

// Verify installation
function verifyInstallation(ytdlpPath) {
  try {
    console.log('Verifying yt-dlp installation...')
    const version = execSync(`"${ytdlpPath}" --version`, { encoding: 'utf8' }).trim()
    console.log(`✅ yt-dlp installed successfully. Version: ${version}`)
    return true
  } catch (error) {
    console.error('❌ Failed to verify yt-dlp installation:', error.message)
    return false
  }
}

// Check if yt-dlp is already available
function checkExistingInstallation() {
  try {
    const version = execSync('yt-dlp --version', { encoding: 'utf8' }).trim()
    console.log(`✅ yt-dlp already available system-wide. Version: ${version}`)
    return true
  } catch (error) {
    console.log('ℹ️  yt-dlp not found in system PATH, will install locally')
    return false
  }
}

// Main installation function
async function installYtDlp() {
  try {
    console.log('🚀 Starting yt-dlp installation...')
    
    // Check if already installed system-wide
    if (checkExistingInstallation()) {
      console.log('✅ Using existing system installation')
      return
    }
    
    // Ensure bin directory exists
    const binDir = ensureBinDirectory()
    
    // Get platform-specific binary name
    const binaryName = getPlatform()
    const outputPath = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
    
    // Check if already downloaded
    if (fs.existsSync(outputPath)) {
      console.log('ℹ️  yt-dlp binary already exists, verifying...')
      if (verifyInstallation(outputPath)) {
        console.log('✅ Using existing local installation')
        return
      } else {
        console.log('🔄 Existing binary is corrupted, re-downloading...')
        fs.unlinkSync(outputPath)
      }
    }
    
    // Fetch latest release information
    const releaseInfo = await fetchLatestRelease()
    console.log(`📦 Latest version: ${releaseInfo.tag_name}`)
    
    // Find the correct asset for our platform
    const asset = releaseInfo.assets.find(asset => asset.name === binaryName)
    if (!asset) {
      throw new Error(`No binary found for platform: ${binaryName}`)
    }
    
    console.log(`📁 Found asset: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)`)
    
    // Download the binary
    await downloadFile(asset.browser_download_url, outputPath)
    
    // Make executable
    makeExecutable(outputPath)
    
    // Verify installation
    if (verifyInstallation(outputPath)) {
      console.log('🎉 yt-dlp installation completed successfully!')
      
      // Create a symlink or note for easy access
      const relativePath = path.relative(process.cwd(), outputPath)
      console.log(`📍 Binary location: ${relativePath}`)
      
      // Update package.json if needed to include bin path
      const packageJsonPath = path.join(__dirname, '..', 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
          if (!packageJson.bin) {
            packageJson.bin = {}
          }
          packageJson.bin['yt-dlp'] = relativePath
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
          console.log('📝 Updated package.json with yt-dlp binary path')
        } catch (error) {
          console.warn('Warning: Could not update package.json:', error.message)
        }
      }
    } else {
      throw new Error('Installation verification failed')
    }
    
  } catch (error) {
    console.error('❌ Failed to install yt-dlp:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('1. Check your internet connection')
    console.error('2. Try running the script again')
    console.error('3. Install yt-dlp manually: https://github.com/yt-dlp/yt-dlp#installation')
    console.error('4. Ensure you have write permissions to the project directory')
    process.exit(1)
  }
}

// Run installation
if (import.meta.url === `file://${process.argv[1]}`) {
  installYtDlp()
}

export { installYtDlp, checkExistingInstallation, verifyInstallation }