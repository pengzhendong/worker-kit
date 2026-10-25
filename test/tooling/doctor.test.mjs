import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readdirSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inspectProject } from '../../src/tooling/doctor.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'workerkit-doctor-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = join(root, 'app'), framework = join(root, 'framework'); mkdirSync(app); mkdirSync(framework); mkdirSync(join(app, 'migrations'));
  writeFileSync(join(framework, 'package.json'), JSON.stringify({ name: 'framework', version: '0.2.0', engines: { node: '>=22.12.0' }, peerDependencies: {} }));
  writeFileSync(join(app, 'package.json'), '{"name":"fixture","version":"1.0.0"}'); writeFileSync(join(app, 'package-lock.json'), '{"lockfileVersion":3}');
  writeFileSync(join(app, 'index.ts'), 'export default {};'); writeFileSync(join(app, '.dev.vars'), 'PRIVATE_SECRET=do-not-read-or-print');
  writeFileSync(join(app, 'migrations/0001_init.sql'), 'CREATE TABLE example(id TEXT);');
  const config = { name: 'doctor-test', main: './index.ts', compatibility_date: '2026-01-01', observability: { enabled: true }, d1_databases: [{ binding: 'DB', database_name: 'fixture', migrations_dir: 'migrations' }] };
  const save = () => writeFileSync(join(app, 'wrangler.jsonc'), '// JSONC supported by Wrangler\n' + JSON.stringify(config)); save();
  writeFileSync(join(app, 'workerkit.check.json'), JSON.stringify({ bindings: { DB: 'd1' }, secrets: ['PRIVATE_SECRET'] }));
  return { root, app, framework, config, save };
}
function snapshot(path) { return Object.fromEntries(readdirSync(path, { withFileTypes: true }).map((entry) => [entry.name, entry.isDirectory() ? snapshot(join(path, entry.name)) : readFileSync(join(path, entry.name), 'utf8')])); }
test('doctor reads native config without modifying inputs, reading secrets into reports or claiming remote verification', async (t) => {
  const f = fixture(t); const before = snapshot(f.root); const result = await inspectProject({ project: f.app, framework: f.framework });
  assert.equal(result.readOnly, true); assert.equal(result.checks.some((check) => check.status === 'fail'), false);
  assert.match(result.checks.find((check) => check.id === 'coverage').message, /不能证明/);
  assert.equal(JSON.stringify(result).includes('do-not-read-or-print'), false); assert.deepEqual(snapshot(f.root), before);
});
test('doctor detects missing bindings, production IDs, disabled logs, duplicate and empty migrations', async (t) => {
  const f = fixture(t); f.config.observability.enabled = false; f.config.d1_databases[0].binding = 'WRONG'; f.save();
  writeFileSync(join(f.app, 'migrations/1_duplicate.sql'), '');
  const result = await inspectProject({ project: f.app, framework: f.framework, production: true });
  for (const id of ['required:DB', 'production:WRONG', 'migrations:WRONG']) assert.equal(result.checks.find((check) => check.id === id).status, 'fail');
  assert.equal(result.checks.find((check) => check.id === 'observability').status, 'warn');
});
test('doctor checks installed peer compatibility and returns failing CLI status for invalid production configuration', async (t) => {
  const f = fixture(t); symlinkSync(resolve('node_modules'), join(f.app, 'node_modules'), 'dir');
  writeFileSync(join(f.framework, 'package.json'), JSON.stringify({ name: 'framework', version: '0.2.0', peerDependencies: { react: '^100.0.0' } }));
  const result = await inspectProject({ project: f.app, framework: f.framework }); assert.equal(result.checks.find((check) => check.id === 'peer:react').status, 'fail');
  try { execFileSync(process.execPath, ['src/tooling/doctor.mjs', '--project', f.app, '--framework', f.framework, '--production', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); assert.fail('must fail'); }
  catch (error) { assert.equal(error.status, 1); const report = JSON.parse(error.stdout); assert.equal(report.readOnly, true); }
});
test('doctor checks selected environment bindings and rejects required secrets declared as plaintext vars', async (t) => {
  const f = fixture(t); f.config.env = { production: { vars: { PRIVATE_SECRET: 'never-print-this' }, d1_databases: [] } }; f.save();
  const report = await inspectProject({ project: f.app, framework: f.framework, environment: 'production' });
  assert.equal(report.checks.find((check) => check.id === 'required:DB').status, 'fail');
  assert.equal(report.checks.find((check) => check.id === 'secret:PRIVATE_SECRET').status, 'fail');
  assert.equal(JSON.stringify(report).includes('never-print-this'), false);
});
test('doctor compares the actual submodule commit against its parent index without updating either', async (t) => {
  const f = fixture(t);
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=WorkerKit Test', '-c', 'user.email=test@example.invalid', '-C', cwd, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  git(f.framework, 'init'); git(f.framework, 'add', '.'); git(f.framework, 'commit', '-m', 'fixture');
  git(f.app, 'init'); git(f.app, '-c', 'protocol.file.allow=always', 'submodule', 'add', f.framework, 'framework');
  const checkout = join(f.app, 'framework');
  assert.equal((await inspectProject({ project: f.app, framework: checkout })).checks.find((check) => check.id === 'submodule').status, 'ok');
  writeFileSync(join(checkout, 'package.json'), '{"name":"framework","version":"0.3.0"}'); git(checkout, 'add', '.'); git(checkout, 'commit', '-m', 'upgrade');
  assert.equal((await inspectProject({ project: f.app, framework: checkout })).checks.find((check) => check.id === 'submodule').status, 'warn');
  git(f.app, 'add', relative(f.app, checkout));
  assert.equal((await inspectProject({ project: f.app, framework: checkout })).checks.find((check) => check.id === 'submodule').status, 'ok');
});

test('doctor warns about historical duplicate numbers without rewriting D1 migration identities', async (t) => {
  const f = fixture(t);
  writeFileSync(join(f.app, 'migrations/0001_legacy.sql'), 'CREATE TABLE legacy(id TEXT);');
  const before = snapshot(f.app);
  const result = await inspectProject({ project: f.app, framework: f.framework });
  assert.equal(result.checks.find(check => check.id === 'migrations:DB').status, 'warn');
  assert.deepEqual(snapshot(f.app), before);
});
