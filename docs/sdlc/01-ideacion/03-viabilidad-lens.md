# 03 — Viabilidad técnica de DocSeek Lens (fase 0)

> **La pregunta:** ¿se puede detectar qué APIs de Node usa un código y enlazar cada una con su sección exacta de la documentación oficial, de forma rápida y fiable?

- **Respuesta:** sí. **Se puede construir.**
- **Prototipo:** [`spikes/lens-fase0`](../../../spikes/lens-fase0) (desechable).

## Cómo funciona

1. **Catálogo:** cada sección de la documentación se convierte en una ficha buscable (función de módulo, método de una clase, evento, clase, constructor), con su estado: vigente, obsoleta o eliminada.
2. **Analizador:** el compilador de TypeScript, con los tipos oficiales de Node (`@types/node` 26.6.6), sabe qué es cada variable. Por ejemplo, en `fs.createReadStream(...).pipe(...)` sabe que el objeto es un stream y que `pipe` es `readable.pipe()`. Para los métodos heredados recorre la jerarquía de clases hasta encontrar una sección documentada.
3. **APIs eliminadas:** como ya no existen en los tipos (por ejemplo `crypto.createCipher`), se buscan en los avisos de obsolescencia (`DEP0106`).

## Resultados

| Pregunta                       | Resultado                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Encuentra las APIs?           | 98 % en los ejemplos de ajuste (47 de 48), 100 % en los de validación (26 de 26)                                                                                                    |
| ¿Se equivoca de sección?       | Todos los hallazgos no anotados se revisaron a mano y eran correctos                                                                                                                |
| ¿Detecta lo obsoleto?          | `url.parse`, `fs.exists`, `new Buffer()`, `util.isArray` (obsoletas) y `crypto.createCipher` (eliminada)                                                                            |
| ¿Es rápido?                    | 50 ms (64 líneas), 73 ms (557), 114 ms (2.152), 200 ms (5.371). Medio segundo al arrancar, una vez                                                                                  |
| ¿Cuánto de Node puede enlazar? | Al menos el 87 % de las funciones de módulo y el 73 % de los métodos de clase tienen sección (mínimo: muchos de los que faltan son métodos heredados que el analizador sí resuelve) |
| Memoria                        | 200–340 MB (la API actual usa unos 33 MB)                                                                                                                                           |

## Lo que se aprendió

- **El error más peligroso es una falsa alarma.** El prototipo marcaba `fs.writeFileSync` como eliminada por un aviso (`DEP0162`) que habla de un comportamiento suyo, no de la función. Se corrigió con dos reglas: solo es "eliminada" si ya no tiene sección propia, y solo cuentan los avisos cuyo título trata de la API en sí. Hacen falta pruebas específicas contra falsas alarmas.
- **Los avisos revocados no cuentan.** nodejs.org tiene ~6 avisos de obsolescencia revocados; no se deben marcar.
- **El código que usa una API eliminada no se puede seguir.** En `cipher.update()`, como `createCipher` ya no existe, no se sabe qué es `cipher`. Hay que avisar en la línea anterior.
- **Anotar a mano es propenso a errores.** Varias anotaciones tenían la línea mal. Ahora la línea se calcula buscando un fragmento de texto.
- **Para los eventos, la sección del evento es mejor respuesta** (`child.on('close')` → `Event: 'close'`) que `emitter.on()` genérico.

## Límites honestos de estas cifras

- 5 archivos y 74 usos de APIs, **escritos y anotados por Claude**. Es poco y puede estar sesgado hacia código "fácil".
- El conjunto de validación **ya no está limpio**: sus resultados se usaron para corregir la falsa alarma, así que el 100 % es optimista.
- La medida de verdad será en la fase de pruebas: unos 25 archivos, con **código real de proyectos open source**, idealmente anotado en parte por una persona.

## Consecuencias para el diseño

1. El análisis debe correr en un **hilo aparte** (_worker thread_): 50–200 ms de cálculo bloquearían al resto de usuarios.
2. Límite de tamaño del código pegado (por ejemplo, 5.000 líneas).
3. La memoria del servidor sube a 200–340 MB: cabe en un plan gratuito de 512 MB, pero justo.
4. Mejoras pendientes: elegir la variante correcta de funciones sobrecargadas (`Buffer.from('texto')` enlaza hoy la variante de array), extraer completa la alternativa recomendada (hoy sale cortada: "Use fs"), y los objetos del `url.parse` antiguo.
