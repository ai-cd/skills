import { CreateDatabaseParams, DeployContainerParams } from '../core/types';

const DNS_1123_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateK8sResourceName(name: string, fieldName = 'name'): void {
  assert(Boolean(name?.trim()), `${fieldName} is required.`);
  assert(name.length <= 63, `${fieldName} must be 63 characters or fewer.`);
  assert(DNS_1123_LABEL.test(name), `${fieldName} must be a valid DNS-1123 label.`);
}

export function validateDeployParams(params: DeployContainerParams): void {
  validateK8sResourceName(params.name);
  assert(Boolean(params.image?.trim()), 'image is required.');
  assert(Number.isInteger(params.port) && params.port > 0 && params.port <= 65535, 'port must be between 1 and 65535.');

  if (params.replicas !== undefined) {
    assert(Number.isInteger(params.replicas) && params.replicas > 0, 'replicas must be a positive integer.');
  }

  if (params.enableIngress) {
    assert(Boolean(params.domain?.trim()), 'domain is required when enableIngress is true.');
  }
}

export function validateDatabaseParams(params: CreateDatabaseParams): void {
  validateK8sResourceName(params.name);

  if (params.replicas !== undefined) {
    assert(Number.isInteger(params.replicas) && params.replicas > 0, 'replicas must be a positive integer.');
  }

  const supportedTypes = new Set(['mysql', 'postgresql', 'mongodb', 'redis']);
  assert(supportedTypes.has(params.type), `unsupported database type: ${params.type}.`);
}