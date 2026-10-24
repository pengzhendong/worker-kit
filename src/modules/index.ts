/** Plain application metadata. This entry has no React, Hono or storage dependencies. */
export interface ModuleDefinition {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly path: `/${string}`;
  readonly icon?: string;
  readonly navigation?: { readonly placement: 'sidebar' | 'user'; readonly order: number };
  /** Action names map to human-readable labels. Permission keys are `${id}:${action}`. */
  readonly actions: Readonly<Record<string, string>>;
  /** Required action for opening the page. Omit for authenticated-only utility pages. */
  readonly access?: string;
  readonly enabled?: boolean;
  readonly developmentOnly?: boolean;
}
export type ModulePermission<M extends ModuleDefinition = ModuleDefinition> = M extends ModuleDefinition
  ? `${M['id']}:${Extract<keyof M['actions'], string>}` : never;
export interface ModuleEnvironment { readonly development?: boolean }
export interface ModuleAccess extends ModuleEnvironment {
  readonly authenticated: boolean;
  readonly permissions: readonly string[];
}
export interface AccessSnapshot { permissions: string[] }

const identifier = /^[a-z][a-z0-9-]*$/;
const route = /^\/(?:[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*)?$/;

/** Explicit composition, with startup validation and immutable copies; no global registration. */
export function defineModules<const T extends readonly ModuleDefinition[]>(modules: T): Readonly<T> {
  const ids = new Set<string>(); const paths = new Set<string>();
  const result = modules.map((module) => {
    if (!identifier.test(module.id) || !module.label.trim() || !route.test(module.path)) throw new Error(`Invalid module: ${module.id}`);
    if (ids.has(module.id) || paths.has(module.path)) throw new Error(`Duplicate module ID or path: ${module.id}`);
    ids.add(module.id); paths.add(module.path);
    if (module.enabled !== undefined && typeof module.enabled !== 'boolean' || module.developmentOnly !== undefined && typeof module.developmentOnly !== 'boolean') throw new Error(`Invalid module availability: ${module.id}`);
    if (module.navigation && (!['sidebar', 'user'].includes(module.navigation.placement) || !Number.isFinite(module.navigation.order))) throw new Error(`Invalid module navigation: ${module.id}`);
    for (const [action, label] of Object.entries(module.actions)) {
      if (!identifier.test(action) || !label.trim()) throw new Error(`Invalid module action: ${module.id}:${action}`);
    }
    if (module.access !== undefined && !Object.hasOwn(module.actions, module.access)) throw new Error(`Undeclared page action: ${module.id}:${module.access}`);
    return Object.freeze({ ...module, actions: Object.freeze({ ...module.actions }), ...(module.navigation ? { navigation: Object.freeze({ ...module.navigation }) } : {}) });
  });
  return Object.freeze(result) as unknown as Readonly<T>;
}

export function isModuleEnabled(module: ModuleDefinition, environment: ModuleEnvironment = {}): boolean {
  return module.enabled !== false && (!module.developmentOnly || environment.development === true);
}
export function listModulePermissions(modules: readonly ModuleDefinition[], environment: ModuleEnvironment = {}): string[] {
  return modules.filter((module) => isModuleEnabled(module, environment)).flatMap((module) => Object.keys(module.actions).map((action) => `${module.id}:${action}`));
}
/** Exact declared permissions only: no wildcard, implicit administrator, or read/write inheritance. */
export function canPerform(modules: readonly ModuleDefinition[], permission: string, access: ModuleAccess): boolean {
  return access.authenticated === true && listModulePermissions(modules, access).includes(permission) && access.permissions.includes(permission);
}
export function canAccessModule(module: ModuleDefinition, access: ModuleAccess): boolean {
  return access.authenticated === true && isModuleEnabled(module, access) &&
    (module.access === undefined || canPerform([module], `${module.id}:${module.access}`, access));
}
export function getModuleNavigation(modules: readonly ModuleDefinition[], placement: 'sidebar' | 'user', access: ModuleAccess): ModuleDefinition[] {
  return modules.filter((module) => module.navigation?.placement === placement && canAccessModule(module, access))
    .sort((a, b) => a.navigation!.order - b.navigation!.order);
}
/** Resolve exact page paths independently of visibility and authorization; the caller checks access. */
export function resolveModule(modules: readonly ModuleDefinition[], path: string, environment: ModuleEnvironment = {}): ModuleDefinition | undefined {
  return modules.find((module) => module.path === path && isModuleEnabled(module, environment));
}
