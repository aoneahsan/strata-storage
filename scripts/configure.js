#!/usr/bin/env node

/**
 * Strata Storage Configuration Script
 * Usage: npx strata-storage configure
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✖${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`)
};

// Configuration options
const frameworks = ['react', 'vue', 'angular', 'none'];
const platforms = ['web', 'ios', 'android', 'all'];
const features = {
  encryption: 'Enable encryption with Web Crypto API',
  compression: 'Enable LZ-string compression',
  sync: 'Enable cross-tab synchronization',
  ttl: 'Enable TTL (Time To Live) support',
  query: 'Enable advanced querying'
};

// Main configuration function
async function configure() {
  log.title('🗄️  Strata Storage Configuration');
  
  // Detect project type
  const projectInfo = detectProject();
  
  // Interactive prompts
  const config = await getConfiguration(projectInfo);
  
  // Generate configuration files
  await generateFiles(config);
  
  // Install dependencies if needed
  await installDependencies(config);
  
  // Show completion message
  showCompletion(config);
}

// Detect project type and structure
function detectProject() {
  const info = {
    hasPackageJson: false,
    hasTsConfig: false,
    framework: 'none',
    packageManager: 'npm',
    isCapacitor: false
  };
  
  // Check for package.json
  if (fs.existsSync('package.json')) {
    info.hasPackageJson = true;
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Detect framework
    if (pkg.dependencies?.react || pkg.devDependencies?.react) {
      info.framework = 'react';
    } else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
      info.framework = 'vue';
    } else if (pkg.dependencies?.['@angular/core'] || pkg.devDependencies?.['@angular/core']) {
      info.framework = 'angular';
    }
    
    // Detect Capacitor
    if (pkg.dependencies?.['@capacitor/core']) {
      info.isCapacitor = true;
    }
    
    // Detect package manager
    if (fs.existsSync('yarn.lock')) {
      info.packageManager = 'yarn';
    } else if (fs.existsSync('pnpm-lock.yaml')) {
      info.packageManager = 'pnpm';
    }
  }
  
  // Check for TypeScript
  if (fs.existsSync('tsconfig.json')) {
    info.hasTsConfig = true;
  }
  
  return info;
}

// Get configuration through prompts
async function getConfiguration(projectInfo) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
  
  const config = {
    framework: projectInfo.framework,
    platforms: [],
    features: {},
    typescript: projectInfo.hasTsConfig,
    packageManager: projectInfo.packageManager
  };
  
  log.info(`Detected: ${projectInfo.framework === 'none' ? 'Vanilla JS' : projectInfo.framework} project`);
  
  // Framework selection (if not detected)
  if (projectInfo.framework === 'none') {
    console.log('\nWhich framework are you using?');
    frameworks.forEach((f, i) => console.log(`  ${i + 1}) ${f}`));
    
    const frameworkChoice = await question('\nSelect framework (1-4): ');
    config.framework = frameworks[parseInt(frameworkChoice) - 1] || 'none';
  }
  
  // Platform selection
  console.log('\nWhich platforms will you target?');
  platforms.forEach((p, i) => console.log(`  ${i + 1}) ${p}`));
  
  const platformChoice = await question('\nSelect platform (1-4): ');
  const selectedPlatform = platforms[parseInt(platformChoice) - 1] || 'web';
  
  if (selectedPlatform === 'all') {
    config.platforms = ['web', 'ios', 'android'];
  } else {
    config.platforms = [selectedPlatform];
  }
  
  // Feature selection
  console.log('\nWhich features do you want to enable?');
  for (const [key, desc] of Object.entries(features)) {
    const enable = await question(`${desc}? (y/N): `);
    config.features[key] = enable.toLowerCase() === 'y';
  }
  
  // TypeScript
  if (!projectInfo.hasTsConfig) {
    const useTs = await question('\nUse TypeScript? (Y/n): ');
    config.typescript = useTs.toLowerCase() !== 'n';
  }
  
  rl.close();
  return config;
}

// Generate configuration files
async function generateFiles(config) {
  log.title('Generating configuration files...');
  
  // Create strata.config.js
  const configContent = generateConfigFile(config);
  fs.writeFileSync('strata.config.js', configContent);
  log.success('Created strata.config.js');
  
  // Create TypeScript declaration if needed
  if (config.typescript) {
    const dtsContent = generateTypeDeclaration();
    fs.writeFileSync('strata.d.ts', dtsContent);
    log.success('Created strata.d.ts');
  }
  
  // Create example file
  const exampleContent = generateExampleFile(config);
  const examplePath = `strata.example.${config.typescript ? 'ts' : 'js'}`;
  fs.writeFileSync(examplePath, exampleContent);
  log.success(`Created ${examplePath}`);
  
  // Update .gitignore
  updateGitignore();
}

// Generate config file content
function generateConfigFile(config) {
  const enabledFeatures = Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);
  
  return `/**
 * Strata Storage Configuration
 * Generated by: npx strata-storage configure
 */

