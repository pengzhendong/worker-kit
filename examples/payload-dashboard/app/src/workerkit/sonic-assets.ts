import manifest from '../../../sonic-assets.json'

const localAssets = new Map(manifest.assets.flatMap(asset => asset.aliases.map(url => [url, asset.path] as const)))
for (const url of manifest.fontAliases) localAssets.set(url, manifest.fontCss)

/** Local copies of the SDK's public dependencies; native routes and scripts stay intact. */
export function localizeSonicAssets(response: Response): Response {
  if (!(response.headers.get('Content-Type') ?? '').includes('text/html')) return response
  let css: string[] = []
  return new HTMLRewriter()
    .on('script[src], link[href]', {
      element(element) {
        const attribute = element.tagName === 'script' ? 'src' : 'href'
        const replacement = localAssets.get(element.getAttribute(attribute) ?? '')
        if (replacement) element.setAttribute(attribute, replacement)
      },
    })
    .on('style', {
      element(element) {
        const chunks: string[] = []
        css = chunks
        element.onEndTag(tag => {
          let content = chunks.join('')
          for (const url of manifest.fontAliases) content = content.replaceAll(url, manifest.fontCss)
          tag.before(content, { html: true })
        })
      },
      text(text) { css.push(text.text); text.remove() },
    })
    .transform(response)
}
