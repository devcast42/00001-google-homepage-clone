# ADR 0002 — Tokenización para código

- **Estado:** aceptada

## Contexto

Los usuarios buscan igual "readFile", "read file", "fs.readFile" o "readfile" y esperan el
mismo resultado. Un tokenizador de texto general (separar por espacios y puntuación)
convierte `fs.readFile` en `fs` + `readfile` y no encuentra nada al buscar "read file".

## Decisión

Por cada palabra se emiten varios términos con la misma posición:

| Entrada       | Términos                                                    |
| ------------- | ----------------------------------------------------------- |
| `fs.readFile` | `fs.readfile` (compuesto), `fs`, `readfile`, `read`, `file` |
| `HTTPServer`  | `httpserver`, `http`, `server`                              |
| `NODE_ENV`    | `node_env`, `node`, `env`                                   |

- La palabra completa es **primaria** y cuenta el doble en el índice que las partes
  **derivadas**: el "http" de `http.createServer` pesa más que el de `Http1ServerResponse`.
- Se normalizan mayúsculas y diacríticos.
- **Stemmer ligero** (solo plurales, Harman 1991) en lugar de Porter: Porter reduce
  `readable` a `readabl` y hace los resultados difíciles de explicar. Una lista de
  excepciones evita `https → http`, `alias → alia` o `series → sery`.
- Las **palabras vacías** se descartan solo como palabras sueltas: `on` en `emitter.on`
  o `of` en `Buffer.of` se conservan.
- Cada término guarda su posición en el texto original para resaltar sin volver a buscar.

## Consecuencias

- El índice tiene ~18.000 términos para 5.000 secciones (los derivados añaden recall).
- Las búsquedas en lenguaje natural no resuelven sinónimos ("command line arguments" no
  encuentra `process.argv`). Ver "Limitaciones" en el README.
