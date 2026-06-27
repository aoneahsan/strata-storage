#!/usr/bin/env node
/**
 * Generate static/llms-full.txt — the entire docs content concatenated into a
 * single file for one-shot LLM ingestion (served at /llms-full.txt).
 *
 * Walks docs/ recursively, strips YAML frontmatter, and prepends each page with
 * its title + canonical URL. The `build` script runs this first
 * (`node scripts/generate-llms-full.js && docusaurus build`) so it never goes
 * stale — a plain `prebuild` hook does NOT fire under Yarn 4 (Berry).
 */
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://stratastorage-docs.aoneahsan.com';
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUT_FILE = path.join(__dirname, '..', 'static', 'llms-full.txt');

/** Recursively collect .md/.mdx files, sorted for deterministic output. */
function collect(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (/\.mdx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Strip a leading YAML frontmatter block and return { frontmatter, body }. */
function splitFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontmatter: '', body: src };
  return { frontmatter: m[1], body: src.slice(m[0].length) };
}

function frontmatterField(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

/** Map a docs file path to its site route. */
function routeFor(file, fm) {
  const slug = frontmatterField(fm, 'slug');
  if (slug) return slug === '/' ? '/' : slug;
  let rel = path.relative(DOCS_DIR, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
  rel = rel.replace(/\/(README|index)$/i, '');
  if (rel === 'README' || rel === 'index' || rel === 'intro') return '/';
  return '/' + rel;
}

function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

const files = collect(DOCS_DIR);
const parts = [];
parts.push(
  '# Strata Storage — full documentation (for LLMs)\n\n' +
    'Zero-dependency universal storage library and Capacitor plugin. One unified\n' +
    'async/sync API across web, Android, iOS, and optional Firebase. This file is the\n' +
    'entire documentation site concatenated for one-shot ingestion. Canonical site:\n' +
    `${SITE_URL}  ·  Index: ${SITE_URL}/llms.txt  ·  Package: https://www.npmjs.com/package/strata-storage\n`,
);

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const { frontmatter, body } = splitFrontmatter(src);
  const title = frontmatterField(frontmatter, 'title') || firstHeading(body) || path.basename(file);
  const route = routeFor(file, frontmatter);
  parts.push(
    '\n\n' +
      '================================================================================\n' +
      `# ${title}\n` +
      `URL: ${SITE_URL}${route}\n` +
      '================================================================================\n\n' +
      body.trim() +
      '\n',
  );
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, parts.join(''), 'utf8');
console.log(`Wrote ${OUT_FILE} (${files.length} pages, ${(fs.statSync(OUT_FILE).size / 1024).toFixed(1)} KB)`);
