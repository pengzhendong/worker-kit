import { workerKitHandler } from '@/workerkit/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export {
  workerKitHandler as GET,
  workerKitHandler as POST,
  workerKitHandler as PATCH,
  workerKitHandler as PUT,
  workerKitHandler as DELETE,
};
