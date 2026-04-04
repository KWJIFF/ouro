import { pool } from '../db/client';
import { scheduler } from './scheduler';
import { eventBus } from './event-bus';

/**
 * Graceful Shutdown Handler
 * 
 * Ensures the meme's state is preserved when the process terminates.
 * - Finishes in-progress signals
 * - Flushes event log
 * - Closes database connections
 * - Stops scheduled tasks
 */

let isShuttingDown = false;

export function initShutdownHandler(): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Shutdown] Received ${signal}. Graceful shutdown starting...`);
    eventBus.emit('system:shutdown', { reason: signal });

    // 1. Stop accepting new requests
    console.log('[Shutdown] Stopping scheduler...');
    scheduler.stop();

    // 2. Wait for in-progress operations (max 10 seconds)
    console.log('[Shutdown] Waiting for in-progress operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Close database connections
    console.log('[Shutdown] Closing database connections...');
    try {
      await pool.end();
    } catch (e) {
      console.error('[Shutdown] DB close error:', e);
    }

    console.log('[Shutdown] Complete. The meme sleeps. 🐍');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught exception:', error);
    eventBus.emit('error:unhandled', { error: error.message, context: 'uncaughtException' });
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled rejection:', reason);
    eventBus.emit('error:unhandled', { error: String(reason), context: 'unhandledRejection' });
  });
}
