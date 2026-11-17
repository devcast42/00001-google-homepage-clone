# Fase 1 — Ideación

¿Qué dolor resolvemos, para quién, con qué solución, y se puede construir?

**Estado:** ✅ Completa.

## El problema y el usuario

### El usuario

Programadores **sin fundamentos sólidos** que construyen software con **agentes de IA** y **quieren aprender sin perder velocidad**.

### El problema

Reciben código que funciona, pero **no lo entienden**: no saben por qué es así ni de dónde sale cada parte.

Hoy se lo preguntan a la misma IA, sin poder comprobar la respuesta, o lo aceptan sin entenderlo.

## La solución: DocSeek Lens

Una **herramienta de estudio**. Pegas un fragmento de código que quieres entender y obtienes:

1. **Las funciones subrayadas**, cada una enlazada a su sección de la documentación oficial.
2. **Otras referencias** de lo que hace el código: conceptos (streams, promesas…) y cosas del lenguaje (`async/await`…).
3. **Explicaciones en palabras entendibles**: primero una frase corta y, si quieres, más detalle.

Todo lo que explica cita la documentación oficial, para que se pueda comprobar.

Es una web, dentro del buscador DocSeek. Empieza con Node.js; otras tecnologías se añaden incorporando su documentación.

## ¿Se puede construir?

**Sí.** Un prototipo lo comprobó: [`spikes/lens-fase0`](../../spikes/lens-fase0).

### Qué se probó

Pegar un código y que el sistema encuentre sus funciones de Node.js y las enlace a la documentación oficial.

### Qué salió

- **Encuentra casi todas las funciones**: 73 de 74 en los ejemplos probados.
- **Es rápido**: menos de un cuarto de segundo, incluso con archivos grandes.
- **Sabe qué es cada cosa**, no solo el nombre: en `stream.pipe()` sabe que es un stream.

### Lo que hay que tener en cuenta

- Se probó con pocos ejemplos (5 archivos) escritos por Claude. Hay que probarlo con código real.
- El servidor necesitará más memoria (unos 300 MB).
- Solo funciona con JavaScript y TypeScript, y por ahora solo con Node.js.
