const core = require('@actions/core')
const knative = require('./knative')
const environment = require('./env')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const inputFile = core.getInput('input', { required: true })
    const envFile = core.getInput('env_file', { required: true })
    const outputFile = core.getInput('output', { required: true })
    const containerName = core.getInput('container_name')

    const [manifest, env] = await Promise.all([
      knative.readManifest(inputFile),
      environment.parse(envFile)
    ])

    const updatedManifest = knative.updateContainer(
      manifest,
      containerName,
      container => knative.addEnvToContainer(container, env)
    )

    core.info(`Writing updated manifest to ${outputFile}`)

    await knative.writeManifest(outputFile, updatedManifest)

    // Set outputs for other workflow steps to use
    core.setOutput('output', outputFile)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
