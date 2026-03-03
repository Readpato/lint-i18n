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

    const analysisResults = await Promise.all(jsonFiles.map(file => analyzeLocaleFile(file)))

    const skippedResults = analysisResults.filter(result => result.error)
    let totalConflictCount = 0
    let totalInvalidValueCount = 0
    let totalFilesWithErrors = 0

    const lintedResults = analysisResults.filter(result => !result.error)

    for (const result of lintedResults) {
      const errorCount = result.invalidValues.length + result.conflicts.length

      if (errorCount > 0) {
        core.startGroup(result.filePath)

        for (const invalidValue of result.invalidValues) {
          const message = `Key "${invalidValue.key}" has invalid value type "${invalidValue.actualType}" (expected "string")`
          core.error(message, { file: result.filePath, startLine: invalidValue.line })
        }

        for (const conflict of result.conflicts) {
          const message = `Key "${conflict.leafKey}" conflicts with "${conflict.conflictingDescendantKey}" — a key cannot be both a value and a namespace prefix`
          core.error(message, { file: result.filePath, startLine: conflict.leafKeyLine })
        }

        core.endGroup()
        totalFilesWithErrors++
      }

      totalConflictCount += result.conflicts.length
      totalInvalidValueCount += result.invalidValues.length
    }

    if (skippedResults.length > 0) {
      core.startGroup(`Skipped files (${skippedResults.length})`)
      for (const skipped of skippedResults) {
        core.warning(`Skipping ${skipped.filePath}: ${skipped.error}`)
      }
      core.endGroup()
    }

    const totalErrorCount = totalConflictCount + totalInvalidValueCount
    const skippedSuffix = skippedResults.length > 0 ? ` (${skippedResults.length} skipped)` : ''

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
        `Found ${parts.join(' and ')} across ${totalFilesWithErrors} file(s)${skippedSuffix}`,
      )
    }
    else {
      const lintedFileCount = lintedResults.length
      core.info(
        `All ${lintedFileCount} file(s) linted successfully — no namespace conflicts or invalid values found${skippedSuffix}`,
      )
    }
  }
  catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
