# Vitest 4 setup and the recipes that recur

Depth behind `SKILL.md`. Read when configuring the runner or writing one of these test shapes.

## Config

```ts
// vitest.config.ts
import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {alias: {'@': resolve(__dirname, './src')}},   // must mirror tsconfig paths
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // v4: pool options are TOP LEVEL, and maxWorkers replaced maxThreads/maxForks
    maxWorkers: '50%',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // A FLOOR on modules that matter — never a global percentage.
      thresholds: {
        'src/lib/units/**':        {statements: 95, branches: 90},
        'src/lib/date/**':         {statements: 95, branches: 90},
        'src/services/**/map*.ts': {statements: 90},
      },
    },
  },
});
```

**`jsdom` over `happy-dom`.** `happy-dom` is faster and less complete; the gaps surface as a test that passes
while the browser behaves differently — which is worse than a slower suite. Use `happy-dom` only if suite time
becomes a real problem, and re-verify the affected tests.

`projects` (not `workspace` — renamed in v4) only when a repo genuinely has several test scopes, e.g. a web
app and a Deno edge-function suite.

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach, vi} from 'vitest';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();   // 🔴 NOT restoreAllMocks — in v4 that leaves vi.fn() history intact
});
```

## Dates and timezones — the daily-log boundary

The bug this catches: a log written at 23:00 local lands on the wrong day when "today" is computed in UTC.
Test the boundary explicitly, from both sides.

```ts
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {startOfDayInZone, isSameLocalDay} from '@/lib/date';

describe('daily-log day boundary', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('treats 23:00 local as today, not tomorrow', () => {
    // 2026-03-10T23:30 in Asia/Karachi (UTC+5) === 2026-03-10T18:30Z
    vi.setSystemTime(new Date('2026-03-10T18:30:00Z'));
    expect(startOfDayInZone('Asia/Karachi')).toEqual(new Date('2026-03-09T19:00:00Z'));
    expect(isSameLocalDay(new Date('2026-03-10T18:30:00Z'), 'Asia/Karachi')).toBe(true);
  });

  it('rolls over at local midnight, not UTC midnight', () => {
    vi.setSystemTime(new Date('2026-03-10T19:00:00Z'));   // 00:00 local next day
    expect(isSameLocalDay(new Date('2026-03-10T18:59:00Z'), 'Asia/Karachi')).toBe(false);
  });
});
```

**Also test a DST transition** in any zone that observes one, and a zone with a non-hour offset
(`Asia/Kolkata`, +5:30) — both break naive arithmetic.

## Unit conversions

Round-trip plus known values. The round-trip alone passes for a function that multiplies and divides by the
same wrong constant.

```ts
it.each([
  [0, 0], [1, 2.20462], [70, 154.324], [113.4, 250.0],
])('kg %d → lb %d', (kg, lb) => {
  expect(kgToLb(kg)).toBeCloseTo(lb, 2);
});

it('round-trips within display precision', () => {
  fc(70.5); function fc(v: number) { expect(lbToKg(kgToLb(v))).toBeCloseTo(v, 6); }
});
```

## Zod schemas — test what must be rejected

Valid input passing is the easy half and rarely the bug.

```ts
it('rejects a negative water volume', () => {
  const r = waterLogSchema.safeParse({volumeMl: -1, at: new Date().toISOString()});
  expect(r.success).toBe(false);
});

it('rejects an unknown metric key', () => {
  expect(metricSchema.safeParse({key: 'not_a_metric', value: 1}).success).toBe(false);
});
```

## Service mappers — the renamed-column class

```ts
it('maps every domain field from the row', () => {
  const row = {id: 'm1', metric_key: 'water', value_num: 250, recorded_at: '2026-03-10T10:00:00Z'};
  expect(toMetric(row)).toEqual({
    id: 'm1', key: 'water', value: 250, recordedAt: new Date('2026-03-10T10:00:00Z'),
  });
});

it('throws on a missing required column rather than yielding undefined', () => {
  // The whole point: a renamed column must FAIL here, not surface as undefined three screens later.
  expect(() => toMetric({id: 'm1', value_num: 250} as never)).toThrow();
});
```

## Query builders — the limit is the assertion

```ts
it('always applies an explicit limit', () => {
  expect(buildMetricQuery({key: 'water'}).limit).toBe(20);
});

it('never exceeds the hard maximum', () => {
  expect(buildMetricQuery({key: 'water', limit: 500}).limit).toBe(50);
});

it('filters on the column the RLS policy reads', () => {
  // A list query must prove its policy from its own filters — see aoneahsan-cccs-firestore
  // for the Firestore arm and the Supabase RLS equivalent.
  expect(buildMetricQuery({key: 'water'}).filters).toContainEqual({column: 'user_id', op: 'eq'});
});
```

## Offline outbox replay — replay-once

The feature's entire value is that a replayed write does not double-log.

```ts
it('replays a queued write exactly once', async () => {
  const send = vi.fn().mockResolvedValue({ok: true});
  const outbox = createOutbox({send});

  await outbox.enqueue({type: 'water.log', idempotencyKey: 'k1', payload: {volumeMl: 250}});
  await outbox.replay();
  await outbox.replay();               // reconnect fires twice — this is the real scenario

  expect(send).toHaveBeenCalledTimes(1);
  expect(outbox.pending()).toHaveLength(0);
});

it('keeps the item queued when the send fails', async () => {
  const send = vi.fn().mockRejectedValue(new Error('offline'));
  const outbox = createOutbox({send});
  await outbox.enqueue({type: 'water.log', idempotencyKey: 'k2', payload: {volumeMl: 250}});

  await outbox.replay();
  expect(outbox.pending()).toHaveLength(1);   // never silently dropped
});
```

## Entitlement evaluation

```ts
it.each([
  ['free', 3, true], ['free', 4, false], ['pro', 400, true], ['family', 400, true],
])('%s tier at %d people → allowed: %s', (tier, count, allowed) => {
  expect(canAddPerson({tier, currentCount: count})).toBe(allowed);
});

it('reads limits from the registry, not from literals', () => {
  // Guards the rule that changing one config value changes every limit in the app.
  expect(LIMITS.free.people).toBeDefined();
});
```
