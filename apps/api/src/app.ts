import { existsSync } from 'node:fs';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyServerOptions } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { SearchIndex, SearchResult, Suggestion } from '@docseek/engine';
import { LruCache } from './lru-cache.js';

export interface AppOptions {
  readonly index: SearchIndex;
  readonly webRoot?: string;
  readonly rateLimitPerMinute?: number;
  readonly cacheEntries?: number;
  readonly logger?: FastifyServerOptions['logger'];
  readonly trustProxy?: boolean;
}

export const MAX_PAGE_SIZE = 50;
const MAX_QUERY_LENGTH = 200;
const CACHE_TTL_MS = 5 * 60_000;

interface SearchQuery {
  q: string;
  page: number;
  pageSize: number;
  source?: string;
}

interface SuggestQuery {
  q: string;
  limit: number;
}

const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: { code: { type: 'string' }, message: { type: 'string' } },
      required: ['code', 'message'],
    },
  },
} as const;

const highlightedSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    highlights: { type: 'array', items: { type: 'array', items: { type: 'integer' } } },
  },
  required: ['text', 'highlights'],
} as const;

/**
 * Construye la aplicación sin arrancar el servidor, para poder probarla con `app.inject()`.
 */
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const { index } = options;
  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: options.trustProxy ?? false,
    // Cada consulta lleva un id de petición que aparece en los logs y en la respuesta.
    genReqId: () => crypto.randomUUID(),
    ajv: { customOptions: { coerceTypes: true, removeAdditional: true } },
  });

  const searchCache = new LruCache<SearchResult>(options.cacheEntries ?? 1000, CACHE_TTL_MS);
  const suggestCache = new LruCache<Suggestion[]>(options.cacheEntries ?? 1000, CACHE_TTL_MS);

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'strict-origin-when-cross-origin');
    reply.header('x-frame-options', 'DENY');
    reply.header(
      'content-security-policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    );
  });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: error.message } });
    }
    if (error.statusCode === 429) {
      return reply.status(429).send({ error: { code: 'rate_limited', message: error.message } });
    }
    request.log.error(error);
    return reply.status(500).send({ error: { code: 'internal', message: 'Error interno' } });
  });

  // Las comprobaciones de salud se registran fuera del límite de peticiones.
  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => ({ status: 'ready', documents: index.size }));

  await app.register(async (api) => {
    await api.register(rateLimit, {
      max: options.rateLimitPerMinute ?? 300,
      timeWindow: '1 minute',
    });

    api.get<{ Querystring: SearchQuery }>(
      '/search',
      {
        schema: {
          querystring: {
            type: 'object',
            properties: {
              q: { type: 'string', minLength: 1, maxLength: MAX_QUERY_LENGTH },
              page: { type: 'integer', minimum: 1, maximum: 100, default: 1 },
              pageSize: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: 10 },
              source: { type: 'string', pattern: '^[a-z0-9_-]+(,[a-z0-9_-]+)*$' },
            },
            required: ['q'],
          },
          response: {
            200: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                tookMs: { type: 'number' },
                didYouMean: { type: 'string' },
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      url: { type: 'string' },
                      source: { type: 'string' },
                      breadcrumbs: { type: 'array', items: { type: 'string' } },
                      title: highlightedSchema,
                      snippet: highlightedSchema,
                      score: { type: 'number' },
                    },
                  },
                },
              },
            },
            400: errorSchema,
          },
        },
      },
      async (request, reply) => {
        const { q, page, pageSize, source } = request.query;
        const sources = source?.split(',');
        const key = JSON.stringify([q.trim().toLowerCase(), page, pageSize, sources]);

        const started = performance.now();
        let result = searchCache.get(key);
        const cached = result !== undefined;
        result ??= index.search(q, {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          ...(sources ? { sources } : {}),
        });
        if (!cached) searchCache.set(key, result);
        const tookMs = Math.round((performance.now() - started) * 100) / 100;

        reply
          .header('cache-control', 'public, max-age=60')
          .header('x-cache', cached ? 'HIT' : 'MISS')
          .header('server-timing', `search;dur=${tookMs}`);

        return {
          query: q,
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
          tookMs,
          ...(result.didYouMean ? { didYouMean: result.didYouMean } : {}),
          results: result.hits,
        };
      },
    );

    api.get<{ Querystring: SuggestQuery }>(
      '/suggest',
      {
        schema: {
          querystring: {
            type: 'object',
            properties: {
              q: { type: 'string', minLength: 1, maxLength: MAX_QUERY_LENGTH },
              limit: { type: 'integer', minimum: 1, maximum: 20, default: 8 },
            },
            required: ['q'],
          },
          response: { 400: errorSchema },
        },
      },
      async (request, reply) => {
        const { q, limit } = request.query;
        const key = JSON.stringify([q.trim().toLowerCase(), limit]);
        let suggestions = suggestCache.get(key);
        if (!suggestions) {
          suggestions = index.suggest(q, limit);
          suggestCache.set(key, suggestions);
        }
        reply.header('cache-control', 'public, max-age=300');
        return { query: q, suggestions };
      },
    );

    api.get('/stats', async () => index.stats());

    api.setNotFoundHandler((request, reply) =>
      reply.status(404).send({
        error: { code: 'not_found', message: `Ruta no encontrada: ${request.method} ${request.url}` },
      }),
    );
  }, { prefix: '/api' });

  // Frontend compilado. Cualquier otra ruta devuelve index.html para que el enrutado
  // del lado del cliente funcione al recargar o compartir una URL de resultados.
  if (options.webRoot && existsSync(options.webRoot)) {
    await app.register(fastifyStatic, {
      root: options.webRoot,
      wildcard: false,
      setHeaders: (response, path) => {
        response.header(
          'cache-control',
          path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
        return reply.status(404).send({ error: { code: 'not_found', message: 'No encontrado' } });
      }
      return reply.header('cache-control', 'no-cache').sendFile('index.html');
    });
  }

  return app;
}
