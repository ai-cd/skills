export interface DeployContainerParams {
  name: string;
  image: string;
  replicas?: number;
  port: number;
  cpu?: string;
  memory?: string;
  envVars?: Record<string, string>;
  enableIngress?: boolean;
  domain?: string;
}

export interface CreateDatabaseParams {
  name: string;
  type: 'mysql' | 'postgresql' | 'mongodb' | 'redis';
  version?: string;
  replicas?: number;
  storageSize?: string;
  cpu?: string;
  memory?: string;
}

export interface SkillResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface InitResult extends SkillResult {
  kubeconfigPath?: string;
}

export interface DatabaseConnectionInfo {
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  connectionString: string;
}