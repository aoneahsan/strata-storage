#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Strata Storage — one storage API across web, iOS and Android.\n');

// Keep this snippet identical to the README's Quick Start. `new Strata()` +
// `initialize()` still works, but the default instance is the documented entry
// point and needs no setup call.
console.log('📚 Quick Start:');
console.log('   import { storage } from "strata-storage";');
console.log('   await storage.set("key", "value");');
console.log('   const value = await storage.get("key");\n');

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
  console.log('📱 Capacitor project detected — native setup is REQUIRED:');
  console.log('   npx cap sync    ← without this the native adapters fail on device');
  console.log('');
  console.log('   import { registerCapacitorAdapters } from "strata-storage/capacitor";');
  console.log('   await registerCapacitorAdapters(storage);\n');
}

console.log('✨ Features:');
console.log('   • One API over 11 storage backends');
console.log('   • Zero runtime dependencies');
console.log('   • Optional React / Vue / Angular / Capacitor / Firebase bindings');
console.log('   • Opt-in encryption, compression, TTL and integrity checks');
console.log('   • Cross-tab synchronization\n');

console.log('📖 Documentation: https://stratastorage-docs.aoneahsan.com');
console.log('🤖 For AI agents:  https://stratastorage-docs.aoneahsan.com/ai');
console.log('🌐 Website:        https://stratastorage.aoneahsan.com\n');
