import * as k8s from '@kubernetes/client-node';
import { SealosK8sClient } from '../../core/k8s-client';
import { DeployContainerParams } from '../../core/types';

export async function createIngress(
  client: SealosK8sClient,
  namespace: string,
  params: DeployContainerParams,
): Promise<k8s.V1Ingress> {
  const ingress: k8s.V1Ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: `${params.name}-ingress`,
      namespace,
      labels: {
        app: params.name,
        'managed-by': 'sealos-skills',
      },
      annotations: {
        'kubernetes.io/ingress.class': 'nginx',
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
      },
    },
    spec: {
      rules: [
        {
          host: params.domain,
          http: {
            paths: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: `${params.name}-svc`,
                    port: {
                      number: params.port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
      tls: params.domain
        ? [
            {
              hosts: [params.domain],
              secretName: `${params.name}-tls`,
            },
          ]
        : undefined,
    },
  };

  const response = await client.networking.createNamespacedIngress(namespace, ingress);
  return response.body;
}