${config.typescript ? "import type { StrataConfig } from 'strata-storage';\n" : ''}
${config.typescript ? 'const config: StrataConfig' : 'module.exports'} = {
  // Default storage types in order of preference
  defaultStorages: [${config.platforms.includes('web') ? "'indexedDB', 'localStorage'" : "'preferences', 'sqlite'"}, 'memory'],
  
  // Platform configuration
  platform: '${config.platforms[0]}',
  
  // Feature flags
  ${enabledFeatures.includes('encryption') ? `encryption: {
    enabled: true,
    algorithm: 'AES-GCM',
    keyDerivation: {
      algorithm: 'PBKDF2',
      iterations: 100000,
      salt: 32,
      hash: 'SHA-256'
    }
  },` : '// encryption: { enabled: false },'}
  
  ${enabledFeatures.includes('compression') ? `compression: {
    enabled: true,
    threshold: 1024, // Only compress if larger than 1KB
    level: 6
  },` : '// compression: { enabled: false },'}
  
  ${enabledFeatures.includes('sync') ? `sync: {
    enabled: true,
    debounce: 100,
    broadcastChannel: 'strata-sync'
  },` : '// sync: { enabled: false },'}
  
  ${enabledFeatures.includes('ttl') ? `ttl: {
    defaultTTL: 3600000, // 1 hour
    cleanupInterval: 60000, // 1 minute
    autoCleanup: true
  },` : '// ttl: { autoCleanup: false },'}
  
  // Adapter-specific configurations
  adapters: {
    indexedDB: {
      database: 'strata-storage',
      version: 1
    },
    sqlite: {
      database: 'strata.db',
      location: 'default'
    },
    filesystem: {
      directory: 'strata-data',
      encoding: 'utf8'
    }
  }
};

${config.typescript ? 'export default config;' : ''}`;
}

// Generate TypeScript declaration
function generateTypeDeclaration() {
  return `/// <reference types="strata-storage" />

declare module 'strata-storage' {
  // Additional type declarations if needed
}`;
}

// Generate example file
function generateExampleFile(config) {
  const imports = config.framework === 'react' 
    ? "import { StrataProvider, useStorage } from 'strata-storage/react';"
    : config.framework === 'vue'
    ? "import { useStorage } from 'strata-storage/vue';"
    : config.framework === 'angular'
    ? "import { StrataService } from 'strata-storage/angular';"
    : "import { Strata } from 'strata-storage';";
  
  const example = config.framework === 'react' ? `
// React Example
function App() {
  return (
    <StrataProvider config={config}>
      <UserProfile />
    </StrataProvider>
  );
}

function UserProfile() {
  const [user, setUser, loading] = useStorage('user', { name: 'Guest' });
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Hello, {user?.name}!</h1>
      <button onClick={() => setUser({ name: 'John' })}>
        Update Name
      </button>
    </div>
  );
}` : config.framework === 'vue' ? `
// Vue Example
export default {
  setup() {
    const { value: user, update } = useStorage('user', { name: 'Guest' });
    
    const updateName = () => {
      update({ name: 'John' });
    };
    
    return { user, updateName };
  }
}` : config.framework === 'angular' ? `
// Angular Example
@Component({
  selector: 'app-user',
  template: \`
    <h1>Hello, {{ (user$ | async)?.name || 'Guest' }}!</h1>
    <button (click)="updateName()">Update Name</button>
  \`
})
export class UserComponent {
  user$ = this.strata.watch<{ name: string }>('user');
  
  constructor(private strata: StrataService) {}
  
  updateName() {
    this.strata.set('user', { name: 'John' }).subscribe();
  }
}` : `
// Vanilla JS Example
const storage = new Strata(config);

// Initialize
await storage.initialize();

// Store data
await storage.set('user', { name: 'John' });

// Retrieve data
const user = await storage.get('user');
console.log(user); // { name: 'John' }

// Subscribe to changes
storage.subscribe((change) => {
  console.log('Storage changed:', change);
});`;
  
  return `/**
 * Strata Storage Example
 */

${imports}
import config from './strata.config${config.typescript ? '' : '.js'}';
${example}`;
}

// Update .gitignore
function updateGitignore() {
  const gitignorePath = '.gitignore';
  const entries = [
    '# Strata Storage',
    'strata-data/',
    '*.db',
    '*.db-journal'
  ];
  
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const hasStrata = content.includes('# Strata Storage');
    
    if (!hasStrata) {
      fs.appendFileSync(gitignorePath, '\n' + entries.join('\n') + '\n');
      log.success('Updated .gitignore');
    }
  } else {
    fs.writeFileSync(gitignorePath, entries.join('\n') + '\n');
    log.success('Created .gitignore');
  }
}

// Install dependencies
async function installDependencies(config) {
  log.title('Installing dependencies...');
  
  const deps = ['strata-storage'];
  
  // Add platform-specific dependencies
  if (config.platforms.includes('ios') || config.platforms.includes('android')) {
    deps.push('@capacitor/core');
  }
  
  // Install command
  const command = config.packageManager === 'yarn' 
    ? `yarn add ${deps.join(' ')}`
    : config.packageManager === 'pnpm'
    ? `pnpm add ${deps.join(' ')}`
    : `npm install ${deps.join(' ')}`;
  
  try {
    log.info(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    log.success('Dependencies installed');
  } catch (error) {
    log.error('Failed to install dependencies');
    log.info(`Please run: ${command}`);
  }
}

// Show completion message
function showCompletion(config) {
  log.title('✨ Configuration complete!');
  
  console.log('Next steps:\n');
  
  if (config.framework === 'react') {
    console.log('1. Import StrataProvider in your App component');
    console.log('2. Wrap your app with <StrataProvider config={config}>');
    console.log('3. Use hooks like useStorage() in your components');
  } else if (config.framework === 'vue') {
    console.log('1. Install the plugin: app.use(StrataPlugin, config)');
    console.log('2. Use composables like useStorage() in your components');
  } else if (config.framework === 'angular') {
    console.log('1. Import StrataModule.forRoot(config) in AppModule');
    console.log('2. Inject StrataService in your components');
  } else {
    console.log('1. Import and initialize Strata with your config');
    console.log('2. Use storage.set() and storage.get() methods');
  }
  
  console.log('\nSee strata.example.* for a complete example.');
  console.log('\nDocumentation: https://github.com/aoneahsan/strata-storage');
}

// Run configuration
configure().catch((error) => {
  log.error('Configuration failed:');
  console.error(error);
  process.exit(1);
});