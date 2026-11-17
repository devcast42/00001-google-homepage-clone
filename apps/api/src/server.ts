import { readFile } from 'node:fs/promises';
import { SearchIndex } from '@docseek/engine';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();

let index: SearchIndex;
try {
  index = SearchIndex.fromJSON(JSON.parse(await readFile(config.indexPath, 'utf8')));
} catch (error) {
  console.error(`No se pudo cargar el índice desde ${config.indexPath}: ${String(error)}`);
  console.error('Genera el índice con `npm run index`.');
  process.exit(1);
}

const app = await buildApp({
  index,
  webRoot: config.webRoot,
  rateLimitPerMinute: config.rateLimitPerMinute,
  cacheEntries: config.cacheEntries,
  trustProxy: config.trustProxy,
  logger: { level: config.logLevel },
});

app.log.info({ ...index.stats(), sources: undefined }, 'índice cargado');

// Apagado ordenado: deja de aceptar conexiones y termina las peticiones en curso
// antes de salir (Docker y Kubernetes envían SIGTERM).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info(`${signal} recibido, cerrando`);
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error(error);
        process.exit(1);
      },
    );
  });
}

await app.listen({ host: config.host, port: config.port });
