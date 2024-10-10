const fs = require('node:fs/promises')
const { expect } = require('@jest/globals')
const { readManifest, updateContainer } = require('../src/knative')

describe('readManifest()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const readFileMock = jest.spyOn(fs, 'readFile').mockImplementation()

  it('replaces the env vars and parses YAML', () => {
    const fakeEnv = {
      MY_NAME: 'my-test-app',
      MY_LOCATION_ENV: 'eu-west4'
    }
    readFileMock.mockImplementation(() => {
      return `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: \${MY_NAME}
  labels:
    cloud.googleapis.com/location: \${MY_LOCATION_ENV}
spec:
  template:
    spec:
      containers:
        - name: \${MY_NAME}
          image: my-image
`
    })

    expect(readManifest('my-file.yaml', fakeEnv)).resolves.toEqual({
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Service',
      metadata: {
        name: fakeEnv.MY_NAME,
        labels: {
          'cloud.googleapis.com/location': fakeEnv.MY_LOCATION_ENV
        }
      },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: fakeEnv.MY_NAME,
                image: 'my-image'
              }
            ]
          }
        }
      }
    })
  })
})

describe('updateContainer()', () => {
  describe('kind: Service', () => {
    it('throws when there are no containers', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        spec: {
          template: {
            spec: {
              containers: []
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `No containers found in 'spec.template.spec.containers'`
      )
    })

    it('throws when the given container cannot be found', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'my-app',
                  image: 'my-image',
                  ports: [{ name: 'http1', containerPort: 8080 }]
                }
              ]
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `Could not find 'foo' in 'spec.template.spec.containers'`
      )
    })

    it('creates a new manifest with the updated container', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'my-app',
                  image: 'my-image',
                  ports: [{ name: 'http1', containerPort: 8080 }]
                }
              ]
            }
          }
        }
      }

      const newManifest = updateContainer(manifest, 'my-app', container => ({
        ...container,
        name: 'foo'
      }))

      expect(newManifest.spec.template.spec.containers[0].name).toEqual('foo')
    })
  })

  describe('kind: Service', () => {
    it('throws when there are no containers', () => {
      const manifest = {
        apiVersion: 'run.googleapis.com/v1',
        kind: 'Job',
        spec: {
          template: {
            spec: {
              taskCount: 1,
              template: {
                spec: {
                  containers: []
                }
              }
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `No containers found in 'spec.template.spec.template.spec.containers'`
      )
    })

    it('throws when the given container cannot be found', () => {
      const manifest = {
        apiVersion: 'run.googleapis.com/v1',
        kind: 'Job',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              taskCount: 1,
              template: {
                spec: {
                  containers: [
                    {
                      name: 'my-test-job',
                      image: 'my-image',
                      command: ['php', 'artisan', 'schedule:run'],
                      resources: {
                        limits: {
                          cpu: '1000m',
                          memory: '512Mi'
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `Could not find 'foo' in 'spec.template.spec.template.spec.containers'`
      )
    })

    it('creates a new manifest with the updated container', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'my-app',
                  image: 'my-image',
                  ports: [{ name: 'http1', containerPort: 8080 }]
                }
              ]
            }
          }
        }
      }

      const newManifest = updateContainer(manifest, 'my-app', container => ({
        ...container,
        name: 'foo'
      }))

      expect(newManifest.spec.template.spec.containers[0].name).toEqual('foo')
    })
  })

  it('throws when unknown manifest', () => {
    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      spec: {
        replicas: 3,
        template: {
          spec: {
            containers: [{ name: 'nginx', image: 'nginx:latest' }]
          }
        }
      }
    }

    expect(() => updateContainer(manifest, '', () => {})).toThrow(
      'Unsupported manifest for apiVersion: apps/v1 and kind: Deployment'
    )
  })
})
