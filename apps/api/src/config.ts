import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../../..');

export interface Config {
  readonly host: string;
  readonly port: number;
  readonly indexPath: string;
  /** Carpeta con el frontend compilado; si no existe, solo se sirve la API. */
  readonly webRoot: string;
  readonly logLevel: string;
  readonly rateLimitPerMinute: number;
  readonly cacheEntries: number;
  readonly trustProxy: boolean;
}

/** Lee la configuración de variables de entorno y falla pronto si algún valor no es válido. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    host: env.HOST ?? '0.0.0.0',
    port: integer(env, 'PORT', 3000, 0, 65_535),
    indexPath: resolve(env.INDEX_PATH ?? resolve(repoRoot, 'data/index.json')),
    webRoot: resolve(env.WEB_ROOT ?? resolve(repoRoot, 'apps/web/dist')),
    logLevel: env.LOG_LEVEL ?? 'info',
    rateLimitPerMinute: integer(env, 'RATE_LIMIT_PER_MINUTE', 300, 1, 1_000_000),
    cacheEntries: integer(env, 'CACHE_ENTRIES', 1000, 1, 1_000_000),
    trustProxy: env.TRUST_PROXY === 'true',
  };
}

function integer(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} debe ser un entero entre ${min} y ${max} (recibido: "${raw}")`);
  }
  return value;
}
