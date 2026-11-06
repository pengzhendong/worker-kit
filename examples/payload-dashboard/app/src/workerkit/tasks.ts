import { createTaskWorker } from '@pengzhendong/worker-kit/task-worker';
import { taskDefinitions } from '../business/tasks';
export class WorkerKitTasks extends createTaskWorker<CloudflareEnv>({
  backends: ['payload', 'sonic', 'native', 'hub'],
  definitions: (env, backend) =>
    taskDefinitions(env, backend as 'payload' | 'sonic' | 'native' | 'hub'),
}) {}
