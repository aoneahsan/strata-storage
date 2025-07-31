#!/usr/bin/env node

/**
 * Strata Storage CLI
 * Main entry point for npx commands
 */

const path = require('path');
const { spawn } = require('child_process');

// Get command from arguments
const command = process.argv[2];

// Available commands
const commands = {
  configure: 'configure.js',
  init: 'configure.js',
  setup: 'configure.js'
};

// Show help if no command
if (!command || command === '--help' || command === '-h') {
  console.log(`
🗄️  Strata Storage CLI

Usage: npx strata-storage <command>

Commands:
  configure    Interactive configuration wizard
  init         Alias for configure
  setup        Alias for configure
  --help       Show this help message

Examples:
  npx strata-storage configure
  npx strata-storage init

Documentation: https://github.com/aoneahsan/strata-storage
`);
  process.exit(0);
}

// Check if command exists
const scriptFile = commands[command];
if (!scriptFile) {
  console.error(`Unknown command: ${command}`);
  console.log('Run "npx strata-storage --help" for available commands.');
  process.exit(1);
}

// Run the command
const scriptPath = path.join(__dirname, scriptFile);
const child = spawn('node', [scriptPath, ...process.argv.slice(3)], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});