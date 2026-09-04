export const permissions = [
  'accounting.read',
  'accounting.post',
  'accounting.reverse',
  'audit.read',
  'audit.approve',
  'evidence.read',
  'evidence.sign',
  'workflow.read',
  'workflow.approve',
  'ai.use',
  'voice.use',
  'integrations.read',
  'integrations.manage',
  'admin.manage'
] as const;

export type Permission = (typeof permissions)[number];

const permissionSet = new Set<string>(permissions);
export function isPermission(value: string): value is Permission {
  return permissionSet.has(value);
}
