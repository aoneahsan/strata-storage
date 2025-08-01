#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Strata Storage - Zero Dependencies, Infinite Possibilities!\n');

// Check if this is a Capacitor project
const capacitorConfigPaths = [
  'capacitor.config.json',
  'capacitor.config.ts',
  'capacitor.config.js'
];

const isCapacitorProject = capacitorConfigPaths.some(configPath => 
  fs.existsSync(path.join(process.cwd(), configPath))
);

if (isCapacitorProject) {
  console.log('📱 Capacitor project detected!');
  console.log('   Run "npx cap sync" to sync native code\n');
} else {
  console.log('🌐 Web project detected!');
  console.log('   Strata works perfectly in web-only projects too!\n');
}

console.log('📚 Quick Start:');
console.log('   import { Strata } from "strata-storage";');
console.log('   const storage = new Strata();');
console.log('   await storage.set("key", "value");\n');

console.log('📖 Documentation: https://github.com/aoneahsan/strata-storage');
console.log('⭐ Star us on GitHub: https://github.com/aoneahsan/strata-storage\n');