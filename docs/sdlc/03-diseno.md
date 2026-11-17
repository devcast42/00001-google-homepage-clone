# Fase 3 — Diseño

Cómo se construye DocSeek Lens. Las decisiones técnicas ya tomadas para el buscador están en [`docs/adr`](../adr).

**Estado:** 🟡 Borrador. Faltan las decisiones del final.

## Cómo funciona, de principio a fin

```
Código pegado
   │
   ├─▶ 1. Subrayado (sin IA, en el servidor)
   │      El compilador de TypeScript, con los tipos de Node, Express y React,
   │      encuentra cada función y la enlaza a su sección de la documentación.
   │
   └─▶ 2. Explicación (con IA)
          Se buscan en el índice las secciones de esas funciones y se le dan a la IA.
          La IA explica en español y cita esas secciones.
          Si no hay documentación (otra librería, Rust…), explica sin citas y se marca.
```

1. **Subrayado**: es lo del prototipo de la fase 1. Es rápido (menos de un cuarto de segundo), gratis y no se equivoca de sección. Solo funciona con JavaScript y TypeScript.
2. **Explicación**: llega poco a poco, mientras la IA la escribe, para no hacer esperar.

## Las piezas

| Pieza          | Qué hace                                                                                                                         | Qué hay que construir                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Rastreador** | Descarga la documentación                                                                                                        | Extractores para MDN, Express y React (ya existe el de Node)                                       |
| **Índice**     | Busca secciones                                                                                                                  | Nada nuevo: ya admite varias fuentes                                                               |
| **Analizador** | Subraya las funciones                                                                                                            | Pasar el prototipo a código de verdad, con pruebas, en un hilo aparte para no bloquear el servidor |
| **Explicador** | Pide la explicación a la IA y la envía poco a poco                                                                               | Nuevo                                                                                              |
| **Web**        | Botón al estilo Google Lens, detección de código al pegar, vista del código subrayado con tarjetas, copiar, exportar y compartir | Nuevo                                                                                              |

## La IA

- **Modelo propuesto:** Claude Opus 5.5, el modelo actual recomendado por Anthropic.
- **Citas:** la API de Claude tiene una función de **citas**. Se le pasan las secciones de la documentación y cada frase de la respuesta indica de qué sección sale. Así se cumple "toda explicación cita su fuente" sin inventar nada nuevo.
- **Si la IA se niega a responder** (a veces pasa por sus filtros de seguridad), la petición se repite automáticamente con otro modelo.
- **Coste aproximado** (estimado, no medido): unos **4 céntimos de dólar por análisis** con Opus 5.5. Un modelo más pequeño, Claude Haiku 5.5, costaría unas 40 veces menos, pero puede explicar peor. Se medirá con ejemplos reales antes de decidir.

## Compartir sin guardar

El enlace para compartir lleva el código **comprimido dentro de la propia dirección**, en la parte que va detrás de `#`. Esa parte nunca llega al servidor. Al abrir el enlace, la web vuelve a pedir el análisis. Habrá un tamaño máximo, que se fijará midiendo.

## Orden de construcción

Cada paso deja algo que funciona y se puede probar:

1. Subrayado de Node, con su interfaz.
2. Explicaciones con IA.
3. Añadir MDN (cosas del lenguaje).
4. Añadir Express.
5. Añadir React.
6. Copiar, exportar y compartir.

## Decisiones pendientes

1. **¿Qué modelo de IA?** Opus 5.5 (mejor, unos 4 céntimos por análisis) o Haiku 5.5 (mucho más barato). Propuesta: empezar con Opus 5.5 y medir.
2. **¿Quién paga la IA?** Hace falta una cuenta y una clave de la API de Anthropic.
3. **Aviso de privacidad:** nuestro servidor no guarda el código, pero para explicarlo **se envía a la IA**, que es un servicio externo. Hay que decirlo claramente junto al cuadro de texto.
4. **Licencias de las fuentes:** comprobar las normas de rastreo y la licencia de MDN, Express y React antes de descargarlas. MDN, por ejemplo, obliga a citar su autoría.
