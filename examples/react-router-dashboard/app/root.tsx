import { cloudflareContext } from './context';
export const handle = { cloudflareContext };
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import '../../fullstack-shared/style.css';
export default function Root() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
