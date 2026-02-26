import * as core from '@actions/core'

import { analyzeLocaleFile } from './conflict-detection.js'
import { findJsonFilesRecursively } from './file-discovery.js'

export async function run() {
  try {
    const path = core.getInput('path', { required: true })

    core.info(`Linting i18n files in: ${path}`)

    const jsonFiles = await findJsonFilesRecursively(path)
    core.info(`Found ${jsonFiles.length} JSON file(s)`)

    if (jsonFiles.length === 0) {
      core.setFailed(`No JSON files found in: ${path}`)
      return
    }

    const analyzedFileResults: Awaited<ReturnType<typeof analyzeLocaleFile>>[] = []

    for (const file of jsonFiles) {
      const result = await analyzeLocaleFile(file)
      analyzedFileResults.push(result)

      if (result.error) {
        core.warning(`Skipping ${result.filePath}: ${result.error}`)
        continue
      }

      if (result.invalidValues) {
        for (const invalidValue of result.invalidValues) {
          core.error(
            `Key "${invalidValue.key}" has invalid value type "${invalidValue.actualType}" (expected "string")`,
            {
              file: result.filePath,
              startLine: invalidValue.line,
            },
          )
        }
      }

      for (const conflict of result.conflicts) {
        core.error(
          `Key "${conflict.leafKey}" conflicts with "${conflict.conflictingDescendantKey}": a key cannot be both a value and a namespace prefix. Rename or remove one of them.`,
          {
            file: result.filePath,
            startLine: conflict.leafKeyLine,
          },
        )
      }
    }

    const filesWithConflicts = analyzedFileResults.filter(
      result => result.conflicts.length > 0,
    )
    const filesWithInvalidValues = analyzedFileResults.filter(
      result => result.invalidValues !== undefined && result.invalidValues.length > 0,
    )

    let totalConflictCount = 0
    for (const result of filesWithConflicts) {
      totalConflictCount += result.conflicts.length
    }

    let totalInvalidValueCount = 0
    for (const result of filesWithInvalidValues) {
      if (result.invalidValues) {
        totalInvalidValueCount += result.invalidValues.length
      }
    }

    const totalErrorCount = totalConflictCount + totalInvalidValueCount
    const totalFilesWithErrors = new Set([
      ...filesWithConflicts.map(result => result.filePath),
      ...filesWithInvalidValues.map(result => result.filePath),
    ]).size

    core.setOutput('total-files-analyzed', jsonFiles.length)

    if (totalErrorCount > 0) {
      const parts: string[] = []

      if (totalConflictCount > 0) {
        parts.push(`${totalConflictCount} namespace conflict(s)`)
      }

      if (totalInvalidValueCount > 0) {
        parts.push(`${totalInvalidValueCount} invalid value(s)`)
      }

      core.setFailed(
        `Found ${parts.join(' and ')} across ${totalFilesWithErrors} file(s)`,
      )
    }
  }
  catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
    else {
      core.setFailed(String(error))
    }
  }
}

run()
