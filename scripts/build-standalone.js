#!/usr/bin/env node

/**
 * Build script to create a standalone version of FormChippy
 * This creates a non-module version that can be included directly in HTML
 */

const fs = require('fs');
const path = require('path');

// Define paths
const srcDir = path.join(__dirname, '../src/js');
const distDir = path.join(__dirname, '../dist');
const srcMain = path.join(srcDir, 'formchippy.js');
const targetFile = path.join(distDir, 'formchippy.standalone.js');

// Core modules
const coreModules = [
  'navigation.js',
  'validation.js',
  'progress.js',
  'debug.js'
].map(file => path.join(srcDir, 'core', file));

// Question modules
const questionModules = [
  'text.js',
  'radio.js',
  'toggle.js',
  'file.js',
  'textarea.js',
  'date.js'
].map(file => path.join(srcDir, 'questions', file));

// Read all module files
function readModuleFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Strip export statements
  return content
    .replace(/export\s+\{\s*(\w+)\s*\}\s*;?/g, '')
    .replace(/export\s+class\s+(\w+)/g, 'class $1')
    .replace(/import\s+\{\s*[^}]+\}\s+from\s+['"][^'"]+['"];?/g, '');
}

// Read the main file but strip imports and exports
function readMainFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    // Remove imports
    .replace(/import\s+\{\s*[^}]+\}\s+from\s+['"][^'"]+['"];?/g, '')
    // Remove export default statement
    .replace(/export\s+default\s+\w+\s*;?/g, '')
    // Make FormChippy global
    .replace(/class FormChippy/g, 'window.FormChippy = class FormChippy');
}

// Build the standalone file
function buildStandalone() {
  console.log('Building standalone version of FormChippy...');
  
  // Header with version info and IIFE start
  let output = `/**
 * FormChippy.js v1.1.0 (Standalone)
 * A smooth, vertical scrolling multi-step form experience
 * 
 * @license MIT
 * @author JP
 */
(function() {
  'use strict';

`;

  // Add core modules
  coreModules.forEach(module => {
    output += readModuleFile(module) + '\n\n';
  });
  
  // Add question modules
  questionModules.forEach(module => {
    output += readModuleFile(module) + '\n\n';
  });
  
  // Add main FormChippy class
  output += readMainFile(srcMain) + '\n\n';
  
  // Auto-initialize function
  output += `
  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    new FormChippy();
  });
`;
  
  // Close IIFE
  output += '})();';
  
  // Final check to make sure no export statements remain
  output = output.replace(/export\s+default\s+\w+\s*;?/g, '');
  
  // Write to file
  fs.writeFileSync(targetFile, output);
  console.log(`Standalone version written to ${targetFile}`);
}

// Run the build
buildStandalone();
