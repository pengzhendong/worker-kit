import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkerKitProvider } from '@pengzhendong/worker-kit/web';
import Dashboard from './Dashboard';
import './style.css';

createRoot(document.getElementById('root')!).render(<StrictMode><WorkerKitProvider><Dashboard /></WorkerKitProvider></StrictMode>);
