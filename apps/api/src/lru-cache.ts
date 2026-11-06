/**
 * Caché LRU con caducidad. Se apoya en que `Map` conserva el orden de inserción:
 * al leer una entrada se reinserta al final, así que la primera es siempre la menos usada.
 */
export class LruCache<V> {
  readonly #entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (maxEntries < 1) throw new RangeError('maxEntries debe ser al menos 1');
  }

  get(key: string): V | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    this.#entries.delete(key);
    if (entry.expiresAt <= this.now()) return undefined;
    this.#entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.#entries.delete(key);
    this.#entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    if (this.#entries.size > this.maxEntries) {
      this.#entries.delete(this.#entries.keys().next().value!);
    }
  }

  get size(): number {
    return this.#entries.size;
  }
}
