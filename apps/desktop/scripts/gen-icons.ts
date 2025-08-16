import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
// Use the app-local directory (`apps/desktop`) so icons live in apps/desktop/build
const APP_DIR = path.resolve(__dirname, '..')
const BUILD_DIR = path.join(APP_DIR, 'build')
const SOURCE_SVG = path.join(BUILD_DIR, 'icon.svg')
const MAC_ICON = path.join(BUILD_DIR, 'icon-mac.png')

// Icon sizes to generate
const SIZES = [256, 512, 1024]

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch (error) {
    console.log(`Creating directory: ${dirPath}`)
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * Generate icons at specified sizes
 */
async function generateIcons(): Promise<void> {
  try {
    // Ensure build directory exists
    await ensureDir(BUILD_DIR)
    
    // Check if source SVG exists
    try {
      await fs.access(SOURCE_SVG)
    } catch (error) {
      console.error(`Error: Source SVG not found at ${SOURCE_SVG}`)
      console.log('Creating a placeholder SVG...')
      
      // Create a simple placeholder SVG if the source doesn't exist
      const placeholderSvg = `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" fill="#0b0b0c"/>
          <circle cx="512" cy="512" r="400" fill="url(#grad)"/>
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
            </linearGradient>
          </defs>
          <text x="512" y="512" font-family="Arial" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle">Skyscope</text>
        </svg>
      `
      await fs.writeFile(SOURCE_SVG, placeholderSvg)
    }
    
    // Generate main macOS icon (1024px)
    console.log(`Generating macOS icon at ${MAC_ICON}`)
    await sharp(SOURCE_SVG)
      .resize(1024, 1024)
      .png()
      .toFile(MAC_ICON)
    
    // Generate all sizes
    for (const size of SIZES) {
      const outputFile = path.join(BUILD_DIR, `icon-${size}.png`)
      console.log(`Generating ${size}x${size} icon at ${outputFile}`)
      
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(outputFile)
    }
    
    console.log('✅ Icon generation complete!')
  } catch (error) {
    console.error('Error generating icons:', error)
    process.exit(1)
  }
}

// Execute the icon generation
generateIcons()
