import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as core from '@actions/core'

import { run } from '../src/main.js'

vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
}))

const fixturesPath = resolve(import.meta.dirname, 'fixtures')

describe('run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sets failed when conflicts are found', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') {
        return resolve(fixturesPath, 'conflicting')
      }
      return '{}'
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('namespace conflict'),
    )
    expect(core.error).toHaveBeenCalled()
  })

  it('succeeds on clean files', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') {
        return resolve(fixturesPath, 'valid')
      }
      return '{}'
    })

    await run()

    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.error).not.toHaveBeenCalled()
  })

  it('sets total-files-analyzed output', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') {
        return resolve(fixturesPath, 'valid')
      }
      return '{}'
    })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('total-files-analyzed', 2)
  })

  it('fails when path contains no JSON files', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') {
        return resolve(fixturesPath, 'empty-dir')
      }
      return ''
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('No JSON files found'),
    )
  })

  it('warns on invalid JSON files', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') {
        return resolve(fixturesPath, 'invalid')
      }
      return '{}'
    })

    await run()

    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Skipping'),
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('reports invalid value types', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'path') {
        return resolve(fixturesPath, 'invalid-values')
      }
      return '{}'
    })

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('invalid value type'),
      expect.objectContaining({ file: expect.stringContaining('en.json') }),
    )
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('invalid value'),
    )
  })
})
