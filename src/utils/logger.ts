/**
 * Internal logger for Strata Storage.
 *
 * A library must never spam the consumer's console, so every diagnostic message
 * routes through this single, level-gated logger instead of calling `console.*`
 * directly. It deliberately does NOT patch the global `console` (that would be
 * hostile to consumers) — it only forwards to it when the level allows.
 *
 * Default level is `warn`: warnings and errors surface (they signal real
 * problems), while `debug`/`info` stay quiet. Raise verbosity with
 * `new Strata({ debug: true })`, `setLogLevel('debug')`, or — in a browser
 * devtools session — `globalThis.__strataSetLogLevel('debug')`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const PREFIX = '[strata-storage]';

let currentLevel: LogLevel = 'warn';

/** Set the global log level for all Strata diagnostic output. */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/** Get the current global log level. */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

function isEnabled(level: Exclude<LogLevel, 'silent'>): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

/* eslint-disable no-console -- this module is the single sanctioned console boundary */
export const logger = {
  debug(...args: unknown[]): void {
    if (isEnabled('debug')) console.debug(PREFIX, ...args);
  },
  info(...args: unknown[]): void {
    if (isEnabled('info')) console.info(PREFIX, ...args);
  },
  warn(...args: unknown[]): void {
    if (isEnabled('warn')) console.warn(PREFIX, ...args);
  },
  error(...args: unknown[]): void {
    if (isEnabled('error')) console.error(PREFIX, ...args);
  },
};
/* eslint-enable no-console */

/**
 * Expose runtime log-level controls on the global scope for devtools use.
 * Call once (e.g. from a Strata instance) — never auto-invoked at module load
 * so the package stays free of import-time side effects (`sideEffects: false`).
 */
export function exposeLogLevelControls(): void {
  const scope = globalThis as typeof globalThis & {
    __strataSetLogLevel?: (level: LogLevel) => void;
    __strataGetLogLevel?: () => LogLevel;
  };
  scope.__strataSetLogLevel = setLogLevel;
  scope.__strataGetLogLevel = getLogLevel;
}
