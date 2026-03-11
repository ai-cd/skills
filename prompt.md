根据你的 Issue [ai-cd/skills#1](https://github.com/ai-cd/skills/issues/1) 的描述，这个项目的目标是将 **Sealos 的核心能力转化为可复用的 Skills（技能模块）**，包括：

0. **初始化 Skill** — 引导用户复制 kubeconfig 并持久化
1. **部署容器** — 创建 Deployment、Service、Ingress
2. **创建数据库** — 创建各类数据库并获取连接信息

下面我给你**完整的实现方案**，包括架构设计、目录结构、以及每个 Skill 的实现细节。

---

## 一、整体架构设计

```
┌─────────────────────────────────────────────┐
│              AI Agent / Chat UI             │
│         (用户在聊天框中输入指令)              │
└───────────────┬─────────────────────────────┘
                │ 调用 Skills
                ▼
┌─────────────────────────────────────────────┐
│            Skills Engine (核心)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Skill 0 │ │  Skill 1 │ │   Skill 2    │ │
│  │  Init &  │ │  Deploy  │ │  Database    │ │
│  │ Kubeconf │ │Container │ │  Creation    │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
└───────┼─────────────┼──────────────┼─────────┘
        │             │              │
        ▼             ▼              ▼
┌─────────────────────────────────────────────┐
│        Kubernetes Client (kubectl/API)       │
│        使用 ~/.kube/sealos/config            │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│           Sealos Kubernetes Cluster          │
│  (Deployments, Services, Ingress, DBs...)   │
└─────────────────────────────────────────────┘
```

---

## 二、推荐的项目目录结构

```
skills/
├── README.md
├── package.json                  # 项目配置 (Node.js/TypeScript)
├── tsconfig.json
├── src/
│   ├── index.ts                  # 入口：Skills 注册与路由
│   ├── core/
│   │   ├── k8s-client.ts         # Kubernetes 客户端封装
│   │   └── types.ts              # 公共类型定义
│   ├── skills/
│   │   ├── init/
│   │   │   ├── index.ts          # Skill 0: 初始化 kubeconfig
│   │   │   └── templates.ts      # 提示信息模板
│   │   ├── deploy/
│   │   │   ├── index.ts          # Skill 1: 部署容器
���   │   │   ├── deployment.ts     # Deployment 生成器
│   │   │   ├── service.ts        # Service 生成器
│   │   │   └── ingress.ts        # Ingress 生成器
│   │   └── database/
│   │       ├── index.ts          # Skill 2: 创建数据库
│   │       ├── mysql.ts          # MySQL 集群模板
│   │       ├── postgresql.ts     # PostgreSQL 集群模板
│   │       ├── mongodb.ts        # MongoDB 集群模板
│   │       └── redis.ts          # Redis 集群模板
│   └── utils/
│       ├── validator.ts          # 参数校验
│       └── logger.ts             # 日志工具
├── templates/                    # YAML 模板文件
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── databases/
│       ├── mysql-cluster.yaml
│       ├── pg-cluster.yaml
│       ├── mongo-cluster.yaml
│       └── redis-cluster.yaml
└── tests/
    ├── init.test.ts
    ├── deploy.test.ts
    └── database.test.ts
```

---

## 三、每个 Skill 的实现细节

### Skill 0：初始化 — 安装和配置 kubeconfig

```typescript name=src/skills/init/index.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KubeConfig } from '@kubernetes/client-node';

const SEALOS_KUBECONFIG_DIR = path.join(os.homedir(), '.kube', 'sealos');
const SEALOS_KUBECONFIG_PATH = path.join(SEALOS_KUBECONFIG_DIR, 'config');

export interface InitResult {
  success: boolean;
  message: string;
  kubeconfigPath?: string;
}

/**
 * Skill 0: 初始化 Sealos kubeconfig
 * 引导用户粘贴 kubeconfig 内容，并持久化到 ~/.kube/sealos/config
 */
export async function initSkill(kubeconfigContent?: string): Promise<InitResult> {
  // Step 1: 检查是否已存在 kubeconfig
  if (fs.existsSync(SEALOS_KUBECONFIG_PATH) && !kubeconfigContent) {
    return {
      success: true,
      message: `✅ Sealos kubeconfig 已存在于: ${SEALOS_KUBECONFIG_PATH}\n如需更新，请将新的 kubeconfig 内容粘贴到聊天框中。`,
      kubeconfigPath: SEALOS_KUBECONFIG_PATH,
    };
  }

  // Step 2: 如果用户还没提供 kubeconfig，提示用户
  if (!kubeconfigContent) {
    return {
      success: false,
      message: [
        '🔧 **Sealos Skills 初始化**',
        '',
        '请按以下步骤操作：',
        '1. 登录 Sealos Cloud (https://cloud.sealos.io)',
        '2. 进入「设置」→「Kubeconfig」',
        '3. 复制完整的 kubeconfig 内容',
        '4. 将 kubeconfig 内容粘贴到聊天框中',
        '',
        '⚠️ kubeconfig 将被保存到 `~/.kube/sealos/config`',
      ].join('\n'),
    };
  }

  // Step 3: 验证 kubeconfig 格式
  try {
    const kc = new KubeConfig();
    kc.loadFromString(kubeconfigContent);
    // 验证是否至少有一个 cluster 和 context
    if (kc.getClusters().length === 0 || kc.getContexts().length === 0) {
      throw new Error('kubeconfig 中没有找到有效的 cluster 或 context');
    }
  } catch (err) {
    return {
      success: false,
      message: `❌ kubeconfig 格式验证失败: ${(err as Error).message}\n请检查内容后重试。`,
    };
  }

  // Step 4: 创建目录并写入文件
  try {
    fs.mkdirSync(SEALOS_KUBECONFIG_DIR, { recursive: true });
    fs.writeFileSync(SEALOS_KUBECONFIG_PATH, kubeconfigContent, {
      mode: 0o600, // 仅所有者可读写
    });
  } catch (err) {
    return {
      success: false,
      message: `❌ 写入 kubeconfig 失败: ${(err as Error).message}`,
    };
  }

  // Step 5: 验证连接
  try {
    const kc = new KubeConfig();
    kc.loadFromFile(SEALOS_KUBECONFIG_PATH);
    const k8sApi = kc.makeApiClient(await import('@kubernetes/client-node').then(m => m.CoreV1Api));
    await k8sApi.listNamespace();
  } catch (err) {
    return {
      success: true,
      message: `⚠️ kubeconfig 已保存到 ${SEALOS_KUBECONFIG_PATH}，但连接测试失败: ${(err as Error).message}\n请检查网络和凭证。`,
      kubeconfigPath: SEALOS_KUBECONFIG_PATH,
    };
  }

  return {
    success: true,
    message: `✅ Sealos kubeconfig 初始化成功！\n📁 保存路径: ${SEALOS_KUBECONFIG_PATH}\n🔗 集群连接测试通过`,
    kubeconfigPath: SEALOS_KUBECONFIG_PATH,
  };
}
```

---

### 核心模块：Kubernetes Client 封装

```typescript name=src/core/k8s-client.ts
import * as k8s from '@kubernetes/client-node';
import * as path from 'path';
import * as os from 'os';

const SEALOS_KUBECONFIG_PATH = path.join(os.homedir(), '.kube', 'sealos', 'config');

export class SealosK8sClient {
  private kc: k8s.KubeConfig;
  private appsApi: k8s.AppsV1Api;
  private coreApi: k8s.CoreV1Api;
  private networkingApi: k8s.NetworkingV1Api;
  private customObjectsApi: k8s.CustomObjectsApi;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromFile(SEALOS_KUBECONFIG_PATH);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
  }

  /** 获取当前 namespace（从 kubeconfig context 中提取） */
  getNamespace(): string {
    const currentContext = this.kc.getCurrentContext();
    const context = this.kc.getContextObject(currentContext);
    return context?.namespace || 'default';
  }

  get apps() { return this.appsApi; }
  get core() { return this.coreApi; }
  get networking() { return this.networkingApi; }
  get customObjects() { return this.customObjectsApi; }
  get kubeConfig() { return this.kc; }
}

/** 单例实例 */
let _client: SealosK8sClient | null = null;

export function getK8sClient(): SealosK8sClient {
  if (!_client) {
    _client = new SealosK8sClient();
  }
  return _client;
}
```

---

### 公共类型定义

```typescript name=src/core/types.ts
/** 部署容器的参数 */
export interface DeployContainerParams {
  name: string;               // 应用名称
  image: string;              // 容器镜像
  replicas?: number;          // 副本数 (默认 1)
  port: number;               // 容器端口
  cpu?: string;               // CPU 请求 (如 "500m")
  memory?: string;            // 内存请求 (如 "512Mi")
  envVars?: Record<string, string>; // 环境变量
  enableIngress?: boolean;    // 是否创建 Ingress
  domain?: string;            // 自定义域名 (Ingress)
}

/** 创建数据库的参数 */
export interface CreateDatabaseParams {
  name: string;                   // 数据库名称
  type: 'mysql' | 'postgresql' | 'mongodb' | 'redis';
  version?: string;               // 数据库版本
  replicas?: number;              // 副本数
  storageSize?: string;           // 存储大小 (如 "10Gi")
  cpu?: string;
  memory?: string;
}

/** Skill 执行结果 */
export interface SkillResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

/** 数据库连接信息 */
export interface DatabaseConnectionInfo {
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  connectionString: string;
}
```

---

### Skill 1：部署容器（Deployment + Service + Ingress）

```typescript name=src/skills/deploy/index.ts
import { getK8sClient } from '../../core/k8s-client';
import { DeployContainerParams, SkillResult } from '../../core/types';
import { createDeployment } from './deployment';
import { createService } from './service';
import { createIngress } from './ingress';

/**
 * Skill 1: 部署容器
 * 创建 Deployment + Service + (可选) Ingress
 */
export async function deployContainer(params: DeployContainerParams): Promise<SkillResult> {
  const client = getK8sClient();
  const namespace = client.getNamespace();
  const results: string[] = [];

  try {
    // 1. 创建 Deployment
    const deployment = await createDeployment(client, namespace, params);
    results.push(`✅ Deployment "${deployment.metadata?.name}" 创建成功 (副本数: ${params.replicas || 1})`);

    // 2. 创建 Service
    const service = await createService(client, namespace, params);
    const clusterIP = service.spec?.clusterIP;
    results.push(`✅ Service "${service.metadata?.name}" 创建成功 (ClusterIP: ${clusterIP})`);

    // 3. 创建 Ingress（如果需要）
    if (params.enableIngress && params.domain) {
      const ingress = await createIngress(client, namespace, params);
      results.push(`✅ Ingress "${ingress.metadata?.name}" 创建成功 (域名: ${params.domain})`);
    }

    return {
      success: true,
      message: results.join('\n'),
      data: {
        namespace,
        deploymentName: params.name,
        serviceName: `${params.name}-svc`,
        clusterIP,
        domain: params.domain,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: `❌ 部署失败: ${(err as Error).message}\n\n已完成的步骤:\n${results.join('\n') || '无'}`,
    };
  }
}
```

```typescript name=src/skills/deploy/deployment.ts
import * as k8s from '@kubernetes/client-node';
import { SealosK8sClient } from '../../core/k8s-client';
import { DeployContainerParams } from '../../core/types';

export async function createDeployment(
  client: SealosK8sClient,
  namespace: string,
  params: DeployContainerParams
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
        matchLabels: { app: params.name },
      },
      template: {
        metadata: {
          labels: { app: params.name },
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

  const { body } = await client.apps.createNamespacedDeployment(namespace, deployment);
  return body;
}
```

```typescript name=src/skills/deploy/service.ts
import * as k8s from '@kubernetes/client-node';
import { SealosK8sClient } from '../../core/k8s-client';
import { DeployContainerParams } from '../../core/types';

export async function createService(
  client: SealosK8sClient,
  namespace: string,
  params: DeployContainerParams
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
      selector: { app: params.name },
      ports: [
        {
          port: params.port,
          targetPort: params.port as any,
          protocol: 'TCP',
        },
      ],
      type: 'ClusterIP',
    },
  };

  const { body } = await client.core.createNamespacedService(namespace, service);
  return body;
}
```

```typescript name=src/skills/deploy/ingress.ts
import * as k8s from '@kubernetes/client-node';
import { SealosK8sClient } from '../../core/k8s-client';
import { DeployContainerParams } from '../../core/types';

export async function createIngress(
  client: SealosK8sClient,
  namespace: string,
  params: DeployContainerParams
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
          host: params.domain!,
          http: {
            paths: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: `${params.name}-svc`,
                    port: { number: params.port },
                  },
                },
              },
            ],
          },
        },
      ],
      tls: [
        {
          hosts: [params.domain!],
          secretName: `${params.name}-tls`,
        },
      ],
    },
  };

  const { body } = await client.networking.createNamespacedIngress(namespace, ingress);
  return body;
}
```

---

### Skill 2：创建数据库

```typescript name=src/skills/database/index.ts
import { getK8sClient } from '../../core/k8s-client';
import { CreateDatabaseParams, SkillResult, DatabaseConnectionInfo } from '../../core/types';
import { getMySQLClusterSpec } from './mysql';
import { getPostgreSQLClusterSpec } from './postgresql';
import { getMongoDBClusterSpec } from './mongodb';
import { getRedisClusterSpec } from './redis';
import * as crypto from 'crypto';

/** 数据库 CRD 相关常量 (Sealos 使用 KubeBlocks 管理数据库) */
const DB_CRD_GROUP = 'apps.kubeblocks.io';
const DB_CRD_VERSION = 'v1alpha1';
const DB_CRD_PLURAL = 'clusters';

/**
 * Skill 2: 创建数据库集群
 * 使用 Sealos 内置的 KubeBlocks Operator 创建数据库
 */
export async function createDatabase(params: CreateDatabaseParams): Promise<SkillResult> {
  const client = getK8sClient();
  const namespace = client.getNamespace();

  // 1. 生成随机密码
  const password = crypto.randomBytes(16).toString('hex');

  // 2. 根据类型获取对应的数据库 Cluster Spec
  let clusterSpec: Record<string, any>;
  let defaultPort: number;

  switch (params.type) {
    case 'mysql':
      clusterSpec = getMySQLClusterSpec(params, namespace, password);
      defaultPort = 3306;
      break;
    case 'postgresql':
      clusterSpec = getPostgreSQLClusterSpec(params, namespace, password);
      defaultPort = 5432;
      break;
    case 'mongodb':
      clusterSpec = getMongoDBClusterSpec(params, namespace, password);
      defaultPort = 27017;
      break;
    case 'redis':
      clusterSpec = getRedisClusterSpec(params, namespace, password);
      defaultPort = 6379;
      break;
    default:
      return {
        success: false,
        message: `❌ 不支持的数据库类型: ${params.type}\n支持的类型: mysql, postgresql, mongodb, redis`,
      };
  }

  try {
    // 3. 通过 CustomObjectsApi 创建数据库集群 CR
    await client.customObjects.createNamespacedCustomObject(
      DB_CRD_GROUP,
      DB_CRD_VERSION,
      namespace,
      DB_CRD_PLURAL,
      clusterSpec
    );

    // 4. 构建连接信息
    const svcHost = `${params.name}-${params.type}.${namespace}.svc.cluster.local`;
    const connInfo: DatabaseConnectionInfo = {
      host: svcHost,
      port: defaultPort,
      username: params.type === 'redis' ? '' : 'root',
      password,
      connectionString: buildConnectionString(params.type, svcHost, defaultPort, password),
    };

    return {
      success: true,
      message: [
        `✅ ${params.type.toUpperCase()} 数据库 "${params.name}" 创建成功！`,
        '',
        '📋 **连接信息**:',
        `  Host:     ${connInfo.host}`,
        `  Port:     ${connInfo.port}`,
        connInfo.username ? `  Username: ${connInfo.username}` : '',
        `  Password: ${connInfo.password}`,
        '',
        '🔗 **连接字符串**:',
        `  ${connInfo.connectionString}`,
        '',
        `⏳ 数据库创建中，请稍等 1-3 分钟后即可连接。`,
      ].filter(Boolean).join('\n'),
      data: { connectionInfo: connInfo },
    };
  } catch (err) {
    return {
      success: false,
      message: `❌ 创建 ${params.type} 数据库失败: ${(err as Error).message}`,
    };
  }
}

function buildConnectionString(type: string, host: string, port: number, password: string): string {
  switch (type) {
    case 'mysql':
      return `mysql://root:${password}@${host}:${port}`;
    case 'postgresql':
      return `postgresql://root:${password}@${host}:${port}/postgres`;
    case 'mongodb':
      return `mongodb://root:${password}@${host}:${port}`;
    case 'redis':
      return `redis://:${password}@${host}:${port}`;
    default:
      return '';
  }
}
```

```typescript name=src/skills/database/mysql.ts
import { CreateDatabaseParams } from '../../core/types';

