# 🌐 Lint i18n

> Structural linting for flat-key i18n JSON files

[![License](https://img.shields.io/github/license/readpato/lint-i18n)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/readpato/lint-i18n/ci.yml?branch=main&label=CI)](https://github.com/readpato/lint-i18n/actions)

## Why Lint i18n?

- 🔍 **Catches namespace conflicts** — detects keys that are both a value and a prefix
- 🛡️ **Validates value types** — rejects numbers, booleans, arrays, objects, and `null`
- 📝 **Inline PR annotations** — errors appear on the exact line in pull request reviews
- 📌 **Line-number precision** — pinpoints issues without searching through files
- 📂 **Recursive scanning** — finds every `.json` file under your locale directory
- ⚡ **Zero config** — just point it at your locale folder and go

## Checks

| Check | Severity | Behavior |
|-------|----------|----------|
| Namespace conflict | Error (fails) | A key like `"expand"` is both a value and a prefix of `"expand.all"` |
| Invalid value type | Error (fails) | Values must be strings — numbers, booleans, arrays, objects, and `null` are rejected |
| No files found | Error (fails) | No `.json` files exist under the given `path` |
| Invalid JSON | Warning (skipped) | File contains malformed JSON that cannot be parsed |
| Non-object JSON | Warning (skipped) | File parses to an array, string, or other non-object type |
| Empty object | Warning (skipped) | File parses to `{}` with no translation keys |

## Quick Start

```yaml
name: Lint i18n

on:
  pull_request:
    paths:
      - 'src/locales/**'

jobs:
  lint-i18n:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: readpato/lint-i18n@v1
        with:
          path: src/locales
```

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Path to the i18n directory. All `.json` files are scanned recursively at any depth. |

## Outputs

| Output | Description |
|--------|-------------|
| `total-files-analyzed` | Total JSON files found (including skipped files) |

## Flat-key format

This action expects **flat-key** locale files where each key is a dot-separated path mapped to a string value. No nesting.

```json
{
  "common.save": "Save",
  "common.cancel": "Cancel",
  "auth.login.title": "Welcome back",
  "auth.login.submit": "Sign in"
}
```

**Not** nested JSON:

```json
{
  "common": {
    "save": "Save"
  }
}
```

A namespace conflict occurs when a key is used as both a value and a prefix:

```json
{
  "expand": "Expand",
  "expand.all": "Expand all"
}
```

Here `"expand"` holds a string value but also acts as a namespace for `"expand.all"`. The action errors because this ambiguity breaks most i18n libraries at runtime.

## Output examples

**All files pass:**

```
Result: All 12 file(s) linted successfully — no namespace conflicts or invalid values found
```

**All files pass with skipped files:**

```
Result: All 10 file(s) linted successfully — no namespace conflicts or invalid values found (2 skipped)
```

**Errors found:**

```
src/locales/en.json
Line 2: Key "expand" conflicts with "expand.all" — a key cannot be both a value and a namespace prefix
Line 3: Key "count" has invalid value type "number" (expected "string")

▶ Skipped files (1)
Skipping src/locales/broken.json: Invalid JSON

Result: Found 1 namespace conflict(s) and 1 invalid value(s) across 1 file(s) (1 skipped)
```

> GitHub Actions adds `Error:` and `Warning:` prefixes and coloring automatically.

## Development

```bash
pnpm test        # run tests
pnpm build       # compile TypeScript
pnpm package     # bundle with @vercel/ncc for GitHub Actions runtime
```

## License

MIT
