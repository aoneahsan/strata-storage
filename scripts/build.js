#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

console.log('🔨 Building Strata Storage...');

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Ensure dist directory exists
fs.mkdirSync(distDir, { recursive: true });

// Compile TypeScript for CommonJS
console.log('📦 Building CommonJS...');
try {
  execSync('npx tsc -p tsconfig.cjs.json', { stdio: 'inherit', cwd: rootDir });
} catch (error) {
  console.error('❌ CommonJS build failed');
  process.exit(1);
}

// Compile TypeScript for ESM
console.log('📦 Building ES Modules...');
try {
  execSync('npx tsc -p tsconfig.esm.json', { stdio: 'inherit', cwd: rootDir });
} catch (error) {
  console.error('❌ ESM build failed');
  process.exit(1);
}

// Build integrations (skip for now as they have peer dependencies)
console.log('⏭️  Skipping integrations build (peer dependencies not installed)...');

// Create entry files
console.log('📝 Creating entry files...');

// Create CommonJS entry point
const cjsEntry = `'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/index.js');
} else {
  module.exports = require('./cjs/index.js');
}
`;
fs.writeFileSync(path.join(distDir, 'index.js'), cjsEntry);

// Create ESM entry point
const esmEntry = `export * from './esm/index.js';
export { default } from './esm/index.js';
`;
fs.writeFileSync(path.join(distDir, 'index.mjs'), esmEntry);


// Copy package.json fields for publishing
console.log('📋 Preparing package metadata...');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const distPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: './index.js',
  module: './index.mjs',
  types: './types/index.d.ts',
  exports: {
    '.': {
      types: './types/index.d.ts',
      import: './index.mjs',
      require: './index.js'
    }
  },
  author: packageJson.author,
  license: packageJson.license,
  repository: packageJson.repository,
  keywords: packageJson.keywords,
  peerDependencies: packageJson.peerDependencies,
  peerDependenciesMeta: packageJson.peerDependenciesMeta,
  capacitor: packageJson.capacitor,
  sideEffects: false,
  files: [
    'cjs',
    'esm',
    'types',
    'index.js',
    'index.mjs',
    'android',
    'ios',
    'README.md',
    'LICENSE'
  ]
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

// Copy README and LICENSE
if (fs.existsSync(path.join(rootDir, 'README.md'))) {
  fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(distDir, 'README.md'));
}
if (fs.existsSync(path.join(rootDir, 'LICENSE'))) {
  fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(distDir, 'LICENSE'));
}

// Copy native directories if they exist
const nativeDirs = ['android', 'ios'];
nativeDirs.forEach(dir => {
  const srcPath = path.join(rootDir, dir);
  const destPath = path.join(distDir, dir);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  }
});

// Fix path aliases in all built files
console.log('🔧 Fixing path aliases...');
const fixPathAliases = (dir, buildType) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixPathAliases(filePath, buildType);
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Calculate depth from build root (cjs or esm directory)
      const buildRoot = path.join(distDir, buildType);
      const relativeFromBuildRoot = path.relative(buildRoot, path.dirname(filePath));
      const depth = relativeFromBuildRoot ? relativeFromBuildRoot.split(path.sep).length : 0;
      const pathToRoot = depth > 0 ? '../'.repeat(depth) : './';
      
      // Fix all @/ imports and requires with proper aliasing
      content = content
        .replace(/from\s+["']@\/core\//g, `from "${pathToRoot}core/`)
        .replace(/from\s+["']@\/adapters\//g, `from "${pathToRoot}adapters/`)
        .replace(/from\s+["']@\/features\//g, `from "${pathToRoot}features/`)
        .replace(/from\s+["']@\/utils\//g, `from "${pathToRoot}utils/`)
        .replace(/from\s+["']@\/plugin\//g, `from "${pathToRoot}plugin/`)
        .replace(/from\s+["']@\/types\//g, `from "${pathToRoot}types/`)
        .replace(/from\s+["']@\/utils["']/g, `from "${pathToRoot}utils"`)
        .replace(/from\s+["']@\/plugin["']/g, `from "${pathToRoot}plugin"`)
        .replace(/require\(["']@\/core\//g, `require("${pathToRoot}core/`)
        .replace(/require\(["']@\/adapters\//g, `require("${pathToRoot}adapters/`)
        .replace(/require\(["']@\/features\//g, `require("${pathToRoot}features/`)
        .replace(/require\(["']@\/utils\//g, `require("${pathToRoot}utils/`)
        .replace(/require\(["']@\/plugin\//g, `require("${pathToRoot}plugin/`)
        .replace(/require\(["']@\/types\//g, `require("${pathToRoot}types/`)
        .replace(/require\(["']@\/utils["']\)/g, `require("${pathToRoot}utils")`)
        .replace(/require\(["']@\/plugin["']\)/g, `require("${pathToRoot}plugin")`)
        .replace(/import\(["']@\/core\//g, `import("${pathToRoot}core/`)
        .replace(/import\(["']@\/adapters\//g, `import("${pathToRoot}adapters/`)
        .replace(/import\(["']@\/features\//g, `import("${pathToRoot}features/`)
        .replace(/import\(["']@\/utils\//g, `import("${pathToRoot}utils/`)
        .replace(/import\(["']@\/plugin\//g, `import("${pathToRoot}plugin/`)
        .replace(/import\(["']@\/types\//g, `import("${pathToRoot}types/`)
        .replace(/import\(["']@\/utils["']\)/g, `import("${pathToRoot}utils")`)
        .replace(/import\(["']@\/plugin["']\)/g, `import("${pathToRoot}plugin")`);
      
      // Fix extra quotes in dynamic imports
      content = content.replace(/require\("([^"]+)'\)/g, 'require("$1")');
      content = content.replace(/import\("([^"]+)'\)/g, 'import("$1")');
      
      fs.writeFileSync(filePath, content);
    }
  });
};

if (fs.existsSync(path.join(distDir, 'cjs'))) {
  fixPathAliases(path.join(distDir, 'cjs'), 'cjs');
}
if (fs.existsSync(path.join(distDir, 'esm'))) {
  fixPathAliases(path.join(distDir, 'esm'), 'esm');
}

console.log('✅ Build completed successfully!');
console.log(`📂 Output: ${distDir}`);