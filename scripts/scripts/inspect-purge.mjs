try {
  const mod = await import('purgecss');
  console.log('module keys:', Object.keys(mod));
  console.log('PurgeCSS export type:', typeof mod.PurgeCSS);
  console.log('default export keys:', mod.default ? Object.keys(mod.default) : 'no default');
} catch (e) {
  console.error('Error importing purgecss:', e.message);
}
