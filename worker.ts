// worker.ts
(async () => {
  const { BatchProcessor } = await import('./app/lib/batchProcessor');
  const bp = await BatchProcessor.getInstance();
  setInterval(() => bp.processQueue(), 1 * 10 * 1000);
})();
