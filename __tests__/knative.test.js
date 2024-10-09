const { expect } = require('@jest/globals')
const { updateContainer } = require('../src/knative')

describe('updateContainer()', () => {
  it('throws when the given container cannot be found', () => {
    const manifest = {
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Service',
      metadata: {
        name: 'my-app',
        labels: {
          'cloud.googleapis.com/location': 'us-east1'
        },
        annotations: {
          'run.googleapis.com/ingress': 'internal-and-cloud-load-balancing'
        }
      },
      spec: {
        template: {
          metadata: {
            annotations: {
              'run.googleapis.com/network-interfaces':
                '[{"network":"projects/kumina-hedge/global/networks/k8s-hedge-kumina-net","subnetwork":"projects/kumina-hedge/regions/us-east1/subnetworks/us-east1-k8s-hedge-kumina-net"}]',
              'run.googleapis.com/vpc-access-egress': 'all-traffic'
            }
          },
          spec: {
            serviceAccountName: 'service-account@example.org',
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
        },
        annotations: {
          'run.googleapis.com/ingress': 'internal-and-cloud-load-balancing'
        }
      },
      spec: {
        template: {
          metadata: {
            annotations: {
              'run.googleapis.com/network-interfaces':
                '[{"network":"projects/kumina-hedge/global/networks/k8s-hedge-kumina-net","subnetwork":"projects/kumina-hedge/regions/us-east1/subnetworks/us-east1-k8s-hedge-kumina-net"}]',
              'run.googleapis.com/vpc-access-egress': 'all-traffic'
            }
          },
          spec: {
            serviceAccountName: 'service-account@example.org',
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
