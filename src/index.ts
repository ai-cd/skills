import { CreateDatabaseParams, DeployContainerParams, SkillResult } from './core/types';
import { createDatabase } from './skills/database';
import { deployContainer } from './skills/deploy';
import { initSkill } from './skills/init';

export class SealosSkills {
  async init(kubeconfigContent?: string): Promise<SkillResult> {
    return initSkill(kubeconfigContent);
  }

  async deploy(params: DeployContainerParams): Promise<SkillResult> {
    return deployContainer(params);
  }

  async createDB(params: CreateDatabaseParams): Promise<SkillResult> {
    return createDatabase(params);
  }
}

export { initSkill } from './skills/init';
export { deployContainer } from './skills/deploy';
export { createDatabase } from './skills/database';
export type {
  CreateDatabaseParams,
  DatabaseConnectionInfo,
  DeployContainerParams,
  InitResult,
  SkillResult,
} from './core/types';