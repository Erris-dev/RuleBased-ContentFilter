import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb } from './database/index.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`  API      http://localhost:${config.port}/api`);
  console.log(`  Health   http://localhost:${config.port}/api/health`);
});

/** Let `tsx watch` and Ctrl-C restart cleanly instead of leaving the port bound. */
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      // WAL mode leaves -wal and -shm files behind unless the handle is closed.
      closeDb();
      process.exit(0);
    });
  });
}
