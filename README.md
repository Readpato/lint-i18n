# Lint i18n

GitHub Action that lints flat-key i18n JSON files for structural errors — namespace conflicts, invalid value types, broken JSON, and empty files — with line-number annotations in pull request reviews.

## Checks

| Check | Severity | Behavior |
|-------|----------|----------|
| Namespace conflict | Error (fails) | A key like `"expand"` is both a value and a prefix of `"expand.all"` |
| Invalid value type | Error (fails) | Values must be strings — numbers, booleans, arrays, objects, and `null` are rejected |
| No files found | Error (fails) | No `.json` files exist under the given `path` |
| Invalid JSON | Warning (skipped) | File contains malformed JSON that cannot be parsed |
| Non-object JSON | Warning (skipped) | File parses to an array, string, or other non-object type |
| Empty object | Warning (skipped) | File parses to `{}` with no translation keys |

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

## Configuration

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
| `total-files-analyzed` | Number of locale files analyzed (including skipped files) |

## Error examples

Namespace conflict:

```
Error: Key "expand" conflicts with "expand.all": a key cannot be both a value and a namespace prefix. Rename or remove one of them.
```

Invalid value type:

```
Error: Key "count" has invalid value type "number" (expected "string")
```

Both appear as inline annotations on the exact line in GitHub pull request reviews.

## Development

```bash
pnpm install     # install dependencies
pnpm test        # run tests
pnpm build       # compile TypeScript
pnpm package     # bundle with @vercel/ncc for GitHub Actions runtime
```

## License

ISC
