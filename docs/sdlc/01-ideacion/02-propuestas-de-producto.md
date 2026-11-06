# 02 — Propuestas de producto para el lab 001

Ideas que se discutieron para que este repo pase de "un buscador" a algo relevante en la era de los agentes de IA. **Elegida: DocSeek Lens.**

## La historia del repo

> **Lab 001: del clon de Google a buscar por código.** 2010: la portada de Google en HTML. → Un buscador real con motor propio. → **DocSeek Lens:** pegas código y te explica qué usa y por qué, con la documentación oficial como fuente (como Google Lens, pero para código).

## Elegida: DocSeek Lens

Pegar código (o arrastrar un archivo) en el buscador y obtener:

- Cada uso de una API marcado en su línea, con una tarjeta: qué es, su firma y el enlace a la sección exacta de la documentación.
- Lo **obsoleto** en ámbar y lo **eliminado** en rojo, con la alternativa oficial.
- Un resumen de **conceptos** que usa el código (streams, promesas, eventos…).
- Lo que no se puede identificar con seguridad se lista aparte, sin adivinar.

**Versión 1:** sin IA, todo verificable. **Versión 2:** explicaciones en palabras sencillas generadas con IA, siempre citando las secciones encontradas en la versión 1.

Con el enfoque de usuario actual ([01 — El problema y el usuario](01-problema-y-usuario.md)), las explicaciones sencillas, los conceptos y las cosas del propio lenguaje pasan a ser lo principal, y la detección de lo obsoleto queda como apoyo.

### Fases previstas

0. **Prototipo de viabilidad.** ✅ Hecho: ver [03 — Viabilidad técnica](03-viabilidad-lens.md).
1. Catálogo de APIs en el indexador.
2. Analizador como paquete propio (`packages/lens`), con archivos anotados y benchmark de precisión.
3. Ruta `POST /api/analyze` e interfaz.
4. Pruebas e2e y de accesibilidad, README, ADR y GIF de demo.

### Decisiones pendientes

1. **Privacidad:** propuesta de no guardar ni registrar nunca el código pegado (solo su tamaño y el tiempo de análisis), y decirlo junto al cuadro de texto.
2. **Entrada:** un solo cuadro que detecta el código (recomendado) o una pestaña aparte "Analizar código".

## Otras ideas (para después)

| Idea                                       | Qué es                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B. DocSeek para agentes (servidor MCP)** | Herramientas `search_docs`, `read_section` y `check_api` para que Claude Code, Cursor, etc. consulten la documentación real. Experimento: mismo agente con y sin DocSeek en ~30 tareas, midiendo APIs obsoletas o inventadas y si el código funciona. Reutiliza el analizador de Lens. |
| **A. Preguntar a la documentación**        | Respuestas generadas con IA donde cada frase cita su sección, midiendo cuántas afirmaciones no tienen fuente.                                                                                                                                                                          |
| **C. Documentación con memoria**           | Rastrear varias versiones de Node y responder "¿qué cambió en `fs` desde Node 20?".                                                                                                                                                                                                    |
