import { env } from 'cloudflare:workers';
import { verification } from '../../../../fullstack-shared/backend';
const handle = ({ request }) => verification(request, env, 'astro');
export const GET = handle;
export const POST = handle;
