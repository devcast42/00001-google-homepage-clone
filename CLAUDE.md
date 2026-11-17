# CLAUDE.md

Contexto para Claude Code en este repositorio. Léelo entero antes de empezar.

## Cómo trabajar con el dueño del repo

- **Habla siempre en español**, con frases cortas y palabras sencillas. Explica los términos técnicos la primera vez que aparezcan. Si la explicación necesita una tabla de cifras, primero di la conclusión en una frase.
- Está **reinventándose como desarrollador para la era de los agentes de IA**. Le importan más la visión de producto y los labs interesantes que el código en sí, pero quiere entender lo que se construye.
- **Sé honesto sobre lo que está verificado y lo que no.** Antes de afirmar que algo funciona, ejecútalo. Si una cifra viene de pocos datos, dilo.
- Antes de un cambio grande o de una decisión de producto, **propón y pregunta**. Las respuestas sobre el problema y el usuario tienen que salir de él, no de ti.
- Cuando le des comandos para su terminal (usa macOS y zsh), pon **uno por bloque** y di qué hace cada uno.

## Qué es este repo

Es el **lab 001** de una serie de minilabs numerados que se están reinventando. Empezó como un clon en HTML/CSS de la portada de Google y hoy es **DocSeek**: un buscador de la documentación de la API de Node.js con motor propio, escrito en TypeScript.

El siguiente paso es **DocSeek Lens**, una **herramienta de estudio**: se pega un fragmento de código y se subrayan sus funciones enlazadas a la documentación oficial, junto con otras referencias de lo que hace (conceptos, cosas del lenguaje) y explicaciones en palabras entendibles. No es una herramienta de revisión ni de detección de errores.

## Estado actual (actualiza esta sección al terminar cada bloque de trabajo)

- **Rama:** `claude/stoic-ptolemy-gyanyx`, con el **pull request #2 abierto** contra `main` (DocSeek completo + documentación del SDLC). CI en verde.
- **Fase del SDLC:** 3, [diseño](docs/sdlc/03-diseno.md). Hay **un archivo por fase** en [`docs/sdlc`](docs/sdlc), corto y resumido. Completas:
  - [Fase 1 — Ideación](docs/sdlc/01-ideacion.md): el problema y el usuario, la solución (DocSeek Lens) y la viabilidad (comprobada con un prototipo; los detalles técnicos están en el historial de git y en `spikes/lens-fase0`).
  - [Fase 2 — Requisitos](docs/sdlc/02-requisitos.md): qué debe hacer Lens y las decisiones tomadas.
- **Usuario objetivo:** programadores sin fundamentos sólidos que construyen con agentes de IA y **quieren aprender sin perder velocidad**. Necesitan explicaciones sencillas **y** enlaces a la documentación oficial, sobre funciones, conceptos y cosas del propio lenguaje. Lo usan **para estudiar**, en una web (fuera del editor). Fuentes de la primera versión: Node.js, JavaScript (MDN), Express y React; Next.js, Nest y otras, después.
- **Siguiente paso:** cerrar el [borrador de diseño](docs/sdlc/03-diseno.md) con las decisiones pendientes que lista al final (modelo de IA, quién paga la IA, aviso de privacidad, licencias de las fuentes).

## Estructura

| Carpeta             | Contenido                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/engine`   | Motor de búsqueda sin dependencias: tokenizador para código, índice invertido, BM25F, corrección de erratas, prefijos, fragmentos resaltados |
| `apps/crawler`      | Rastreador de nodejs.org/api (respeta robots.txt; nodejs.org prohíbe `/docs/` y permite `/api/`) y construcción del índice                   |
| `apps/api`          | API Fastify: `/api/search`, `/api/suggest`, `/api/stats`, `/healthz`, `/readyz`; sirve el frontend                                           |
| `apps/web`          | React 19 + Vite                                                                                                                              |
| `bench`             | Calidad del ranking (Success@1/3, MRR) con conjunto de ajuste y de validación, ajuste de parámetros y latencia                               |
| `e2e`               | Playwright en escritorio y móvil, más auditoría de accesibilidad con axe                                                                     |
| `data/corpus`       | Corpus versionado (5.013 secciones). `data/index.json` se genera y no se versiona                                                            |
| `docs/adr`          | Decisiones técnicas ya tomadas (0001–0004)                                                                                                   |
| `docs/sdlc`         | Un archivo corto por fase del ciclo de vida (`01-ideacion.md` … `07-mantenimiento.md`); aquí va todo lo nuevo de producto                    |
| `spikes/lens-fase0` | Prototipo desechable de Lens (no es parte de los workspaces)                                                                                 |

## Comandos

```bash
npm ci
npm run dev              # índice + API (:3000) + Vite (:5173)
npm run lint             # ESLint + Prettier
npm run typecheck        # TypeScript estricto, incluidas pruebas y benchmarks
npm run test:coverage    # Vitest con umbrales de cobertura
npm run test:e2e         # compila, genera el índice y ejecuta Playwright (requiere: npx playwright install chromium)
npm run bench:relevance  # calidad del ranking; -- --set holdout para validación
npm run bench:latency
npm run crawl            # vuelve a rastrear nodejs.org (unos 35 s)
```

Antes de dar algo por terminado: `npm run lint && npm run typecheck && npm run test:coverage`, y `npm run test:e2e` si tocaste la web o la API. Si cambias el ranking, ejecuta `bench:relevance` en los **dos** conjuntos y no aceptes cambios que empeoren la validación.

## Convenciones

- Comentarios, documentación y textos de la interfaz en **español**. Mensajes de commit en **inglés**, estilo Conventional Commits (`feat(engine): …`, `fix(api): …`, `docs: …`).
- TypeScript estricto, ESM, Prettier (`printWidth` 100, comillas simples).
- Las métricas se miden, no se suponen: cada cambio de ranking o de detección va con sus números.
- Los conjuntos de evaluación se fijan **antes** de ajustar; si se usan para corregir algo, se dice que dejaron de estar limpios.
- `docs/sdlc` tiene **un archivo por fase**, no carpetas. Cada archivo es corto y resumido. En `01-ideacion.md`, la sección "El problema y el usuario" solo contiene eso: nada de soluciones ni entrevistas.