/**
 * 生成 MySQL KubeBlocks Cluster CR
 */
export function getMySQLClusterSpec(
  params: CreateDatabaseParams,
  namespace: string,
  password: string
): Record<string, any> {
  return {
    apiVersion: 'apps.kubeblocks.io/v1alpha1',
    kind: 'Cluster',
    metadata: {
      name: params.name,
      namespace,
      labels: {
        'managed-by': 'sealos-skills',
        'db-type': 'mysql',
      },
    },
    spec: {
      clusterDefinitionRef: 'apecloud-mysql',
      clusterVersionRef: `apecloud-mysql-${params.version || '8.0.30'}`,
      terminationPolicy: 'Delete',
      componentSpecs: [
        {
          name: 'mysql',
          componentDefRef: 'mysql',
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
```

```typescript name=src/skills/database/postgresql.ts
import { CreateDatabaseParams } from '../../core/types';

export function getPostgreSQLClusterSpec(
  params: CreateDatabaseParams,
  namespace: string,
  password: string
): Record<string, any> {
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
```

```typescript name=src/skills/database/mongodb.ts
import { CreateDatabaseParams } from '../../core/types';

export function getMongoDBClusterSpec(
  params: CreateDatabaseParams,
  namespace: string,
  password: string
): Record<string, any> {
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
```

```typescript name=src/skills/database/redis.ts
import { CreateDatabaseParams } from '../../core/types';

export function getRedisClusterSpec(
  params: CreateDatabaseParams,
  namespace: string,
  password: string
): Record<string, any> {
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
```

---

### 入口文件：Skills 注册与路由

```typescript name=src/index.ts
import { initSkill } from './skills/init';
import { deployContainer } from './skills/deploy';
import { createDatabase } from './skills/database';
import { DeployContainerParams, CreateDatabaseParams, SkillResult } from './core/types';

/**
 * Sealos Skills 引擎
 * 提供统一的接口来调用各个 Skill
 */
export class SealosSkills {
  /**
   * Skill 0: 初始化
   * 引导用户配置 kubeconfig
   */
  async init(kubeconfigContent?: string): Promise<SkillResult> {
    return initSkill(kubeconfigContent);
  }

  /**
   * Skill 1: 部署容器
   * 创建 Deployment + Service + Ingress
   *
   * @example
   * await skills.deploy({
   *   name: 'my-nginx',
   *   image: 'nginx:latest',
   *   port: 80,
   *   replicas: 2,
   *   enableIngress: true,
   *   domain: 'my-nginx.cloud.sealos.io'
   * });
   */
  async deploy(params: DeployContainerParams): Promise<SkillResult> {
    return deployContainer(params);
  }

  /**
   * Skill 2: 创建数据库
   * 支持 MySQL, PostgreSQL, MongoDB, Redis
   *
   * @example
   * await skills.createDB({
   *   name: 'my-mysql',
   *   type: 'mysql',
   *   replicas: 1,
   *   storageSize: '10Gi'
   * });
   */
  async createDB(params: CreateDatabaseParams): Promise<SkillResult> {
    return createDatabase(params);
  }
}

// 导出所有类型和子模块
export { DeployContainerParams, CreateDatabaseParams, SkillResult } from './core/types';
export { initSkill } from './skills/init';
export { deployContainer } from './skills/deploy';
export { createDatabase } from './skills/database';
```

---

### package.json

```json name=package.json
{
  "name": "@ai-cd/sealos-skills",
  "version": "0.1.0",
  "description": "Sealos core capabilities as AI skills - deploy containers, create databases, manage kubeconfig",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@kubernetes/client-node": "^0.20.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "eslint": "^8.0.0"
  },
  "keywords": ["sealos", "kubernetes", "skills", "ai", "deploy", "database"],
  "license": "Apache-2.0"
}
```

---

## 四、实现步骤总结

| 阶段 | 步骤 | 说明 |
|------|------|------|
| **Phase 1** | 项目初始化 | 创建目录结构，安装依赖 (`@kubernetes/client-node`) |
| **Phase 2** | Skill 0 - Init | 实现 kubeconfig 验证、持久化到 `~/.kube/sealos/config`、连接测试 |
| **Phase 3** | 核心模块 | 封装 K8s Client（基于 kubeconfig），统一类型定义 |
| **Phase 4** | Skill 1 - Deploy | 实现 Deployment/Service/Ingress 创建，支持参数化配置 |
| **Phase 5** | Skill 2 - Database | 实现 KubeBlocks CRD 创建（MySQL/PG/Mongo/Redis），解析连接信息 |
| **Phase 6** | 测试 | 单元测试 + 集成测试（使用真实 Sealos 集群） |
| **Phase 7** | 文档 | 编写 README、使用示例、API 文档 |

### 关键技术点

1. **Sealos 使用 KubeBlocks 管理数据库** — 数据库创建本质上是通过 `apps.kubeblocks.io/v1alpha1` CRD 的 `Cluster` 资源完成的
2. **Kubeconfig 持久化** — 保存到 `~/.kube/sealos/config`，权限设为 `0o600`
3. **Namespace 从 kubeconfig 的 context 中自动获取** — Sealos 每个用户有独立的 namespace
4. **数据库连接信息** — 通过 Service DNS (`{name}.{namespace}.svc.cluster.local`) 自动构建
