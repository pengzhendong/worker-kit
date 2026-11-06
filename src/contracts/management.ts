import type { ApiKeyInfo } from './api-keys';
type SettingValue = string | number | boolean;
export type ManagementPrincipal = {
  id: string;
  name: string;
  permissions: readonly string[];
};
export type ManagementCapabilities = {
  runtime: boolean;
  settings: { read: boolean; manage: boolean };
  keys: { manage: boolean };
  audit: { read: boolean };
  tasks: { read: boolean; manage: boolean };
};
export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
};
export type ManagementPage<T> = { items: T[]; cursor: string | null };
export type ManagementSnapshot = {
  capabilities: ManagementCapabilities;
  settings: {
    values: Record<string, SettingValue>;
    updatedAt: string | null;
  } | null;
  keys: ManagementPage<ApiKeyInfo> | null;
  audit: ManagementPage<AuditEntry> | null;
};
