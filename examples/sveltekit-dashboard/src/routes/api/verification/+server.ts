import { env } from 'cloudflare:workers';
import { verification } from '../../../../../fullstack-shared/backend';
const handle = ({ request, platform }) =>
  verification(request, env, 'sveltekit');
export const GET = handle;
export const POST = handle;
