import type { PageQuery, Sort } from '../contracts';
import { ApiError } from './app';

const pageKeys = ['page', 'pageSize', 'q', 'sort', 'order'];
function invalid(field: string, message: string): never {
  throw new ApiError(400, 'invalid_query', '查询参数无效', [{ path: [field], message }]);
}
function checkKeys(params: URLSearchParams, allowed: readonly string[]) {
  for (const key of params.keys()) {
    if (!allowed.includes(key)) invalid(key, '不支持此查询参数');
    if (params.getAll(key).length !== 1) invalid(key, '查询参数不能重复');
  }
}
function integer(params: URLSearchParams, key: string, fallback: number, maximum: number) {
  const value = params.get(key);
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > maximum) {
    invalid(key, `请输入 1–${maximum} 的整数`);
  }
  return Number(value);
}
function limits(defaultSize: number, maximum: number, maxPage = 1) {
  if (![defaultSize, maximum, maxPage].every((value) => Number.isSafeInteger(value) && value > 0)
    || defaultSize > maximum || !Number.isSafeInteger(maxPage * maximum)) throw new Error('Invalid pagination configuration');
}

/** Parse only declared fields. A sort field is a key, never a SQL expression. */
export function readPageQuery<Field extends string = never, Filter extends string = never>(params: URLSearchParams, options: {
  sortFields?: readonly Field[];
  filterFields?: readonly Filter[];
  defaultSort?: Sort<Field>;
  defaultPageSize?: number;
  maxPageSize?: number;
  maxPage?: number;
} = {}): PageQuery<Field, Filter> & { offset: number } {
  const { sortFields = [], filterFields = [], defaultSort, defaultPageSize = 20, maxPageSize = 100, maxPage = 10000 } = options;
  limits(defaultPageSize, maxPageSize, maxPage);
  if (filterFields.some((key) => pageKeys.includes(key)) || (defaultSort && (!sortFields.includes(defaultSort.field) || !['asc', 'desc'].includes(defaultSort.order)))) {
    throw new Error('Invalid query field configuration');
  }
  checkKeys(params, [...pageKeys, ...filterFields]);
  const page = integer(params, 'page', 1, maxPage);
  const pageSize = integer(params, 'pageSize', defaultPageSize, maxPageSize);
  const q = (params.get('q') ?? '').trim();
  if (q.length > 100) invalid('q', '搜索内容不能超过 100 个字符');
  const field = params.get('sort');
  const order = params.get('order');
  let sort = defaultSort;
  if (field !== null || order !== null) {
    if (!sortFields.includes(field as Field)) invalid('sort', '不支持此排序字段');
    if (order !== 'asc' && order !== 'desc') invalid('order', '排序方向必须为 asc 或 desc');
    sort = { field: field as Field, order };
  }
  const filters: Partial<Record<Filter, string>> = {};
  for (const key of filterFields) {
    const value = params.get(key);
    if (value) {
      if (value.length > 100) invalid(key, '筛选值不能超过 100 个字符');
      Object.defineProperty(filters, key, { value, enumerable: true });
    }
  }
  return { page, pageSize, q, sort, filters, offset: (page - 1) * pageSize };
}

export function readCursorQuery(params: URLSearchParams, options: { defaultPageSize?: number; maxPageSize?: number } = {}) {
  const { defaultPageSize = 100, maxPageSize = 100 } = options;
  limits(defaultPageSize, maxPageSize);
  checkKeys(params, ['cursor', 'pageSize']);
  const cursor = params.get('cursor') || undefined;
  if (cursor && cursor.length > 2048) invalid('cursor', '游标过长');
  return { cursor, pageSize: integer(params, 'pageSize', defaultPageSize, maxPageSize) };
}
