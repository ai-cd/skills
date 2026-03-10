import { CoreV1Api, KubeConfig } from '@kubernetes/client-node';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InitResult } from '../../core/types';
import { buildInitInstructions } from './templates';

const SEALOS_KUBECONFIG_DIR = path.join(os.homedir(), '.kube', 'sealos');
const SEALOS_KUBECONFIG_PATH = path.join(SEALOS_KUBECONFIG_DIR, 'config');

function validateKubeconfig(kubeconfigContent: string): void {
  const kc = new KubeConfig();
  kc.loadFromString(kubeconfigContent);

  if (kc.getClusters().length === 0 || kc.getContexts().length === 0) {
    throw new Error('kubeconfig 中没有找到有效的 cluster 或 context');
  }
}

async function testConnection(): Promise<void> {
  const kc = new KubeConfig();
  kc.loadFromFile(SEALOS_KUBECONFIG_PATH);
  const coreApi = kc.makeApiClient(CoreV1Api);
  await coreApi.listNamespace();
}

export async function initSkill(kubeconfigContent?: string): Promise<InitResult> {
  if (fs.existsSync(SEALOS_KUBECONFIG_PATH) && !kubeconfigContent) {
    return {
      success: true,
      message: `✅ Sealos kubeconfig 已存在于: ${SEALOS_KUBECONFIG_PATH}\n如需更新，请将新的 kubeconfig 内容粘贴到聊天框中。`,
      kubeconfigPath: SEALOS_KUBECONFIG_PATH,
    };
  }

  if (!kubeconfigContent) {
    return {
      success: false,
      message: buildInitInstructions(),
    };
  }

  try {
    validateKubeconfig(kubeconfigContent);
  } catch (error) {
    return {
      success: false,
      message: `❌ kubeconfig 格式验证失败: ${(error as Error).message}\n请检查内容后重试。`,
    };
  }

  try {
    fs.mkdirSync(SEALOS_KUBECONFIG_DIR, { recursive: true });
    fs.writeFileSync(SEALOS_KUBECONFIG_PATH, kubeconfigContent, { mode: 0o600 });
  } catch (error) {
    return {
      success: false,
      message: `❌ 写入 kubeconfig 失败: ${(error as Error).message}`,
    };
  }

  try {
    await testConnection();
  } catch (error) {
    return {
      success: true,
      message: `⚠️ kubeconfig 已保存到 ${SEALOS_KUBECONFIG_PATH}，但连接测试失败: ${(error as Error).message}\n请检查网络和凭证。`,
      kubeconfigPath: SEALOS_KUBECONFIG_PATH,
    };
  }

  return {
    success: true,
    message: `✅ Sealos kubeconfig 初始化成功！\n📁 保存路径: ${SEALOS_KUBECONFIG_PATH}\n🔗 集群连接测试通过`,
    kubeconfigPath: SEALOS_KUBECONFIG_PATH,
  };
}

export { SEALOS_KUBECONFIG_DIR, SEALOS_KUBECONFIG_PATH };