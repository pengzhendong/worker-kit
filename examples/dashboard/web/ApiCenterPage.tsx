import { useModuleAccess } from '@pengzhendong/worker-kit/web';
import { ApiCenter, ApiTokenPanel } from '@pengzhendong/worker-kit/web/api-center';
import { api, sessionScope } from './data';

export function ApiCenterPage() {
  const { can, modules } = useModuleAccess();
  const permissionLabel = (permission: string) => { const [id, action] = permission.split(':'); const module = modules.find((item) => item.id === id); return `${module?.label ?? id} · ${module?.actions[action!] ?? action}`; };
  return <ApiCenter client={api} scope={sessionScope} tokenPanel={can('api:tokens') ? <ApiTokenPanel client={api} scope={sessionScope} access={{ read: can('api:tokens'), issue: can('api:issue'), revoke: can('api:revoke') }} permissionLabel={permissionLabel} description="令牌只能使用选择的业务权限，不能登录后台或管理其他令牌。完整令牌只显示一次，请自行保存。每个令牌每分钟最多 120 次请求，按 Cloudflare 节点分别计数。" /> : undefined} />;
}
