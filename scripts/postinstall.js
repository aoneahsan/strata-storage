#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Strata Storage - Zero Dependencies, Infinite Possibilities!\n');

console.log('📚 Quick Start:');
console.log('   import { Strata } from "strata-storage";');
console.log('   const storage = new Strata();');
console.log('   await storage.initialize();');
console.log('   await storage.set("key", "value");\n');

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
  console.log('📱 Capacitor Support Available (Optional):');
  console.log('   import { registerCapacitorAdapters } from "strata-storage/capacitor";');
  console.log('   await registerCapacitorAdapters(storage);');
  console.log('   Run "yarn cap sync" to sync native code\n');
}

console.log('✨ Features:');
console.log('   • Works everywhere - Web, Node.js, Mobile');
console.log('   • Zero runtime dependencies');
console.log('   • Optional Capacitor integration');
console.log('   • Built-in encryption & compression');
console.log('   • Cross-tab synchronization\n');

console.log('📖 Documentation: https://stratastorage-docs.aoneahsan.com');
console.log('🤖 For AI agents:  https://stratastorage-docs.aoneahsan.com/ai');
console.log('🌐 Website:        https://stratastorage.aoneahsan.com\n');
