# ADR 0003 — Rastreador respetuoso

- **Estado:** aceptada

## Decisión

- **robots.txt según RFC 9309:** grupo de user-agent más específico, regla más larga,
  `Allow` gana en empate, comodines `*` y `$`. Si robots.txt da 4xx se permite todo; si da
  5xx o no hay red, **se asume que no se permite nada**.
  - Caso real: nodejs.org prohíbe `/docs/` y permite `/api/`. Por eso la fuente usa
    `https://nodejs.org/api/` aunque la URL más conocida sea `/docs/latest/api/`.
- **Ritmo por host:** 500 ms entre peticiones (o `Crawl-delay` si es mayor), 2 en paralelo,
  `User-Agent` identificable con URL de contacto.
- **Reintentos** solo para errores transitorios (red, 408, 425, 429, 5xx) con espera
  exponencial con jitter y respetando `Retry-After`. Un 404 no se reintenta.
- **Deduplicación** por URL normalizada (sin fragmento ni parámetros de seguimiento) y por
  hash del contenido extraído.
- **Salida determinista:** documentos ordenados por id y gzip con mtime 0, así que dos
  rastreos del mismo contenido producen el mismo fichero y los diffs del corpus son reales.
- **Un documento por sección** (`h2`–`h6`) con su ancla y la jerarquía de encabezados,
  para que un resultado lleve a `fs.readFile()` y no al principio de la página de `fs`.

## Añadir una fuente

1. Escribir un extractor `(html, url, source) => { documents, links }` en `apps/crawler/src/extractors/`.
2. Añadir la entrada a `SOURCES` en `apps/crawler/src/sources.ts` (URLs iniciales y alcance).
3. Añadir una página de ejemplo y pruebas como en `test/extractor.test.ts`.
4. `npm run crawl -- --source <nombre> && npm run index`.
