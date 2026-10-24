import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary, WorkerKitProvider } from '@pengzhendong/worker-kit/web';
import Dashboard from './Dashboard';
import '@pengzhendong/worker-kit/web/styles.css';
import './style.css';

createRoot(document.getElementById('root')!).render(<StrictMode><AppErrorBoundary scope="application"><WorkerKitProvider><Dashboard /></WorkerKitProvider></AppErrorBoundary></StrictMode>);
