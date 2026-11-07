import { createContext } from 'react-router';
import type { FrameworkEnv } from '../../fullstack-shared/backend';
export const cloudflareContext = createContext<{
  env: FrameworkEnv;
  ctx: ExecutionContext;
}>();
