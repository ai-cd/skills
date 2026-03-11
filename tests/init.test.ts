const loadFromString = jest.fn();
const loadFromFile = jest.fn();
const getClusters = jest.fn();
const getContexts = jest.fn();
const listNamespace = jest.fn();
const makeApiClient = jest.fn();

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn().mockReturnValue(undefined),
  writeFileSync: jest.fn().mockReturnValue(undefined),
}));

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromString,
    loadFromFile,
    getClusters,
    getContexts,
    makeApiClient,
  })),
  CoreV1Api: function CoreV1Api() {},
}));

import * as fs from 'fs';
import { initSkill, SEALOS_KUBECONFIG_PATH } from '../src/skills/init';

describe('initSkill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getClusters.mockReturnValue([{}]);
    getContexts.mockReturnValue([{}]);
    makeApiClient.mockReturnValue({ listNamespace });
    listNamespace.mockResolvedValue({});
  });

  it('returns existing kubeconfig path when config already exists', async () => {
    jest.mocked(fs.existsSync).mockReturnValue(true);

    const result = await initSkill();

    expect(result.success).toBe(true);
    expect(result.kubeconfigPath).toBe(SEALOS_KUBECONFIG_PATH);
  });

  it('returns validation error for invalid kubeconfig content', async () => {
    jest.mocked(fs.existsSync).mockReturnValue(false);
    loadFromString.mockImplementation(() => {
      throw new Error('bad config');
    });

    const result = await initSkill('invalid');

    expect(result.success).toBe(false);
    expect(result.message).toContain('kubeconfig 格式验证失败');
  });

  it('writes kubeconfig and validates connection', async () => {
    jest.mocked(fs.existsSync).mockReturnValue(false);
    loadFromString.mockClear();
    loadFromString.mockImplementation(() => {}); // Reset the error mock from the previous test
    getClusters.mockReturnValue([{ name: 'cluster1', server: 'https://example.com' }]);
    getContexts.mockReturnValue([{ name: 'ctx1', cluster: 'cluster1' }]);

    const result = await initSkill('apiVersion: v1');

    expect(result.success).toBe(true);
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(SEALOS_KUBECONFIG_PATH, 'apiVersion: v1', { mode: 0o600 });
    expect(listNamespace).toHaveBeenCalled();
  });
});