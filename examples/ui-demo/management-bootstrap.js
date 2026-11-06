import { Modal } from 'bootstrap';
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
let section = '',
  selected = '';
const button = (action, label, disabled = false, extra = '') =>
  `<button type="button" class="btn btn-sm btn-outline-primary" data-management-action="${action}" ${disabled ? 'disabled' : ''} ${extra}>${label}</button>`;
const table = (headers, rows) =>
  `<div class="table-responsive"><table class="table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
export function managementPanel(state, client) {
  const data = state.data?.management;
  if (!data) return '';
  const tabs = [
    ...(data.capabilities.settings.read ? [['settings', 'KV 设置']] : []),
    ...(data.capabilities.keys.manage ? [['keys', '访问密钥']] : []),
    ...(data.capabilities.audit.read ? [['audit', '操作审计']] : []),
    ['api', 'API 中心'],
  ];
  let content = '';
  if (section === 'settings' && data.settings) {
    const labels = {
      siteTitle: '站点名称',
      refreshSeconds: '刷新间隔（秒）',
      maintenance: '维护模式',
    };
    content = `<h3>KV 设置</h3><form id="management-settings" class="d-flex gap-3 flex-wrap align-items-end">${Object.entries(
      data.settings.values,
    )
      .map(
        ([key, value]) =>
          `<label class="form-label">${escape(labels[key] || key)}<input class="${typeof value === 'boolean' ? 'form-check-input' : 'form-control'}" name="${escape(key)}" type="${typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text'}" ${typeof value === 'boolean' ? (value ? 'checked' : '') : `value="${escape(value)}"`} ${!data.capabilities.settings.manage ? 'disabled' : ''}></label>`,
      )
      .join(
        '',
      )}<button type="submit" class="btn btn-primary" ${state.busy || !data.capabilities.settings.manage ? 'disabled' : ''}>保存设置</button></form><p class="mt-3">仅保存声明的非敏感字段；KV 跨区域同步可能短暂延迟。</p>`;
  }
  if (section === 'keys' && data.keys)
    content = `<h3>访问密钥</h3><form id="management-issue" class="d-flex gap-3 flex-wrap align-items-end mb-4"><label>名称<input class="form-control" name="name" maxlength="80" required></label><label>有效期（天）<input class="form-control" name="days" type="number" min="1" max="365" value="30" required></label><button class="btn btn-primary" ${state.busy ? 'disabled' : ''}>签发密钥</button></form>${state.issuedToken ? `<div role="status"><p>完整令牌只显示一次，请保存后关闭。</p><code data-issued-token style="display:block;overflow-wrap:anywhere">${escape(state.issuedToken)}</code>${button('close-token', '已保存，关闭')}</div>` : ''}${table(
      ['名称', '前缀', '状态', '操作'],
      data.keys.items.map(
        (key) =>
          `<tr><td>${escape(key.name)}</td><td>${escape(key.prefix)}</td><td>${key.revokedAt ? '已撤销' : Date.parse(key.expiresAt) <= Date.now() ? '已过期' : '有效'}</td><td>${!key.revokedAt ? button('revoke', '撤销', false, `data-key="${escape(key.id)}"`) : ''}</td></tr>`,
      ),
    )}<div class="d-flex gap-3">${button('keys-first', '返回首页', state.busy)}${button('keys-next', '下一页密钥', state.busy || !data.keys.cursor)}</div>`;
  if (section === 'audit' && data.audit)
    content = `<h3>操作审计</h3><p>最近 30 天的安全操作元数据；不记录配置值、密码或完整令牌，采用尽力写入。</p>${table(
      ['时间', '操作人', '动作', '对象'],
      data.audit.items.map(
        (item) =>
          `<tr><td>${escape(new Date(item.at).toLocaleString('zh-CN'))}</td><td>${escape(item.actor)}</td><td>${escape(item.action)}</td><td>${escape(item.target)}</td></tr>`,
      ),
    )}<div class="d-flex gap-3">${button('audit-first', '返回首页', state.busy)}${button('audit-next', '下一页审计', state.busy || !data.audit.cursor)}</div>`;
  if (section === 'api')
    content = `<h3>API 中心</h3><p>使用当前后端的原生登录，调试写接口会修改真实数据。</p><a target="_blank" rel="noopener" href="${escape(client.apiUrl('/reference'))}">打开交互式 API 文档 ↗</a><p><a target="_blank" rel="noopener" href="${escape(client.apiUrl('/openapi.json'))}">查看 OpenAPI 声明</a></p>`;
  return `<section data-management class="card mb-4"><div class="card-header"><h2 class="card-title">管理功能</h2></div><div class="card-body"><p>与当前后端共用登录；配置、密钥和审计按后端隔离。</p><nav aria-label="管理功能" class="d-flex flex-wrap gap-2 my-3">${tabs.map(([key, label]) => button('section', label, false, `data-section="${key}"`)).join('')}</nav>${content}</div></section>`;
}
export function installManagement(client, render) {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div class="modal fade" id="management-revoke" tabindex="-1" aria-labelledby="management-revoke-title"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2 id="management-revoke-title" class="modal-title fs-5">撤销访问密钥？</h2></div><div class="modal-body">撤销后不可恢复。KV 跨区域同步可能短暂延迟。</div><div class="modal-footer"><button class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button><button class="btn btn-danger" data-management-action="confirm-revoke">确认撤销</button></div></div></div></div>',
  );
  const modal = new Modal(document.querySelector('#management-revoke'));
  client.subscribe(() => {
    if (!client.snapshot().data) {
      section = '';
      selected = '';
      modal.hide();
    }
  });
  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-management-action]');
    if (!target) return;
    const action = target.dataset.managementAction,
      data = client.snapshot().data?.management;
    if (action === 'section') {
      section =
        section === target.dataset.section ? '' : target.dataset.section;
      render();
    }
    if (action === 'close-token') client.closeToken();
    if (action === 'revoke') {
      selected = target.dataset.key;
      modal.show();
    }
    if (action === 'confirm-revoke' && selected) {
      await client.revokeKey(selected);
      modal.hide();
      selected = '';
    }
    if (action === 'keys-first') client.pageKeys();
    if (action === 'keys-next' && data?.keys?.cursor)
      client.pageKeys(data.keys.cursor);
    if (action === 'audit-first') client.pageAudit();
    if (action === 'audit-next' && data?.audit?.cursor)
      client.pageAudit(data.audit.cursor);
  });
  document.addEventListener('submit', (event) => {
    if (!['management-settings', 'management-issue'].includes(event.target.id))
      return;
    event.preventDefault();
    const form = new FormData(event.target);
    if (event.target.id === 'management-issue')
      client.issueKey(form.get('name'), form.get('days'));
    else {
      const current =
        client.snapshot().data?.management?.settings?.values || {};
      client.saveSettings(
        Object.fromEntries(
          Object.entries(current).map(([key, value]) => [
            key,
            typeof value === 'boolean'
              ? form.has(key)
              : typeof value === 'number'
                ? Number(form.get(key))
                : String(form.get(key) || ''),
          ]),
        ),
      );
    }
  });
}
