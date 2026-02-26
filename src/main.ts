import * as core from '@actions/core'

export async function run(): Promise<void> {
  try {
    const path = core.getInput('path', { required: true })
    const rules = core.getInput('rules')

    core.info(`Linting i18n files in: ${path}`)
    core.info(`Rules: ${rules}`)

    core.setOutput('total-files-analyzed', 0)
  }
  catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
