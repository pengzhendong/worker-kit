import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function needsVisual(files) {
  return files.some((file) =>
    /^(src\/(web|client|contracts|modules)\/|src\/tooling\/vite\.ts$|examples\/dashboard\/|e2e\/|playwright\.config\.ts$|package(-lock)?\.json$|scripts\/ci-changes\.mjs$|\.github\/workflows\/check\.yml$)/.test(
      file,
    ),
  );
}
export function needsIntegration(files) {
  return files.some((file) =>
    /^(src\/(server|client|contracts|modules|vue|tooling)\/|examples\/(?!dashboard\/)|scripts\/(?:check-|run-integrated|check-generated|local-worker|build-suite|render-preview|browser|ci-changes|ui-upstreams)|test\/(?:management|native-admin|cms-operations|tooling)|ui-upstreams\.json$|package(-lock)?\.json$|\.github\/workflows\/check\.yml$)/.test(
      file,
    ),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  let visual = true,
    integration = true; // Missing history and manual runs conservatively execute the whole suite.
  const base = process.env.CI_BASE_SHA;
  if (
    process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' &&
    base &&
    /^[a-f0-9]{40}$/.test(base) &&
    !/^0+$/.test(base)
  ) {
    try {
      execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', base], {
        stdio: 'ignore',
      });
      const files = execFileSync('git', [
        'diff',
        '--name-only',
        '-z',
        base,
        'HEAD',
      ])
        .toString()
        .split('\0')
        .filter(Boolean);
      visual = needsVisual(files);
      integration = needsIntegration(files);
    } catch {
      console.log('History unavailable; running visual checks.');
    }
  }
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `visual=${visual}\nintegration=${integration}\n`,
  );
  console.log(
    `Visual checks required: ${visual}; integration required: ${integration}`,
  );
}
