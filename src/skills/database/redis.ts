import { CreateDatabaseParams } from '../../core/types';

export function getRedisClusterSpec(
  params: CreateDatabaseParams,
  namespace: string,
  _password: string,
): Record<string, unknown> {
  return {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'Cluster',
    metadata: {
      name: params.name,
      namespace,
      labels: {
        'managed-by': 'sealos-skills',
        'db-type': 'redis',
      },
    },
    spec: {
      clusterDefinitionRef: 'redis',
      clusterVersionRef: `redis-${params.version || '7.0.6'}`,
      terminationPolicy: 'Delete',
      componentSpecs: [
        {
          name: 'redis',
          componentDefRef: 'redis',
          replicas: params.replicas || 1,
          resources: {
            requests: {
              cpu: params.cpu || '250m',
              memory: params.memory || '256Mi',
            },
            limits: {
              cpu: params.cpu || '500m',
              memory: params.memory || '512Mi',
            },
          },
          volumeClaimTemplates: [
            {
              name: 'data',
              spec: {
                accessModes: ['ReadWriteOnce'],
                resources: {
                  requests: {
                    storage: params.storageSize || '5Gi',
                  },
                },
              },
            },
          ],
        },
      ],
    },
  };
}