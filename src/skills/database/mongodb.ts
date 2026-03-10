import { CreateDatabaseParams } from '../../core/types';

export function getMongoDBClusterSpec(
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
        'db-type': 'mongodb',
      },
    },
    spec: {
      clusterDefinitionRef: 'mongodb',
      clusterVersionRef: `mongodb-${params.version || '5.0'}`,
      terminationPolicy: 'Delete',
      componentSpecs: [
        {
          name: 'mongodb',
          componentDefRef: 'mongodb',
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