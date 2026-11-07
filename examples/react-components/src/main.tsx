import { createRoot } from 'react-dom/client';
import './style.css';
declare const __UI_KIND__: string;
const { default: App } =
  __UI_KIND__ === 'mui'
    ? await import('./MuiApp')
    : await import('./MantineApp');
createRoot(document.getElementById('root')!).render(<App />);
