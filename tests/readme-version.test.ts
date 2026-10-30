/**
 * The README's at-a-glance version row is a hand-kept copy of `package.json`'s version, and npm renders it verbatim on
 * the package page. It shipped stale once (2.8.5), and three in-repo files disagreeing was ISSUE-06, so the artefact
 * npm shows is asserted, not the release process meant to update it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string): string => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

describe('README version row', () => {
  it('matches package.json', () => {
    const { version } = JSON.parse(read('package.json')) as { version: string };
    const row = read('README.md').match(/^\|\s*\*\*Version\*\*\s*\|\s*`([^`]+)`/m);
    expect(row, 'README lost its `| **Version** | `x.y.z` |` row; restore it').not.toBeNull();
    expect(row?.[1]).toBe(version);
  });
});
