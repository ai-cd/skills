import * as k8s from '@kubernetes/client-node';
import { SealosK8sClient } from '../../core/k8s-client';
import { DeployContainerParams } from '../../core/types';

export async function createDeployment(
  client: SealosK8sClient,
  namespace: string,
  params: DeployContainerParams,
): Promise<k8s.V1Deployment> {
  const envVars: k8s.V1EnvVar[] = params.envVars
    ? Object.entries(params.envVars).map(([name, value]) => ({ name, value }))
    : [];

  const deployment: k8s.V1Deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: params.name,
      namespace,
      labels: {
        app: params.name,
        'managed-by': 'sealos-skills',
      },
    },
    spec: {
      replicas: params.replicas || 1,
      selector: {
        matchLabels: {
          app: params.name,
        },
      },
      template: {
        metadata: {
          labels: {
            app: params.name,
          },
        },
        spec: {
          containers: [
            {
              name: params.name,
              image: params.image,
              ports: [{ containerPort: params.port }],
              env: envVars,
              resources: {
                requests: {
                  cpu: params.cpu || '100m',
                  memory: params.memory || '128Mi',
                },
                limits: {
                  cpu: params.cpu || '500m',
                  memory: params.memory || '512Mi',
                },
              },
            },
          ],
        },
      },
    },
  };

  const response = await client.apps.createNamespacedDeployment(namespace, deployment);
  return response.body;
}