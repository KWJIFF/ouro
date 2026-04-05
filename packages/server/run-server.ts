process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught:', err.message);
});
process.on('unhandledRejection', (err: any) => {
  console.error('[CRASH] Unhandled:', err?.message || err);
});
// Keep process alive
setInterval(() => {}, 1 << 30);

import('./src/index.ts');
