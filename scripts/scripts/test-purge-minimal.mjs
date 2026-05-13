import { PurgeCSS } from 'purgecss';

console.log('Running minimal purge test');
const css = '.a{color:red}.b{color:blue}.c{display:none}';
const content = '<div class="a"></div>';

const results = await new PurgeCSS().purge({
  content: [{ raw: content, extension: 'html' }],
  css: [{ raw: css }]
});
console.log('results length:', results.length);
if (results[0]) console.log('purged css:', results[0].css);
