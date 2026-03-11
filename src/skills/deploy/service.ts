import * as k8s from '@kubernetes/client-node';
import { SealosK8sClient } from '../../core/k8s-client';
import { DeployContainerParams } from '../../core/types';

export async function createService(
  client: SealosK8sClient,
  namespace: string,
  params: DeployContainerParams,
): Promise<k8s.V1Service> {
  const service: k8s.V1Service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: `${params.name}-svc`,
      namespace,
      labels: {
        app: params.name,
        'managed-by': 'sealos-skills',
      },
    },
    spec: {
      selector: {
        app: params.name,
      },
      ports: [
        {
          port: params.port,
          targetPort: params.port,
          protocol: 'TCP',
        },
      ],
      type: 'ClusterIP',
    },
  };

  const response = await client.core.createNamespacedService(namespace, service);
  return response.body;
}