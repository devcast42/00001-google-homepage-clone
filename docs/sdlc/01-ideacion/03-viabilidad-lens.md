# 03 — ¿Se puede construir?

**Sí.** Un prototipo lo comprobó: [`spikes/lens-fase0`](../../../spikes/lens-fase0).

## Qué se probó

Pegar un código y que el sistema encuentre sus funciones de Node.js y las enlace a la documentación oficial.

## Qué salió

- **Encuentra casi todas las funciones**: 73 de 74 en los ejemplos probados.
- **Es rápido**: menos de un cuarto de segundo, incluso con archivos grandes.
- **Sabe qué es cada cosa**, no solo el nombre: en `stream.pipe()` sabe que es un stream.

## Lo que hay que tener en cuenta

- Se probó con pocos ejemplos (5 archivos) escritos por Claude. Hay que probarlo con código real.
- El servidor necesitará más memoria (unos 300 MB).
- Solo funciona con JavaScript y TypeScript, y por ahora solo con Node.js.
