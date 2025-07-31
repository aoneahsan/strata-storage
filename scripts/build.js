#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

console.log('🔨 Building Strata Storage...');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Compile TypeScript
console.log('📦 Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit', cwd: rootDir });
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Copy package.json fields for publishing
console.log('📋 Preparing package metadata...');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const distPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: 'index.js',
  module: 'index.esm.js',
  types: 'index.d.ts',
  author: packageJson.author,
  license: packageJson.license,
  repository: packageJson.repository,
  keywords: packageJson.keywords,
  peerDependencies: packageJson.peerDependencies,
  peerDependenciesMeta: packageJson.peerDependenciesMeta,
  capacitor: packageJson.capacitor,
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

console.log('✅ Build completed successfully!');
console.log(`📂 Output: ${distDir}`);