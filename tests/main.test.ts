import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as core from '@actions/core'

import { run } from '../src/main.js'

vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}))

const fixturesPath = resolve(import.meta.dirname, 'fixtures')

function mockInputPath(fixture: string) {
  vi.mocked(core.getInput).mockImplementation((name) => {
    if (name === 'path') {
      return resolve(fixturesPath, fixture)
    }
    return '{}'
  })
}

describe('run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets failed when conflicts are found', async () => {
    mockInputPath('conflicting')

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('namespace conflict'),
    )
    expect(core.error).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('en.json'),
    )
  })

  it('succeeds on clean files', async () => {
    mockInputPath('valid')

    await run()

    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.error).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('linted successfully'),
    )
  })

  it('sets total-files-analyzed output', async () => {
    mockInputPath('valid')

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
    mockInputPath('invalid')

    await run()

    expect(core.startGroup).toHaveBeenCalledWith(
      expect.stringMatching(/Skipped files/),
    )
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Skipping'),
    )
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(/linted successfully.*skipped/),
    )
  })

  it('reports invalid value types', async () => {
    mockInputPath('invalid-values')

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('invalid value type'),
      expect.objectContaining({ file: expect.stringContaining('en.json') }),
    )
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('invalid value'),
    )
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('en.json'),
    )
  })

  it('reports both invalid values and conflicts for mixed-errors', async () => {
    mockInputPath('mixed-errors')

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('invalid value type'),
      expect.objectContaining({ file: expect.stringContaining('en.json') }),
    )
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('conflicts with'),
      expect.objectContaining({ file: expect.stringContaining('en.json') }),
    )

    const failedMessage = vi.mocked(core.setFailed).mock.calls[0]?.[0] ?? ''

    expect(failedMessage).toContain('namespace conflict')
    expect(failedMessage).toContain('invalid value')

    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('en.json'),
    )
  })
})
