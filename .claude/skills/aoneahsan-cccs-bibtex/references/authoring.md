# Authoring a `.bib` file — full reference

Depth behind `SKILL.md`. Read when generating a corpus, debugging an import, or extending the field set.

## Field reference for a software work

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | `{{Product Name}}: Plain Descriptor`. Inner braces are **case protection** — without them a style may render `ZTools` as `Ztools`. |
| `author` | ✅ | `{Mahmood, Ahsan}`. The `Last, First` form removes all surname ambiguity. Multiple authors are joined with ` and `, never a comma. |
| `year` | ✅ | Real first-release year. Never today's. |
| `url` | ✅ | The single main link. Bare, unescaped, no trailing slash unless the site needs one. |
| `howpublished` | | Free text describing the form: "Web application, Android application and Chrome extension". |
| `note` | | The catch-all ORCID keeps in the citation: work class, author, ORCID iD, live distribution channels, portfolio link. |
| `keywords` | | Comma-separated. Reuse the same terms as the ORCID profile's keyword list. |
| `doi` | | **Only if one genuinely exists.** Never fabricate one. If it exists, prefer the Zenodo/DOI route and drop the entry from the corpus. |
| `version` | | Optional; ORCID's BibTeX importer largely ignores it, and it goes stale. Prefer omitting it. |

## Escaping

BibTeX inherits LaTeX's special characters. Escape these **everywhere**, including inside `note`:

| Character | Write as |
|---|---|
| `&` | `\&` |
| `%` | `\%` |
| `$` | `\$` |
| `#` | `\#` |
| `_` | `\_` |
| `\` | `\textbackslash{}` |

`{` and `}` are structural — they must balance. An unbalanced brace silently swallows the rest of the file.

**Do not escape the `url` field.** URLs containing `%` or `_` are the one place raw characters are expected;
escaping them breaks the link. Keep URLs simple enough that this never bites.

### The encoding trap

ORCID imports data exactly as encoded and *"special characters may not import properly."* Non-ASCII therefore
does not merely look wrong — it can corrupt a title on a permanent public record.

Banned in every field: en/em dashes (`–` `—`), curly quotes (`'` `"`), arrows (`→`), ellipsis (`…`),
multiplication sign (`×`), accented letters, emoji.

Write `--` for a dash, `"` for a quote, `->` for an arrow. Verify:

```bash
python3 -c "
import glob,sys
for f in glob.glob('*.bib'):
    try: open(f,'rb').read().decode('ascii')
    except UnicodeDecodeError as e: print('NON-ASCII:',f,e); sys.exit(1)
print('ascii ok')"
```

## Citation keys

`aoneahsan-<slug>-<year>` — lowercase, hyphenated, no spaces or dots.

The key is the **identity of the work across imports.** ORCID matches on it, so:

- The same key re-imported **updates** the existing work.
- A changed key creates a **second** work; the old one does not disappear.
- Therefore: once a key has been imported, it is frozen. If a project's release year is later corrected, keep
  the original key and fix only the `year` field.

## File layout

```
orcid-project-projects-files/
  <slug>.bib              # one entry — the regeneration unit
  aoneahsan-all-works.bib # every entry — the single import
  README.md               # what the corpus is, the contract, how to regenerate
  MANUAL-TASKS.md         # owner-only: import, then retype each work
```

Both layers exist deliberately: the combined file makes import one action, and the per-project files make a
failure trivially isolatable and give each project something to point at from its own `CLAUDE.md`.

**The combined file is derived.** Regenerate it in the same edit as any `<slug>.bib` change.

## Generation recipe

Generate, never hand-write, so 23 entries cannot drift apart in style:

1. Read each project's portfolio-info file for title wording and keywords.
2. Read `project-live-urls.json` for candidate URLs.
3. Get the year: `git -C <dir> log --reverse --format=%ad --date=format:%Y | head -1`, or for a package
   `curl -s https://registry.npmjs.org/<pkg> | python3 -c "import sys,json;print(json.load(sys.stdin)['time']['created'][:4])"`.
4. **Probe every URL sequentially with a delay** — a parallel burst returns spurious `000`s.
5. Emit the per-project files and the combined file in one pass.
6. Run the verification block below.

## Verification

```bash
# structure: braces balanced, keys unique, required fields present
python3 - <<'EOF'
import re,glob,collections
keys=[]
for f in sorted(glob.glob('*.bib')):
    body=re.sub(r'^%.*$','',open(f,encoding='utf-8').read(),flags=re.M)
    assert body.count('{')==body.count('}'), f'brace mismatch: {f}'
    for typ,k in re.findall(r'@(\w+)\{([^,]+),',body):
        if f!='aoneahsan-all-works.bib': keys.append(k)
    for req in ('title','author','year','url'):
        assert re.search(rf'^\s*{req}\s*=',body,re.M), f'missing {req}: {f}'
d=[k for k,c in collections.Counter(keys).items() if c>1]
print('entries',len(keys),'unique',len(set(keys)),'dupes',d or 'none')
EOF
```

Then the ASCII check above, then the URL probe. All three pass before anything is imported.

## Common failures

| Symptom | Cause |
|---|---|
| Import silently does nothing | Unbalanced brace swallowed the file. Check `{` vs `}` count. |
| Titles show `Ã©` or `â€"` | Non-ASCII made it in. Re-run the ASCII check. |
| Duplicate works after a re-import | A citation key changed between imports. |
| Large file fails, halves succeed | The 50+-entry ceiling. Split, or import per-project files. |
| Work type is *Other*, not *Software* | Expected — no entry type produces *Software*. Retype in the UI. |
| A url 404s after import | It was never probed, or was copied from a stale data file. |
