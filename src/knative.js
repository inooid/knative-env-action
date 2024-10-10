const fs = require('node:fs/promises')
const YAML = require('yaml')
const { envsubst } = require('./env')

/**
 * Reads the given knative manifest and replaces the given env vars.
 * @param {string} filePath
 * @returns {object}
 */
async function readManifest(filePath) {
  const file = await fs.readFile(filePath, { encoding: 'utf8' })

  return YAML.parse(envsubst(file))
}

/**
 * @param {string} outputPath
 * @param {object} contents
 */
function writeManifest(outputPath, contents) {
  return fs.writeFile(outputPath, YAML.stringify(contents), {
    encoding: 'utf8'
  })
}

/**
 * @param {object} container
 * @param {object} envVars
 * @returns {object}
 */
function addEnvToContainer(container, envVars) {
  const vars = Object.entries(envVars).map(([key, value]) => ({
    name: key,
    value
  }))

  return {
    ...container,
    env: [...(container.env ?? []), ...vars]
  }
}

/**
 * @param {object} manifest
 * @param {string} containerName
 * @param {(manifest: object) => void} transformator
 */
function updateContainer(manifest, containerName, transformator) {
  const { kind, apiVersion } = manifest

  switch (true) {
    // Service manifest
    case kind === 'Service' && apiVersion === 'serving.knative.dev/v1':
      return updateServiceContainer(manifest, containerName, transformator)

    // Job manifest
    case kind === 'Job' && apiVersion === 'run.googleapis.com/v1':
      return updateJobContainer(manifest, containerName, transformator)

    default:
      throw new Error(
        `Unsupported manifest for apiVersion: ${apiVersion} and kind: ${kind}`
      )
  }
}

/**
 * @param {object} manifest
 * @param {string} containerName
 * @param {(manifest: object) => void} transformator
 * @private
 */
function updateServiceContainer(manifest, containerName, transformator) {
  const containers = manifest.spec?.template?.spec?.containers ?? []
  const index = containers.findIndex(
    container => container?.name === containerName
  )

  if (index === -1) {
    throw new Error(
      `Could not find '${containerName}' in 'spec.template.spec.containers'`
    )
  }

  manifest.spec.template.spec = {
    ...manifest.spec.template.spec,
    containers: containers.with(index, transformator(containers[index]))
  }

  return manifest
}

/**
 * @param {object} manifest
 * @param {string} containerName
 * @param {(manifest: object) => void} transformator
 * @private
 */
function updateJobContainer(manifest, containerName, transformator) {
  const containers =
    manifest.spec?.template?.spec?.template?.spec?.containers ?? []
  const index = containers.findIndex(
    container => container?.name === containerName
  )

  if (index === -1) {
    throw new Error(
      `Could not find '${containerName}' in 'spec.template.spec.template.spec.containers'`
    )
  }

  manifest.spec.template.spec.template.spec = {
    ...manifest.spec.template.spec.template.spec,
    containers: containers.with(index, transformator(containers[index]))
  }

  return manifest
}

module.exports = {
  readManifest,
  writeManifest,

  addEnvToContainer,
  updateContainer
}
