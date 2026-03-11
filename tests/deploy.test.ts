jest.mock('../src/core/k8s-client', () => ({
  getK8sClient: jest.fn(),
}));

jest.mock('../src/skills/deploy/deployment', () => ({
  createDeployment: jest.fn(),
}));

jest.mock('../src/skills/deploy/service', () => ({
  createService: jest.fn(),
}));

jest.mock('../src/skills/deploy/ingress', () => ({
  createIngress: jest.fn(),
}));

import { getK8sClient } from '../src/core/k8s-client';
import { deployContainer } from '../src/skills/deploy';
import { createDeployment } from '../src/skills/deploy/deployment';
import { createIngress } from '../src/skills/deploy/ingress';
import { createService } from '../src/skills/deploy/service';

describe('deployContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getK8sClient).mockReturnValue({
      getNamespace: () => 'demo',
    } as never);
    jest.mocked(createDeployment).mockResolvedValue({ metadata: { name: 'demo-app' } } as never);
    jest.mocked(createService).mockResolvedValue({
      metadata: { name: 'demo-app-svc' },
      spec: { clusterIP: '10.0.0.8' },
    } as never);
    jest.mocked(createIngress).mockResolvedValue({ metadata: { name: 'demo-app-ingress' } } as never);
  });

  it('creates deployment, service, and ingress', async () => {
    const result = await deployContainer({
      name: 'demo-app',
      image: 'nginx:latest',
      port: 80,
      enableIngress: true,
      domain: 'demo.example.com',
    });

    expect(result.success).toBe(true);
    expect(createDeployment).toHaveBeenCalled();
    expect(createService).toHaveBeenCalled();
    expect(createIngress).toHaveBeenCalled();
  });

  it('returns validation error when ingress domain is missing', async () => {
    const result = await deployContainer({
      name: 'demo-app',
      image: 'nginx:latest',
      port: 80,
      enableIngress: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('参数校验失败');
  });
});