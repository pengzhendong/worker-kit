import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { canAccessModule, canPerform } from '../modules';
import type { ModuleAccess, ModuleDefinition } from '../modules';

const AccessContext = createContext<{ modules: readonly ModuleDefinition[]; access: ModuleAccess } | null>(null);

/** Presentation checks only. API handlers must independently authorize the same permission keys. */
export function ModuleAccessProvider({ modules, access, children }: { modules: readonly ModuleDefinition[]; access: ModuleAccess; children: ReactNode }) {
  return <AccessContext.Provider value={{ modules, access }}>{children}</AccessContext.Provider>;
}
export function useModuleAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error('ModuleAccessProvider is required');
  const { modules, access } = context;
  return {
    modules, access,
    can: (permission: string) => canPerform(modules, permission, access),
    canOpen: (id: string) => { const module = modules.find((entry) => entry.id === id); return !!module && canAccessModule(module, access); },
  };
}
