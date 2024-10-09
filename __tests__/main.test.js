/**
 * Unit tests for the action's main functionality, src/main.js
 */
const core = require('@actions/core')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs/promises')
const YAML = require('yaml')
const main = require('../src/main')

const infoMock = jest.spyOn(core, 'info').mockImplementation()
const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
const setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
const runMock = jest.spyOn(main, 'run')

const MOCKS = {
  serviceManifest: path.join(__dirname, '__mocks__', 'service.yaml'),
  jobManifest: path.join(__dirname, '__mocks__', 'job.yaml'),
  envFile: path.join(__dirname, '__mocks__', 'test.env'),
  tmpDir: path.join(os.tmpdir())
}

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('for Service type', () => {
    it('writes a new manifest file as output', async () => {
      const outputFile = path.join(MOCKS.tmpDir, `service-${Date.now()}.yaml`)

      getInputMock.mockImplementation(name => {
        switch (name) {
          case 'input':
            return MOCKS.serviceManifest
          case 'target':
            return 'my-test-app'
          case 'env_file':
            return MOCKS.envFile
          case 'output':
            return outputFile
          default:
            return ''
        }
      })

      await main.run()

      expect(runMock).toHaveReturned()
      expect(setFailedMock).not.toHaveBeenCalled()

      const newManifest = YAML.parse(
        await fs.readFile(outputFile, {
          encoding: 'utf8'
        })
      )

      const container = newManifest.spec.template.spec.containers[0]

      // Expect all env vars that already existed to be there
      expect(container.env).toContainEqual({
        name: 'MY_SUPER_SECRET',
        valueFrom: {
          secretKeyRef: {
            key: 'latest',
            name: 'MY_SUPER_SECRET'
          }
        }
      })
      expect(container.env).toContainEqual({
        name: 'MY_APP_SPECIFIC_VARIABLE',
        value: 'foo'
      })

      const expectedEnvVars = [
        'BASIC',
        'AFTER_LINE',
        'EMPTY',
        'SINGLE_QUOTES',
        'SINGLE_QUOTES_SPACED',
        'DOUBLE_QUOTES',
        'DOUBLE_QUOTES_SPACED',
        'EXPAND_NEWLINES',
        'DONT_EXPAND_UNQUOTED',
        'DONT_EXPAND_SQUOTED',
        'EQUAL_SIGNS',
        'RETAIN_INNER_QUOTES',
        'RETAIN_INNER_QUOTES_AS_STRING',
        'TRIM_SPACE_FROM_UNQUOTED',
        'USERNAME',
        'SPACED_KEY',
        'MULTI_DOUBLE_QUOTED',
        'MULTI_SINGLE_QUOTED',
        'MULTI_BACKTICKED',
        'MULTI_PEM_DOUBLE_QUOTED'
      ]

      for (const envVar of expectedEnvVars) {
        expect(container.env).toContainEqual({
          name: envVar,
          value: expect.any(String)
        })
      }
    })
  })

  describe('for Job type', () => {
    it('writes a new manifest file as output', async () => {
      const outputFile = path.join(MOCKS.tmpDir, `job-${Date.now()}.yaml`)

      getInputMock.mockImplementation(name => {
        switch (name) {
          case 'input':
            return MOCKS.jobManifest
          case 'target':
            return 'my-test-job'
          case 'env_file':
            return MOCKS.envFile
          case 'output':
            return outputFile
          default:
            return ''
        }
      })

      await main.run()

      expect(runMock).toHaveReturned()
      expect(setFailedMock).not.toHaveBeenCalled()

      const newManifest = YAML.parse(
        await fs.readFile(outputFile, {
          encoding: 'utf8'
        })
      )

      const container =
        newManifest.spec.template.spec.template.spec.containers[0]

      // Expect all env vars that already existed to be there
      expect(container.env).toContainEqual({
        name: 'MY_SUPER_SECRET',
        valueFrom: {
          secretKeyRef: {
            key: 'latest',
            name: 'MY_SUPER_SECRET'
          }
        }
      })
      expect(container.env).toContainEqual({
        name: 'MY_APP_SPECIFIC_VARIABLE',
        value: 'foo'
      })

      const expectedEnvVars = [
        'BASIC',
        'AFTER_LINE',
        'EMPTY',
        'SINGLE_QUOTES',
        'SINGLE_QUOTES_SPACED',
        'DOUBLE_QUOTES',
        'DOUBLE_QUOTES_SPACED',
        'EXPAND_NEWLINES',
        'DONT_EXPAND_UNQUOTED',
        'DONT_EXPAND_SQUOTED',
        'EQUAL_SIGNS',
        'RETAIN_INNER_QUOTES',
        'RETAIN_INNER_QUOTES_AS_STRING',
        'TRIM_SPACE_FROM_UNQUOTED',
        'USERNAME',
        'SPACED_KEY',
        'MULTI_DOUBLE_QUOTED',
        'MULTI_SINGLE_QUOTED',
        'MULTI_BACKTICKED',
        'MULTI_PEM_DOUBLE_QUOTED'
      ]

      for (const envVar of expectedEnvVars) {
        expect(container.env).toContainEqual({
          name: envVar,
          value: expect.any(String)
        })
      }
    })
  })

  it('sets a failed status when manifest reading fails', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'input':
          return 'unknown-file.yaml'
        case 'target':
          return 'my-test-app'
        case 'env_file':
          return MOCKS.envFile
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      `ENOENT: no such file or directory, open 'unknown-file.yaml'`
    )
  })

  it('sets a failed status when env file does not exist', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'input':
          return MOCKS.serviceManifest
        case 'target':
          return 'unknown'
        case 'env_file':
          return 'unknown.env'
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      `ENOENT: no such file or directory, open 'unknown.env'`
    )
  })

  it('sets a failed status when no matching container exists', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'input':
          return MOCKS.serviceManifest
        case 'target':
          return 'unknown'
        case 'env_file':
          return MOCKS.envFile
        default:
          return ''
      }
    })

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      `Could not find 'unknown' in 'spec.template.spec.containers'`
    )
  })

  const requiredFields = ['input', 'target', 'env_file', 'output']

  for (const field of requiredFields) {
    it(`fails if no '${field}' is provided`, async () => {
      getInputMock.mockImplementation(name => {
        switch (name) {
          case field:
            throw new Error(`Input required and not supplied: ${field}`)
          default:
            return ''
        }
      })

      await main.run()

      expect(runMock).toHaveReturned()
      expect(setFailedMock).toHaveBeenNthCalledWith(
        1,
        `Input required and not supplied: ${field}`
      )
    })
  }
})
