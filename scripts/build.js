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
  execSync('yarn exec tsc', { stdio: 'inherit', cwd: rootDir });
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
    } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
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
        .replace(/from\s+["']@\/types["']/g, `from "${pathToRoot}types/index.js"`)
        .replace(/from\s+["']@\/index["']/g, `from "${pathToRoot}index.js"`)
        .replace(/from\s+["']@\/config["']/g, `from "${pathToRoot}config/index.js"`)
        .replace(/from\s+["']@\/integrations["']/g, `from "${pathToRoot}integrations/index.js"`)
        .replace(/import\(["']@\/core\//g, `import("${pathToRoot}core/`)
        .replace(/import\(["']@\/adapters\//g, `import("${pathToRoot}adapters/`)
        .replace(/import\(["']@\/features\//g, `import("${pathToRoot}features/`)
        .replace(/import\(["']@\/utils\//g, `import("${pathToRoot}utils/`)
        .replace(/import\(["']@\/plugin\//g, `import("${pathToRoot}plugin/`)
        .replace(/import\(["']@\/types\//g, `import("${pathToRoot}types/`)
        .replace(/import\(["']@\/utils["']\)/g, `import("${pathToRoot}utils/index.js")`)
        .replace(/import\(["']@\/plugin["']\)/g, `import("${pathToRoot}plugin/index.js")`)
        .replace(/import\(["']@\/types["']\)/g, `import("${pathToRoot}types/index.js")`)
        .replace(/import\(["']@\/index["']\)/g, `import("${pathToRoot}index.js")`)
        .replace(/import\(["']@\/config["']\)/g, `import("${pathToRoot}config/index.js")`)
        .replace(/import\(["']@\/integrations["']\)/g, `import("${pathToRoot}integrations/index.js")`);
      
      // Also fix any remaining short imports that should point to index.js
      content = content
        .replace(/from\s+["']\.\/utils["']/g, `from "./utils/index.js"`)
        .replace(/from\s+["']\.\/plugin["']/g, `from "./plugin/index.js"`);
      
      // Add the correct extension to extensionless relative imports.
      // Directory-aware: a barrel import like './types' must resolve to
      // './types/index.js', a file import like './core/Strata' to
      // './core/Strata.js'. tsc has already emitted every .js by now, so we
      // resolve against the real dist files instead of blindly appending '.js'
      // (the previous naive appender produced a dead './types.js' that broke
      // type resolution for every TS consumer).
      const fileDir = path.dirname(filePath);
      const resolveRel = (importPath) => {
        if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
          return importPath;
        }
        const abs = path.resolve(fileDir, importPath);
        if (fs.existsSync(`${abs}.js`)) {
          return `${importPath}.js`;
        }
        if (fs.existsSync(path.join(abs, 'index.js'))) {
          return `${importPath.replace(/\/+$/, '')}/index.js`;
        }
        // Fall back to the legacy behavior if nothing matched on disk.
        return `${importPath}.js`;
      };
      content = content
        .replace(
          /from\s+["'](\.[^"']+)["']/g,
          (_match, p) => `from "${resolveRel(p)}"`,
        )
        .replace(
          /import\(["'](\.[^"']+)["']\)/g,
          (_match, p) => `import("${resolveRel(p)}")`,
        );
      
      fs.writeFileSync(filePath, content);
    }
  });
};

fixPathAliases(distDir);

// Copy the LICENSE so the build output carries its own licence notice.
// README.md is deliberately NOT copied: the root README is the published one,
// and a second copy inside dist/ only doubles the tarball's largest text file.
console.log('📄 Copying additional files...');
const filesToCopy = ['LICENSE'];
filesToCopy.forEach(file => {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
});

// Marker manifest for dist/ — NOT a package manifest.
//
// 🔴 It must NEVER carry `name` or `version`. A second manifest declaring
// `name: "strata-storage"` makes `cd dist && npm publish` succeed and ship the
// wrong tree under the real package name — the structural cause of the
// strata-storage@2.8.2 incident (published from a stale directory, sat as
// `latest` for 25 days). Without name+version, that publish fails immediately.
//
// The two fields below are the only ones that do any work: `type` pins the
// module format for the emitted .js files, and `sideEffects` keeps bundlers
// tree-shaking when a consumer deep-imports a file under dist/. Resolution is
// governed entirely by the root manifest's `exports` map.
console.log('📋 Writing dist module marker...');
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify({ type: 'module', sideEffects: false }, null, 2) + '\n'
);

console.log('✅ Build completed successfully!');
console.log(`📂 Output: ${distDir}`);
