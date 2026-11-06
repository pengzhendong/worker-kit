import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const source = new URL('../examples/ui-suite/', import.meta.url);

// Keep maintainable source files, but publish one document so switching does not
// gain extra blocking stylesheet/module requests on the preview shell.
export async function renderPreviewShell({ integrated = false } = {}) {
  const [template, styles, result] = await Promise.all([
    readFile(new URL('index.html', source), 'utf8'),
    readFile(new URL('preview.css', source), 'utf8'),
    build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(new URL('preview.js', source)),
          formats: ['es'],
        },
        minify: true,
      },
    }),
  ]);
  const files = (Array.isArray(result) ? result : [result]).flatMap(
    (bundle) => bundle.output,
  );
  if (files.length !== 1 || files[0].type !== 'chunk') {
    throw new Error(
      'The preview shell must contain a single inline JavaScript bundle.',
    );
  }
  const script = files[0].code.replace(/<\/script/gi, '<\\/script');
  let html = template
    .replace(
      /<link rel="stylesheet" href="\.\/preview\.css"\s*\/?>/,
      `<style>${styles}</style>`,
    )
    .replace(
      /<script type="module" src="\.\/preview\.js"><\/script>/,
      () => `<script type="module">${script}</script>`,
    );
  if (integrated)
    html = html.replace('<body>', '<body data-workerkit-mode="integrated">');
  return html;
}
