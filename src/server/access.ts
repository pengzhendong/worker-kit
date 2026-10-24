import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { defineModules, isModuleEnabled, listModulePermissions } from '../modules';
import type { ModuleDefinition, ModulePermission } from '../modules';
import { ApiError } from './app';
import type { WorkerEnv } from './app';

/** Run application authentication first. Resolve grants from trusted server state, never request input. */
export function createModuleAccess<B extends object, const M extends readonly ModuleDefinition[] = readonly ModuleDefinition[]>(options: {
  modules: M;
  development?: boolean;
  /** null = no authenticated identity; [] = authenticated with no grants. */
  resolvePermissions: (context: Context<WorkerEnv<B>>) => readonly string[] | null | Promise<readonly string[] | null>;
}) {
  const modules = defineModules(options.modules);
  const declared = new Set(modules.flatMap((module) => Object.keys(module.actions).map((action) => `${module.id}:${action}`)));
  const active = new Set(listModulePermissions(modules, options));
  const pending = new WeakMap<Context<WorkerEnv<B>>, Promise<string[]>>();
  function permissions(c: Context<WorkerEnv<B>>): Promise<string[]> {
    let value = pending.get(c);
    if (!value) {
      value = (async () => {
        const grants = await options.resolvePermissions(c);
        if (grants === null) throw new ApiError(401, 'unauthorized', '请先登录');
        if (!Array.isArray(grants) || grants.some((grant) => typeof grant !== 'string')) throw new ApiError(503, 'access_unconfigured', '权限配置无效');
        return [...new Set(grants.filter((grant) => active.has(grant)))];
      })();
      pending.set(c, value);
    }
    return value;
  }
  function require(permission: ModulePermission<M[number]>) {
    if (!declared.has(permission)) throw new Error(`Undeclared permission: ${permission}`);
    return createMiddleware<WorkerEnv<B>>(async (c, next) => {
      c.header('Cache-Control', 'no-store');
      const grants = await permissions(c);
      const module = modules.find((entry) => permission.startsWith(`${entry.id}:`))!;
      if (!isModuleEnabled(module, options) || !grants.includes(permission)) throw new ApiError(403, 'forbidden', '没有执行此操作的权限');
      await next();
    });
  }
  return { permissions, require };
}
