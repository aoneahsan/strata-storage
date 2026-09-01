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

// ---------------------------------------------------------------------------
// Build gates
//
// This project deliberately ships no test framework — typecheck, lint and build
// are the gates (README ▸ Limitations). These two checks live inside the build
// for that reason: they add no dependency and no runner, and they cover exactly
// the two things the other gates are blind to.
// ---------------------------------------------------------------------------

const fail = (message) => {
  console.error(`\n❌ ${message}`);
  process.exit(1);
};

// GATE 1 — the storage-ownership predicate.
//
// `isStorageEnvelope` decides whether a key in a SHARED storage area belongs to
// this library. Get it wrong in the permissive direction and we are back to
// reading, error-logging about, and deleting other applications' data (ISSUE-01,
// ISSUE-09); wrong in the strict direction and we stop recognising our own.
// Neither failure is visible to typecheck, lint or a green build.
console.log('🔍 Gate: storage-ownership predicate...');
const { isStorageEnvelope } = await import(
  new URL('../dist/utils/index.js', import.meta.url).href
);

const envelope = (extra = {}) => ({ value: 'v', created: 1, updated: 2, ...extra });
const OWNERSHIP_CASES = [
  // Foreign values seen in the wild — every one of these reached logger.error
  // before 2.9.0. `ts3hsf` is Microsoft Clarity's `_cltk`; `warn` is a consumer
  // logger's own level key.
  ['clarity _cltk raw string', 'ts3hsf', false],
  ['logger-level raw string', 'warn', false],
  ['foreign JSON object', { a: 1 }, false],
  ['foreign JSON array', [1, 2, 3], false],
  ['foreign object carrying a value key', { value: 'v' }, false],
  ['null', null, false],
  ['undefined', undefined, false],
  ['number', 42, false],
  ['string', 'plain', false],
  // Near-misses: shaped like ours but not written by us.
  ['envelope missing created', { value: 'v', updated: 2 }, false],
  ['envelope with non-numeric updated', { value: 'v', created: 1, updated: 'x' }, false],
  ['envelope with NaN created', { value: 'v', created: NaN, updated: 2 }, false],
  ['envelope with non-numeric expires', envelope({ expires: 'soon' }), false],
  // Ours, in every shape a write path produces.
  ['plain envelope', envelope(), true],
  ['envelope holding null', envelope({ value: null }), true],
  ['envelope with expires', envelope({ expires: Date.now() }), true],
  ['envelope with tags + metadata', envelope({ tags: ['a'], metadata: { b: 1 } }), true],
  ['envelope with created 0', { value: 'v', created: 0, updated: 0 }, true],
];

const ownershipFailures = OWNERSHIP_CASES.filter(
  ([, input, expected]) => isStorageEnvelope(input) !== expected
).map(([name, , expected]) => `  · ${name}: expected ${expected}, got ${!expected}`);

if (ownershipFailures.length > 0) {
  fail(
    `Storage-ownership predicate is wrong in ${ownershipFailures.length} case(s):\n` +
      ownershipFailures.join('\n')
  );
}
console.log(`   ✓ ${OWNERSHIP_CASES.length} ownership cases`);

// GATE 2 — the README's version row cannot drift from package.json.
//
// The row is a hand-maintained duplicate of `version`, so it goes stale the
// moment the version is bumped — it has already shipped stale once (2.8.5), and
// three in-repo files disagreeing about the current version is ISSUE-06. This
// asserts on the ARTEFACT that npm actually renders, not on the release process
// that is supposed to update it.
console.log('🔍 Gate: README version row matches package.json...');
const pkgVersion = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
).version;
const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
const versionRow = readme.match(/^\|\s*\*\*Version\*\*\s*\|\s*`([^`]+)`/m);

if (!versionRow) {
  fail(
    'README has no at-a-glance `| **Version** | `x.y.z` |` row, so nothing pins the ' +
      'published version claim. Restore the row rather than removing this gate.'
  );
}
if (versionRow[1] !== pkgVersion) {
  fail(
    `README version row says \`${versionRow[1]}\` but package.json says \`${pkgVersion}\`. ` +
      'Update the README row — npm renders it verbatim on the package page.'
  );
}
console.log(`   ✓ README version row is ${pkgVersion}`);

console.log('✅ Build completed successfully!');
console.log(`📂 Output: ${distDir}`);
