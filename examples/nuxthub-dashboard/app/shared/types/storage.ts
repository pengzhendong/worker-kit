export interface HubSnapshot {
  notes: { id: string; title: string; createdAt: string }[];
  label: string;
  files: { pathname: string; size: number; uploadedAt: string }[];
  cache: { generatedAt: string };
  drivers: Record<'db' | 'kv' | 'blob' | 'cache', string>;
}
