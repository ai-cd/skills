import { CreateDatabaseParams } from '../../core/types';

export function getPostgreSQLClusterSpec(
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
        'db-type': 'postgresql',
      },
    },
    spec: {
      clusterDefinitionRef: 'postgresql',
      clusterVersionRef: `postgresql-${params.version || '14.8.0'}`,
      terminationPolicy: 'Delete',
      componentSpecs: [
        {
          name: 'postgresql',
          componentDefRef: 'postgresql',
          replicas: params.replicas || 1,
          resources: {
            requests: {
              cpu: params.cpu || '500m',
              memory: params.memory || '512Mi',
            },
            limits: {
              cpu: params.cpu || '1',
              memory: params.memory || '1Gi',
            },
          },
          volumeClaimTemplates: [
            {
              name: 'data',
              spec: {
                accessModes: ['ReadWriteOnce'],
                resources: {
                  requests: {
                    storage: params.storageSize || '10Gi',
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