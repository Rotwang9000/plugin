#!/usr/bin/env node

/**
 * Build script for the Cookie Consent Manager extension
 * This script builds the extension for Manifest V3 compatibility
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}Cookie Consent Manager Extension Build${colors.reset}\n`);

try {
  // Step 1: Clean dist directory
  console.log(`${colors.yellow}Cleaning dist directory...${colors.reset}`);
  
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });
  
  // Step 2: Build with webpack
  console.log(`${colors.yellow}Building with webpack...${colors.reset}`);
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 3: Add type="module" directives to HTML files if needed
  console.log(`${colors.yellow}Updating HTML files...${colors.reset}`);
  
  const popupHtmlPath = path.join(__dirname, 'popup.html');
  if (fs.existsSync(popupHtmlPath)) {
    let popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');
    
    // Add type="module" to script tags that reference bundled files
    popupHtml = popupHtml.replace(
      /<script src="(dist\/.*\.bundle\.js)">/g, 
      '<script type="module" src="$1">'
    );
    
    fs.writeFileSync(popupHtmlPath, popupHtml);
    console.log(`${colors.green}Updated popup.html with type="module" attributes${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}${colors.green}Build completed successfully!${colors.reset}`);
  console.log(`\n${colors.yellow}To test the extension:${colors.reset}`);
  console.log(`1. Go to ${colors.cyan}chrome://extensions/${colors.reset}`);
  console.log(`2. Enable ${colors.cyan}Developer mode${colors.reset}`);
  console.log(`3. Click ${colors.cyan}Load unpacked${colors.reset}`);
  console.log(`4. Select the extension directory\n`);
  
} catch (error) {
  console.error(`${colors.red}Build failed:${colors.reset}`, error);
  process.exit(1);
} 