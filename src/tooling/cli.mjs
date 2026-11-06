#!/usr/bin/env node
const command = process.argv[2];
if (command === 'create') {
  const { createProject } = await import('./create.mjs');
  await createProject(process.argv.slice(3));
} else if (command === 'sync') {
  const { syncKit } = await import('./create.mjs');
  await syncKit(process.argv.slice(3));
} else {
  // Preserve the original workerkit --project ... doctor interface.
  if (command === 'doctor') process.argv.splice(2, 1);
  const { runDoctor } = await import('./doctor.mjs');
  process.exitCode = await runDoctor();
}
