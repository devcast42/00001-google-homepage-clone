# ADR 0004 — Ranking guiado por métricas

- **Estado:** aceptada

## Contexto

Ajustar pesos "a ojo" mirando unas pocas búsquedas mejora unas consultas y empeora otras
sin que nadie lo note. Necesitamos una forma objetiva de saber si un cambio es mejor.

## Decisión

### Evaluación

- `bench/queries.json`: 46 consultas reales con las secciones que un desarrollador
  consideraría correctas (conjunto de **ajuste**).
- `bench/holdout.json`: 30 consultas distintas, escritas aparte, que el ajuste **no ve**
  (conjunto de **validación**). Si una mejora no se nota aquí, es sobreajuste.
- Métricas: Success@1, Success@3 y MRR@10.
- CI falla si el MRR baja de 0,75 (ajuste) o 0,65 (validación).

### Modelo

BM25F sobre tres campos (título, migas, cuerpo) más ajustes que se añadieron **solo cuando
mejoraban ambos conjuntos**:

| Cambio                                                    | Por qué                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Palabra completa ×2 frente a parte de identificador       | `http.createServer` debe ganar a `Http1ServerResponse` para "http"              |
| "AND suave" (`cobertura²`)                                | Un documento con todas las palabras va antes que uno que repite una             |
| Plus por cobertura en el título                           | La sección _sobre_ algo gana a la que lo menciona                               |
| Penalización por profundidad                              | Las subsecciones rara vez son la respuesta canónica                             |
| Prefijos con IDF constante y `max` entre expansiones      | Si no, gana la expansión más rara (`readlinkSync` para "fs.rea")                |
| Una sola corrección, sobre la forma escrita y la reducida | "proces" → `process`, no `probe`; resultados coherentes con "¿Quisiste decir…?" |
| Unir palabras contiguas (peso 0,2)                        | "base name" → `basename`                                                        |

Los parámetros numéricos se eligieron con `npm run bench:tune` (descenso por coordenadas,
mejora mínima de 0,005 para aceptar un cambio) y son configurables con `RankingConfig`.

### Resultados

| Conjunto        | Métrica   | Inicial | Final  |
| --------------- | --------- | ------- | ------ |
| Ajuste (46)     | Success@1 | 43,5 %  | 67,4 % |
|                 | Success@3 | 76,1 %  | 87,0 % |
|                 | MRR@10    | 0,618   | 0,784  |
| Validación (30) | Success@1 | 33,3 %  | 60,0 % |
|                 | Success@3 | 66,7 %  | 80,0 % |
|                 | MRR@10    | 0,508   | 0,702  |

## Consecuencias

- Cualquier cambio de ranking se acompaña de los números de ambos conjuntos.
- Con 76 consultas el margen de error es grande: diferencias de ±0,01 no son significativas.
  Ampliar los conjuntos (idealmente con consultas reales registradas) es el siguiente paso.
