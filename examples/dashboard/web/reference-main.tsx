import { createRoot } from 'react-dom/client';
import { AppErrorBoundary, WorkerKitProvider } from '@pengzhendong/worker-kit/web';
import { ScalarReference } from '@pengzhendong/worker-kit/web/scalar-reference';

createRoot(document.getElementById('root')!).render(<AppErrorBoundary scope="application"><WorkerKitProvider><ScalarReference /></WorkerKitProvider></AppErrorBoundary>);
