# ADR 0001 — Arquitectura y motor propio

- **Estado:** aceptada
- **Fecha:** 2026-11

## Contexto

Queremos un buscador de documentación técnica que responda en milisegundos, con
autocompletado, tolerancia a erratas y resultados que lleven a la sección exacta.
El corpus inicial (la API de Node.js) tiene unas 5.000 secciones y ~10 MB de texto.

## Decisión

Monorepo con npm workspaces y cuatro piezas con responsabilidades separadas:

| Paquete           | Responsabilidad                                                           | Depende de                      |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------- |
| `packages/engine` | Tokenizar, indexar, puntuar, corregir, resaltar. Sin dependencias ni E/S. | —                               |
| `apps/crawler`    | Descargar, respetar robots.txt, extraer secciones, escribir el corpus.    | engine (solo tipos e indexador) |
| `apps/api`        | HTTP: validación, caché, límites, cabeceras; sirve el frontend.           | engine                          |
| `apps/web`        | Interfaz React.                                                           | engine (solo tipos)             |

El flujo de datos es lineal y cada paso deja un artefacto que se puede inspeccionar:

```
web ──(crawl)──▶ data/corpus/*.jsonl.gz ──(index)──▶ data/index.json ──(carga)──▶ API ──▶ navegador
```

El **corpus se versiona** en git y el **índice no**: el índice se reconstruye en segundos
(CI, Docker) a partir del corpus, sin depender de la red ni de que nodejs.org esté disponible.

### ¿Por qué un motor propio y no Elasticsearch, Meilisearch o MiniSearch?

- El corpus cabe holgadamente en memoria (~33 MB de heap): un clúster es complejidad
  operativa sin beneficio a esta escala.
- La documentación técnica tiene necesidades específicas (identificadores con puntos,
  camelCase, `https` no es plural de `http`) que exigen controlar la tokenización.
- El objetivo del proyecto es demostrar y medir decisiones de ranking; con una caja negra
  no habría nada que medir.

## Consecuencias

- El motor es una librería pura y determinista: se prueba sin red, sin disco y sin servidor.
- La API es sin estado (salvo la caché) y escala horizontalmente con réplicas idénticas.
- **Límite conocido:** índice en memoria y de un solo proceso. Por encima de ~1 M de
  secciones habría que fragmentar el índice o pasar a un motor dedicado; el formato
  serializado versionado (`INDEX_FORMAT_VERSION`) permite migrar sin romper clientes.
