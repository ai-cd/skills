export function buildInitInstructions(): string {
  return [
    '🔧 **Sealos Skills 初始化**',
    '',
    '请按以下步骤操作：',
    '1. 登录 Sealos Cloud (https://cloud.sealos.io)',
    '2. 进入「设置」→「Kubeconfig」',
    '3. 复制完整的 kubeconfig 内容',
    '4. 将 kubeconfig 内容粘贴到聊天框中',
    '',
    '⚠️ kubeconfig 将被保存到 `~/.kube/sealos/config`',
  ].join('\n');
}