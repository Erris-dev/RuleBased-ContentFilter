import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`  API      http://localhost:${config.port}/api`);
  console.log(`  Health   http://localhost:${config.port}/api/health`);
});

/** Let `tsx watch` and Ctrl-C restart cleanly instead of leaving the port bound. */
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
