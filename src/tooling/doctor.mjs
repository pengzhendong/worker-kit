#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import semver from 'semver';

const frameworkDefault = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
function git(root, args) { try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } }
function packageInfo(require, name) {
  try { const path = require.resolve(`${name}/package.json`); return { ...readJson(path), location: realpathSync(dirname(path)) }; } catch { /* Some packages do not export package.json. */ }
  let current = dirname(require.resolve(name));
  while (dirname(current) !== current) {
    const path = join(current, 'package.json');
    if (existsSync(path)) { const pkg = readJson(path); if (pkg.name === name) return { ...pkg, location: realpathSync(current) }; }
    current = dirname(current);
  }
  throw new Error('Package not found');
}

/** Offline, read-only preflight. No project scripts, secrets, network calls, migrations or deployments. */
export async function inspectProject({ project = process.cwd(), framework = frameworkDefault, config: requestedConfig, environment, production = false } = {}) {
  project = existsSync(resolve(project)) ? realpathSync(resolve(project)) : resolve(project);
  framework = existsSync(resolve(framework)) ? realpathSync(resolve(framework)) : resolve(framework);
  const checks = []; const add = (id, status, message) => checks.push({ id, status, message });
  const report = { readOnly: true, project, framework: { version: null, commit: git(framework, ['rev-parse', '--short', 'HEAD']) }, checks };
  let frameworkPackage, appPackage;
  try { frameworkPackage = readJson(join(framework, 'package.json')); appPackage = readJson(join(project, 'package.json')); }
  catch { add('package', 'fail', '无法读取项目或框架 package.json'); return report; }
  report.framework.version = frameworkPackage.version;
  for (const [name, range] of [['framework', frameworkPackage.engines?.node], ['project', appPackage.engines?.node]]) {
    if (range) add(`node:${name}`, semver.satisfies(process.version, range) ? 'ok' : 'fail', `Node ${process.version}，要求 ${range}`);
  }
  const projectRequire = createRequire(join(project, 'package.json')); const frameworkRequire = createRequire(join(framework, 'package.json'));
  const declared = { ...appPackage.dependencies, ...appPackage.devDependencies, ...appPackage.peerDependencies };
  const usesUi = !!(declared.react || declared['react-dom'] || declared.antd);
  for (const [name, range] of Object.entries(frameworkPackage.peerDependencies ?? {})) {
    if (frameworkPackage.peerDependenciesMeta?.[name]?.optional && !declared[name] && !(usesUi && ['react', 'react-dom', 'antd', 'react-error-boundary'].includes(name))) continue;
    try {
      const installed = packageInfo(projectRequire, name);
      add(`peer:${name}`, semver.satisfies(installed.version, range) ? 'ok' : 'fail', `${name} ${installed.version}，要求 ${range}`);
      if (name === 'react' || name === 'react-dom' || name === 'hono') {
        try { if (packageInfo(frameworkRequire, name).location !== installed.location) add(`duplicate:${name}`, 'fail', `${name} 在项目与框架中解析到不同副本，请从父项目统一安装`); } catch { /* Peer may resolve only in the host project. */ }
      }
    } catch { add(`peer:${name}`, 'fail', `缺少可解析的依赖 ${name}`); }
  }
  let lockRoot = project;
  while (!existsSync(join(lockRoot, 'package-lock.json')) && dirname(lockRoot) !== lockRoot) lockRoot = dirname(lockRoot);
  if (existsSync(join(lockRoot, 'package-lock.json'))) {
    try { const lock = readJson(join(lockRoot, 'package-lock.json')); add('lockfile', lock.lockfileVersion >= 3 ? 'ok' : 'warn', '已找到父项目 lockfile；预检不安装或更新依赖'); }
    catch { add('lockfile', 'fail', 'package-lock.json 无法解析'); }
  } else add('lockfile', 'warn', '未找到 npm lockfile，请由消费项目固定依赖解析结果');
  const parent = git(framework, ['rev-parse', '--show-superproject-working-tree']);
  if (parent) {
    const link = git(parent, ['ls-files', '--stage', '--', relative(parent, framework)]);
    const current = git(framework, ['rev-parse', 'HEAD']);
    add('submodule', link?.startsWith('160000 ') && link.split(/\s+/)[1] === current ? 'ok' : 'warn', '比较框架 HEAD 与父项目索引中的 submodule 指针；不拉取或切换版本');
  } else add('submodule', 'info', '当前框架是独立检出；消费项目升级时需提交固定的 submodule 指针');
  const dirty = git(framework, ['status', '--porcelain']);
  if (dirty) add('working-tree', 'warn', '框架存在本地修改；升级前请审核并提交，不自动覆盖');

  const configs = requestedConfig ? [resolve(project, requestedConfig)] : ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml'].map((name) => join(project, name)).filter(existsSync);
  if (configs.length !== 1) { add('wrangler', 'fail', '需要唯一 Wrangler 配置；存在多份时通过 --config 选择'); return report; }
  let config;
  try {
    const { unstable_readConfig } = await import('wrangler');
    config = unstable_readConfig({ config: configs[0], ...(environment ? { env: environment } : {}) }, { hideWarnings: true });
    add('wrangler', 'ok', 'Wrangler 配置已由其官方配置读取器解析');
  } catch { add('wrangler', 'fail', 'Wrangler 配置无法解析，或当前 Wrangler 不支持配置读取 API'); return report; }
  add('entry', config.main && existsSync(config.main) ? 'ok' : 'fail', '检查 Worker 入口文件是否存在');
  add('compatibility-date', /^\d{4}-\d{2}-\d{2}$/.test(config.compatibility_date ?? '') && Date.parse(config.compatibility_date) <= Date.now() ? 'ok' : 'fail', '兼容日期必须明确且不晚于当前日期；预检不自动推进日期');
  const sampling = config.observability?.logs?.head_sampling_rate ?? config.observability?.head_sampling_rate ?? 1;
  add('observability', config.observability?.enabled && config.observability?.logs?.enabled !== false && sampling > 0 && sampling <= 1 ? 'ok' : 'warn', '检查 Workers Logs 启用状态与非零采样率；线上保留期由平台套餐决定');
  const bindings = new Map();
  for (const [type, values] of Object.entries({ d1: config.d1_databases ?? [], kv: config.kv_namespaces ?? [], r2: config.r2_buckets ?? [], ratelimit: config.ratelimits ?? [], durable: config.durable_objects?.bindings ?? [], queue: config.queues?.producers ?? [] })) {
    for (const binding of values) {
      const name = binding.binding ?? binding.name;
      if (bindings.has(name)) add(`binding:${name}`, 'fail', `绑定 ${name} 重复声明`);
      bindings.set(name, type);
      if (production && (type === 'd1' && !binding.database_id || type === 'kv' && !binding.id || type === 'r2' && !binding.bucket_name)) add(`production:${name}`, 'fail', `绑定 ${name} 缺少生产资源标识`);
    }
  }
  const requirementsPath = join(project, 'workerkit.check.json');
  if (existsSync(requirementsPath)) {
    try {
      const requirements = readJson(requirementsPath);
      if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements)) throw new Error();
      for (const [name, type] of Object.entries(requirements.bindings ?? {})) add(`required:${name}`, bindings.get(name) === type ? 'ok' : 'fail', `要求绑定 ${name}，类型 ${type}`);
      if (requirements.secrets !== undefined && (!Array.isArray(requirements.secrets) || requirements.secrets.some((name) => typeof name !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(name)))) throw new Error();
      for (const name of requirements.secrets ?? []) if (Object.hasOwn(config.vars ?? {}, name)) add(`secret:${name}`, 'fail', `要求的 Secret ${name} 不应放在普通 vars 中`);
      if (requirements.secrets?.length) add('secrets', 'info', `部署前需核实 ${requirements.secrets.length} 个要求的 Secret；预检不读取 .dev.vars、密钥值或远程账户`);
    } catch { add('requirements', 'fail', 'workerkit.check.json 无法解析'); }
  } else add('requirements', 'info', '未声明 workerkit.check.json；仅检查原生配置，不能判断业务所需绑定是否缺失');
  for (const database of config.d1_databases ?? []) {
    const directory = resolve(dirname(configs[0]), database.migrations_dir ?? 'migrations');
    if (!existsSync(directory)) { add(`migrations:${database.binding}`, 'warn', `未找到 ${database.binding} 的本地迁移目录`); continue; }
    const files = readdirSync(directory).filter((name) => name.endsWith('.sql')).sort(); const prefixes = new Set(); let valid = true;
    for (const name of files) {
      const prefix = /^(\d+)_/.exec(name)?.[1];
      if (!prefix || prefixes.has(Number(prefix)) || !readFileSync(join(directory, name), 'utf8').trim()) valid = false;
      prefixes.add(Number(prefix));
    }
    add(`migrations:${database.binding}`, valid && files.length ? 'ok' : 'fail', `${database.binding}：${files.length} 个本地迁移，检查编号重复与空文件；未检查线上应用状态`);
  }
  add('coverage', 'info', '离线预检不能证明 Secret 已设置、资源可达、迁移已应用或接口已鉴权；仍需消费项目测试与部署后探测');
  return report;
}

export async function runDoctor(args = process.argv.slice(2)) {
  if (args[0] === 'doctor') args = args.slice(1);
  const options = {}; let json = false; let strict = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--json') json = true;
    else if (key === '--strict') strict = true;
    else if (key === '--production') options.production = true;
    else if (['--project', '--framework', '--config', '--environment'].includes(key) && args[i + 1] && !args[i + 1].startsWith('--')) options[key.slice(2)] = args[++i];
    else throw new Error('用法：workerkit doctor [--project 路径] [--config 配置] [--environment 环境] [--production] [--strict] [--json]');
  }
  const report = await inspectProject(options);
  if (json) console.log(JSON.stringify(report, null, 2));
  else { console.log(`WorkerKit ${report.framework.version ?? '?'} / ${report.framework.commit ?? '未提交'} — 只读预检`); for (const check of report.checks) console.log(`[${check.status.toUpperCase()}] ${check.id}: ${check.message}`); }
  return report.checks.some((check) => check.status === 'fail' || strict && check.status === 'warn') ? 1 : 0;
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await runDoctor(); } catch { console.error('预检失败；检查路径、配置与命令参数。未执行安装、迁移或部署。'); process.exitCode = 1; }
}
