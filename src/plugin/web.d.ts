/**
 * Strata Storage Web Implementation
 * Web platform implementation of the Capacitor plugin
 */
import type { StrataStoragePlugin, NativeStorageType, NativeGetOptions, NativeSetOptions, NativeRemoveOptions, NativeClearOptions, NativeKeysOptions, NativeSizeOptions, NativeSizeResult } from './definitions';
import type { StorageValue } from '@/types';
export declare class StrataStorageWeb implements StrataStoragePlugin {
    isAvailable(_options: {
        storage: NativeStorageType;
    }): Promise<{
        available: boolean;
    }>;
    get(_options: NativeGetOptions): Promise<{
        value: StorageValue | null;
    }>;
    set(_options: NativeSetOptions): Promise<void>;
    remove(_options: NativeRemoveOptions): Promise<void>;
    clear(_options: NativeClearOptions): Promise<void>;
    keys(_options: NativeKeysOptions): Promise<{
        keys: string[];
    }>;
    size(_options: NativeSizeOptions): Promise<NativeSizeResult>;
}
//# sourceMappingURL=web.d.ts.map