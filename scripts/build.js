#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

console.log('🔨 Building Strata Storage (ESM)...');

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Ensure dist directory exists
fs.mkdirSync(distDir, { recursive: true });

// Compile TypeScript to ESM
console.log('📦 Building ES Modules...');
try {
  execSync('npx tsc', { stdio: 'inherit', cwd: rootDir });
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Fix path aliases in all built files
console.log('🔧 Fixing path aliases...');
const fixPathAliases = (dir) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixPathAliases(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Calculate depth from dist root
      const relativeFromDist = path.relative(distDir, path.dirname(filePath));
      const depth = relativeFromDist ? relativeFromDist.split(path.sep).length : 0;
      const pathToRoot = depth > 0 ? '../'.repeat(depth) : './';
      
      // Fix all @/ imports with proper aliasing
      content = content
        .replace(/from\s+["']@\/core\//g, `from "${pathToRoot}core/`)
        .replace(/from\s+["']@\/adapters\//g, `from "${pathToRoot}adapters/`)
        .replace(/from\s+["']@\/features\//g, `from "${pathToRoot}features/`)
        .replace(/from\s+["']@\/utils\//g, `from "${pathToRoot}utils/`)
        .replace(/from\s+["']@\/plugin\//g, `from "${pathToRoot}plugin/`)
        .replace(/from\s+["']@\/types\//g, `from "${pathToRoot}types/`)
        .replace(/from\s+["']@\/utils["']/g, `from "${pathToRoot}utils/index.js"`)
        .replace(/from\s+["']@\/plugin["']/g, `from "${pathToRoot}plugin/index.js"`)
        .replace(/import\(["']@\/core\//g, `import("${pathToRoot}core/`)
        .replace(/import\(["']@\/adapters\//g, `import("${pathToRoot}adapters/`)
        .replace(/import\(["']@\/features\//g, `import("${pathToRoot}features/`)
        .replace(/import\(["']@\/utils\//g, `import("${pathToRoot}utils/`)
        .replace(/import\(["']@\/plugin\//g, `import("${pathToRoot}plugin/`)
        .replace(/import\(["']@\/types\//g, `import("${pathToRoot}types/`)
        .replace(/import\(["']@\/utils["']\)/g, `import("${pathToRoot}utils/index.js")`)
        .replace(/import\(["']@\/plugin["']\)/g, `import("${pathToRoot}plugin/index.js")`);
      
      // Also fix any remaining short imports that should point to index.js
      content = content
        .replace(/from\s+["']\.\/utils["']/g, `from "./utils/index.js"`)
        .replace(/from\s+["']\.\/plugin["']/g, `from "./plugin/index.js"`);
      
      // Add .js extension to relative imports
      content = content
        .replace(/from\s+["'](\.[^"']+)["']/g, (match, path) => {
          if (!path.endsWith('.js') && !path.endsWith('.json')) {
            return `from "${path}.js"`;
          }
          return match;
        })
        .replace(/import\(["'](\.[^"']+)["']\)/g, (match, path) => {
          if (!path.endsWith('.js') && !path.endsWith('.json')) {
            return `import("${path}.js")`;
          }
          return match;
        });
      
      fs.writeFileSync(filePath, content);
    }
  });
};

fixPathAliases(distDir);

// Copy native directories if they exist
console.log('📱 Copying native code...');
const nativeDirs = ['android', 'ios'];
nativeDirs.forEach(dir => {
  const srcPath = path.join(rootDir, dir);
  const destPath = path.join(distDir, dir);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  }
});

// Copy other files
console.log('📄 Copying additional files...');
const filesToCopy = ['README.md', 'LICENSE'];
filesToCopy.forEach(file => {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
});

// Create package.json for distribution
console.log('📋 Preparing package metadata...');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const distPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  type: 'module',
  main: './index.js',
  types: './index.d.ts',
  exports: {
    '.': {
      types: './index.d.ts',
      default: './index.js'
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
  engines: {
    node: '>=18.0.0'
  }
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

console.log('✅ Build completed successfully!');
console.log(`📂 Output: ${distDir}`);