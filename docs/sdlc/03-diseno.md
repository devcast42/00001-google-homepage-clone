# Fase 3 — Diseño

Cómo se construye DocSeek Lens. Las decisiones técnicas ya tomadas para el buscador están en [`docs/adr`](../adr).

**Estado:** ✅ Completa.

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
- **Coste aproximado** (estimado, no medido): unos **4 céntimos de dólar por análisis** con Opus 5.5. Claude Haiku 5.5 costaría unas 40 veces menos, pero puede explicar peor.
- **Plan:** empezar con Opus 5.5 y **medir** con ejemplos reales si Haiku 5.5 explica lo bastante bien para ahorrar.
- **La clave de la API** se guarda en una variable de entorno del servidor (`ANTHROPIC_API_KEY`), **nunca** en el repositorio.

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

## Privacidad

Nuestro servidor no guarda el código. Pero para explicarlo **se envía a la IA de Anthropic**, que es un servicio externo. Se dice claramente junto al cuadro de texto.

## Fuentes y licencias

Las documentaciones se descargan de sus **repositorios oficiales en GitHub**, donde están en Markdown: es más limpio y respetuoso que rastrear sus webs. Las tres permiten reutilizar su contenido **citando la autoría**:

| Fuente  | Dónde                                | Licencia                                                          | Qué nos obliga a hacer                                                                            |
| ------- | ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Node.js | nodejs.org/api                       | MIT                                                               | Citar la fuente (ya se hace)                                                                      |
| MDN     | `github.com/mdn/content`             | Texto: **CC BY-SA 2.5**. Código de ejemplo: CC0 (dominio público) | Citar a MDN y sus colaboradores, y publicar lo que copiemos de su texto con la **misma licencia** |
| Express | `github.com/expressjs/expressjs.com` | **CC BY 4.0**                                                     | Citar a los colaboradores de Express                                                              |
| React   | `github.com/reactjs/react.dev`       | **CC BY 4.0**                                                     | Citar a la documentación de React                                                                 |

**Consecuencias para el producto:**

- Cada tarjeta y cada cita muestran su fuente y su licencia (por ejemplo, "Fuente: MDN · CC BY-SA 2.5"), con el enlace.
- El corpus guardado en el repositorio incluye un archivo con las licencias de cada fuente.
- **Cómo citar MDN**, según su propia guía: el título de la página, el enlace a esa página concreta, "Mozilla Contributors", la licencia (CC BY-SA 2.5) y una nota si se ha modificado el texto. Por ejemplo: _"async function" por Mozilla Contributors, licencia CC BY-SA 2.5_.
- **Normas de rastreo (`robots.txt`)** de las webs: Express y React lo permiten todo; MDN solo prohíbe sus rutas internas (`/api/`, `/media`, archivos), no la documentación. Aun así, se descarga de GitHub.
- Licencias comprobadas en los repositorios oficiales y en las webs. Esto es una lectura de las licencias, **no un consejo legal**.
