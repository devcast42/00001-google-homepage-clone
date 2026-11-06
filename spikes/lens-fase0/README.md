# Prototipo de la fase 0 de DocSeek Lens

Código **desechable** para comprobar si se puede detectar qué APIs de Node usa un fragmento de código y enlazar cada una con su sección de la documentación. No forma parte del producto: la versión de verdad se escribirá con pruebas, en un paquete propio. Los resultados están en [`docs/sdlc/01-ideacion/03-viabilidad-lens.md`](../../docs/sdlc/01-ideacion/03-viabilidad-lens.md).

```bash
cd spikes/lens-fase0
npm install
npm run eval       # cobertura en los ejemplos de ajuste (samples) y de validación (holdout)
npm run bench      # velocidad según el tamaño del archivo
npm run coverage   # qué parte de las APIs de los tipos de Node tiene sección en la documentación
```

| Archivo | Qué hace |
|---|---|
| `src/catalog.mjs` | Convierte cada sección del corpus en claves buscables (`mod:fs.readFile`, `member:stream.Readable#pipe`, `event:…`, `removed:…`) y calcula si está obsoleta o eliminada |
| `src/analyze.mjs` | Recorre el código con el compilador de TypeScript y los tipos de Node 26, y resuelve cada uso de una API a una clave del catálogo |
| `samples/`, `holdout/` | Archivos de ejemplo con las APIs esperadas en `expected.json` (línea calculada a partir de un fragmento de texto) |
