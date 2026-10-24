/** Management API contract version; independent of the package version. No runtime dependencies. */
export const adminContractVersion = 1 as const;

export interface FieldIssue {
  path: (string | number)[];
  message: string;
}

export interface ApiFailure {
  error: { code: string; message: string; fields?: FieldIssue[] };
  requestId: string;
}

export interface Sort<Field extends string = string> { field: Field; order: 'asc' | 'desc' }
export interface PageQuery<Field extends string = string, Filter extends string = string> {
  page: number;
  pageSize: number;
  q: string;
  sort?: Sort<Field>;
  filters: Partial<Record<Filter, string>>;
}
export interface PageList<Item> { items: Item[]; total: number; page: number; pageSize: number }
/** Opaque cursor; null means the final page. No invented total or page number. */
export interface CursorList<Item> { items: Item[]; cursor: string | null }

/** Every distinct requested ID must occur in exactly one of these arrays. */
export interface BatchResult<Id extends string | number = string> {
  succeeded: Id[];
  failed: { id: Id; code: string; message: string }[];
}
export type { ApiKeyInfo } from './api-keys';
