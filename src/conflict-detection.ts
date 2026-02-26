import { readFile } from 'node:fs/promises'

import type { FlatKeyLocaleData, InvalidValueError, LocaleFileAnalysisResult, NamespaceConflict } from './types.js'

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Maps each JSON key to its 1-based line number by scanning the raw file content. */
function buildKeyLineMap(rawContent: string) {
  const lineMap = new Map<string, number>()
  const lines = rawContent.split('\n')

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]

    if (line === undefined) {
      continue
    }

    /**
     * Matches a JSON key declaration: optional whitespace, `"key":` (e.g. `  "expand.all": "value"`).
     * Note: does not handle escaped quotes within JSON keys (e.g. `"key\"name"`).
     */
    const match = line.match(/^\s*"([^"]+)"\s*:/)

    if (match?.[1] !== undefined) {
      lineMap.set(match[1], lineIndex + 1)
    }
  }

  return lineMap
}

/** Validates that all values in a parsed locale object are strings. */
export function validateLocaleValues(data: Record<string, unknown>) {
  if (Object.keys(data).length === 0) {
    throw new Error('Cannot validate an empty locale object')
  }

  const validData: FlatKeyLocaleData = {}
  const invalidValues: InvalidValueError[] = []

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      validData[key] = value
    }
    else {
      invalidValues.push({
        key,
        actualType: Array.isArray(value) ? 'array' : typeof value,
      })
    }
  }

  return { validData, invalidValues }
}

/** Detects flat-key namespace conflicts where a key is both a leaf value and a prefix of another key. */
export function detectFlatKeyNamespaceConflicts(localeData: FlatKeyLocaleData) {
  if (Object.keys(localeData).length === 0) {
    throw new Error('Cannot detect conflicts in an empty locale object')
  }

  const localeKeys = new Set(Object.keys(localeData))
  const conflicts: NamespaceConflict[] = []

  for (const key of localeKeys) {
    const segments = key.split('.')

    if (segments.length < 2) {
      continue
    }

    for (let segmentIndex = 1; segmentIndex < segments.length; segmentIndex++) {
      const parentKeySegment = segments.slice(0, segmentIndex).join('.')

      if (!localeKeys.has(parentKeySegment)) {
        continue
      }

      conflicts.push({
        leafKey: parentKeySegment,
        conflictingDescendantKey: key,
      })
    }
  }

  return conflicts
}

/** Reads, parses, and analyzes a single locale file for namespace conflicts. */
export async function analyzeLocaleFile(filePath: string): Promise<LocaleFileAnalysisResult> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const parsed: unknown = JSON.parse(content)

    if (!isPlainJsonObject(parsed)) {
      return { filePath, conflicts: [], error: 'File does not contain a JSON object' }
    }

    if (Object.keys(parsed).length === 0) {
      return { filePath, conflicts: [], error: 'File contains no translation keys' }
    }

    const keyLineMap = buildKeyLineMap(content)
    const { validData, invalidValues } = validateLocaleValues(parsed)

    if (invalidValues.length > 0) {
      for (const invalidValue of invalidValues) {
        invalidValue.line = keyLineMap.get(invalidValue.key)
      }

      return { filePath, conflicts: [], invalidValues }
    }

    const conflicts = detectFlatKeyNamespaceConflicts(validData)

    for (const conflict of conflicts) {
      conflict.leafKeyLine = keyLineMap.get(conflict.leafKey)
      conflict.conflictingDescendantKeyLine = keyLineMap.get(conflict.conflictingDescendantKey)
    }

    return { filePath, conflicts }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { filePath, conflicts: [], error: message }
  }
}
