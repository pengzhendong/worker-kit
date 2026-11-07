import { cloudflareContext } from '../context';
import { verification } from '../../../fullstack-shared/backend';
export const loader = ({ request, context }) =>
  verification(request, context.get(cloudflareContext).env, 'react-router');
export const action = loader;
