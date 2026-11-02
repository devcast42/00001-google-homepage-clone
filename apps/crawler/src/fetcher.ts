import { setTimeout as sleep } from 'node:timers/promises';

export interface FetcherOptions {
  readonly userAgent: string;
  /** Tiempo mínimo entre peticiones al mismo host, en milisegundos. */
  readonly minIntervalMs: number;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
  /** Inyectable para pruebas. */
  readonly fetch?: typeof globalThis.fetch;
  readonly sleep?: (ms: number) => Promise<unknown>;
  readonly now?: () => number;
}

export interface FetchedPage {
  readonly url: string;
  readonly status: number;
  readonly contentType: string;
  readonly body: string;
}

export class FetchError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Cliente HTTP "educado":
 * - espacia las peticiones a cada host (`minIntervalMs`, o `Crawl-delay` si es mayor);
 * - reintenta errores de red y respuestas 429/5xx con espera exponencial y jitter,
 *   respetando la cabecera `Retry-After`;
 * - corta las peticiones que tardan más de `timeoutMs`.
 */
export class PoliteFetcher {
  readonly #options: Required<FetcherOptions>;
  /** host → momento a partir del cual se puede hacer la siguiente petición */
  readonly #nextSlot = new Map<string, number>();
  readonly #intervals = new Map<string, number>();

  constructor(options: FetcherOptions) {
    this.#options = {
      maxRetries: 3,
      timeoutMs: 15_000,
      fetch: globalThis.fetch.bind(globalThis),
      sleep,
      now: Date.now,
      ...options,
    };
  }

  /** Ajusta el intervalo de un host, por ejemplo tras leer su `Crawl-delay`. */
  setHostInterval(host: string, intervalMs: number): void {
    this.#intervals.set(host, Math.max(intervalMs, this.#options.minIntervalMs));
  }

  async get(url: string): Promise<FetchedPage> {
    const { maxRetries } = this.#options;
    for (let attempt = 0; ; attempt++) {
      await this.#waitForSlot(new URL(url).host);
      let response: Response;
      try {
        response = await this.#options.fetch(url, {
          headers: { 'user-agent': this.#options.userAgent, accept: 'text/html,text/plain;q=0.9' },
          redirect: 'follow',
          signal: AbortSignal.timeout(this.#options.timeoutMs),
        });
      } catch (error) {
        if (attempt >= maxRetries) {
          throw new FetchError(`Error de red tras ${attempt + 1} intentos: ${String(error)}`, url);
        }
        await this.#options.sleep(this.#backoff(attempt));
        continue;
      }

      if (response.ok) {
        return {
          url: response.url || url,
          status: response.status,
          contentType: response.headers.get('content-type') ?? '',
          body: await response.text(),
        };
      }

      await response.body?.cancel();
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= maxRetries) {
        throw new FetchError(`HTTP ${response.status}`, url, response.status);
      }
      await this.#options.sleep(
        Math.max(this.#backoff(attempt), retryAfterMs(response.headers.get('retry-after'))),
      );
    }
  }

  #backoff(attempt: number): number {
    const base = 500 * 2 ** attempt;
    return base + Math.random() * base * 0.25;
  }

  async #waitForSlot(host: string): Promise<void> {
    const interval = this.#intervals.get(host) ?? this.#options.minIntervalMs;
    const now = this.#options.now();
    const slot = Math.max(now, this.#nextSlot.get(host) ?? 0);
    // Se reserva el hueco antes de esperar, para que las peticiones concurrentes se encolen.
    this.#nextSlot.set(host, slot + interval);
    if (slot > now) await this.#options.sleep(slot - now);
  }
}

export function retryAfterMs(header: string | null): number {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
}
