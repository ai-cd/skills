# Sealos Skills

将 Sealos 的核心能力封装成可复用的 TypeScript Skills：

- `init`：引导用户配置并验证 `~/.kube/sealos/config`
- `deploy`：创建 `Deployment`、`Service`、可选 `Ingress`
- `createDB`：创建 MySQL、PostgreSQL、MongoDB、Redis 数据库集群

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 测试

```bash
npm test
```

## 示例

```ts
import { SealosSkills } from '@ai-cd/sealos-skills';

const skills = new SealosSkills();

await skills.init(kubeconfigText);

await skills.deploy({
	name: 'my-nginx',
	image: 'nginx:latest',
	port: 80,
	replicas: 2,
	enableIngress: true,
	domain: 'my-nginx.cloud.sealos.io',
});

await skills.createDB({
	name: 'orders-db',
	type: 'postgresql',
	storageSize: '10Gi',
});
```