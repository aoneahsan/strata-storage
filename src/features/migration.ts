/**
 * Migration utilities for storage upgrades
 */

import type { StorageAdapter } from '@/types';

export interface Migration {
  version: number;
  up: (adapter: StorageAdapter) => Promise<void>;
  down?: (adapter: StorageAdapter) => Promise<void>;
}

export class MigrationManager {
  private migrations: Migration[] = [];

  register(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async migrate(adapter: StorageAdapter, targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion(adapter);
    
    if (currentVersion === targetVersion) return;

    const migrationsToRun = this.migrations.filter(m => 
      currentVersion < targetVersion 
        ? m.version > currentVersion && m.version <= targetVersion
        : m.version <= currentVersion && m.version > targetVersion
    );

    if (currentVersion < targetVersion) {
      for (const migration of migrationsToRun) {
        await migration.up(adapter);
        await this.setVersion(adapter, migration.version);
      }
    } else {
      for (const migration of migrationsToRun.reverse()) {
        if (migration.down) {
          await migration.down(adapter);
        }
        await this.setVersion(adapter, migration.version - 1);
      }
    }
  }

  private async getCurrentVersion(adapter: StorageAdapter): Promise<number> {
    const versionData = await adapter.get<number>('__strata_version__');
    return versionData?.value || 0;
  }

  private async setVersion(adapter: StorageAdapter, version: number): Promise<void> {
    await adapter.set('__strata_version__', {
      value: version,
      created: Date.now(),
      updated: Date.now()
    });
  }
}