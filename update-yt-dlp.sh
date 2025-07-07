#!/bin/bash
# Update yt-dlp to latest version

echo "Updating yt-dlp..."

# Try brew first
if command -v brew &> /dev/null; then
  brew upgrade yt-dlp
elif command -v pip &> /dev/null; then
  pip install --upgrade yt-dlp
else
  echo "Neither brew nor pip found. Please install yt-dlp manually."
  exit 1
fi

# Clear yt-dlp cache
echo "Clearing yt-dlp cache..."
yt-dlp --rm-cache-dir

echo "✅ yt-dlp updated successfully!"
