// Optional Capacitor support - only import this if you need Capacitor adapters
import type { Strata } from './core/Strata';
import { PreferencesAdapter } from './adapters/capacitor/PreferencesAdapter';
import { SqliteAdapter } from './adapters/capacitor/SqliteAdapter';
import { SecureAdapter } from './adapters/capacitor/SecureAdapter';
import { FilesystemAdapter } from './adapters/capacitor/FilesystemAdapter';

// Export Capacitor adapters
export { PreferencesAdapter } from './adapters/capacitor/PreferencesAdapter';
export { SqliteAdapter } from './adapters/capacitor/SqliteAdapter';
export { SecureAdapter } from './adapters/capacitor/SecureAdapter';
export { FilesystemAdapter } from './adapters/capacitor/FilesystemAdapter';

// Export the plugin for direct access if needed
export { StrataStorage } from './plugin';

/**
 * Register Capacitor adapters with a Strata instance
 * This is completely optional and only needed for Capacitor apps
 */
export async function registerCapacitorAdapters(storage: Strata): Promise<void> {
  // Check if Capacitor is available
  const hasCapacitor =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  if (!hasCapacitor) {
    console.warn('Capacitor not detected. Capacitor adapters will not be registered.');
    return;
  }

  // Register Capacitor adapters
  storage.registerAdapter(new PreferencesAdapter());
  storage.registerAdapter(new SqliteAdapter());
  storage.registerAdapter(new SecureAdapter());
  storage.registerAdapter(new FilesystemAdapter());

  // Re-initialize to make new adapters available
  if (storage.isInitialized) {
    await storage.initialize();
  }
}

/**
 * Helper to check if running in Capacitor environment
 */
export function isCapacitorEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform()
  );
}

/**
 * Get Capacitor-specific storage types
 */
export function getCapacitorStorageTypes(): string[] {
  return ['preferences', 'sqlite', 'secure', 'filesystem'];
}
