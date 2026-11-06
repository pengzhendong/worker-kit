import type { OpenAPIV3_1 as O } from 'openapi-types';
export const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
export type ApiOperation = { id: string; method: string; path: string; summary: string; group: string; authentication: string };
export function listOperations(document: O.Document | null): ApiOperation[] {
  return Object.entries(document?.paths || {}).flatMap(([path, item]) => methods.flatMap(method => {
    const operation = (item as Record<string, unknown> | undefined)?.[method] as (O.OperationObject & { 'x-authentication-label'?: string }) | undefined;
    if (!operation) return [];
    const security = operation.security ?? document?.security ?? [];
    return [{ id: operation.operationId || '', method: method.toUpperCase(), path, summary: operation.summary || '', group: operation.tags?.[0] || '其他', authentication: operation['x-authentication-label'] || (security.length ? security.flatMap(value => Object.keys(value)).join(' / ') : '公开') }];
  }));
}
