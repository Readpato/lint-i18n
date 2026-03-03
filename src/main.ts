import * as core from '@actions/core'

import { analyzeLocaleFile } from './conflict-detection.js'
import { findJsonFilesRecursively } from './file-discovery.js'

function formatLinePrefix(line: number | undefined) {
  return line !== undefined ? `Line ${line}: ` : ''
}

function reportError(filePath: string, line: number | undefined, message: string) {
  core.error(message, { file: filePath, startLine: line })
  return `  ${formatLinePrefix(line)}${message}`
}

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

    let skippedFileCount = 0
    let totalConflictCount = 0
    let totalInvalidValueCount = 0
    let totalFilesWithErrors = 0

    for (const result of analysisResults) {
      if (result.error) {
        core.info('')
        core.warning(`Skipping ${result.filePath}: ${result.error}`)
        skippedFileCount++
        continue
      }

      const fileErrors: string[] = []

      for (const invalidValue of result.invalidValues) {
        const message = `Key "${invalidValue.key}" has invalid value type "${invalidValue.actualType}" (expected "string")`
        fileErrors.push(reportError(result.filePath, invalidValue.line, message))
      }

      for (const conflict of result.conflicts) {
        const message = `Key "${conflict.leafKey}" conflicts with "${conflict.conflictingDescendantKey}" — a key cannot be both a value and a namespace prefix`
        fileErrors.push(reportError(result.filePath, conflict.leafKeyLine, message))
      }

      if (fileErrors.length > 0) {
        core.info('')
        core.info(result.filePath)
        for (const errorLine of fileErrors) {
          core.info(errorLine)
        }

        totalFilesWithErrors++
      }

      totalConflictCount += result.conflicts.length
      totalInvalidValueCount += result.invalidValues.length
    }

    const totalErrorCount = totalConflictCount + totalInvalidValueCount
    const skippedSuffix = skippedFileCount > 0 ? ` (${skippedFileCount} skipped)` : ''

    core.setOutput('total-files-analyzed', jsonFiles.length)

    if (totalErrorCount > 0) {
      const parts: string[] = []

      if (totalConflictCount > 0) {
        parts.push(`${totalConflictCount} namespace conflict(s)`)
      }

      if (totalInvalidValueCount > 0) {
        parts.push(`${totalInvalidValueCount} invalid value(s)`)
      }

      core.info('')
      core.setFailed(
        `Found ${parts.join(' and ')} across ${totalFilesWithErrors} file(s)${skippedSuffix}`,
      )
    }
    else {
      const lintedFileCount = jsonFiles.length - skippedFileCount
      core.info('')
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
