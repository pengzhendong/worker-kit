// vue-tsc's hoisted CLI would resolve the root's native TypeScript 7.
// Resolve the supported TypeScript 6 compiler from this optional Vue example.
require('vue-tsc').run(require.resolve('typescript/lib/tsc'));
