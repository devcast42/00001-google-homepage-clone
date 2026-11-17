# 01 — Requisitos de DocSeek Lens

**Estado:** 🟡 Borrador. Faltan las decisiones del final.

## Qué debe hacer

1. **Recibir código** de dos formas:
   - **Pegándolo en el buscador**: DocSeek se da cuenta solo de que es código.
   - **Con un botón al lado del buscador**, como el de Google Lens en Google, que abre el modo para pegar código o arrastrar un archivo `.js` o `.ts`.
2. **Subrayar las funciones** de Node.js en su línea.
3. **Mostrar una tarjeta** al pasar el ratón o tocar una función: qué es, en una frase sencilla, y el enlace a su sección de la documentación.
4. **Listar los conceptos** y las cosas del lenguaje que aparecen (streams, promesas, `async/await`…). Los de Node llevan su enlace; las cosas del lenguaje las explica la IA (ver "Decisiones tomadas").
5. **Explicar el código en palabras entendibles, en español**: una frase corta por cada parte y un "ver más" con el detalle. Los enlaces llevan a la documentación oficial, que está en inglés.
6. **Decir lo que no reconoce**, sin inventar.
7. **Avisar si algo está obsoleto** y qué se usa en su lugar (secundario).

## Cómo debe ser

- **Rápido**: el subrayado aparece en menos de 1 segundo. Las explicaciones pueden tardar más, pero se ven aparecer mientras se escriben.
- **Comprobable**: lo que es de Node cita la sección de la documentación de la que sale. Lo que explica la IA sin fuente oficial se marca como tal.
- **Usable en móvil y con teclado.**
- **Privado**: el código pegado no se guarda.

## Fuera de alcance (por ahora)

- Otros lenguajes que no sean JavaScript o TypeScript.
- Librerías de npm (Express, React…): solo Node.js.
- Revisar o corregir el código.
- Extensión para el editor.
- Cuentas de usuario o historial.

## Decisiones tomadas

| Pregunta                                                   | Decisión                                                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| ¿Dónde se pega el código?                                  | En el buscador (se detecta solo) **y** con un botón al lado, como Google Lens.                                       |
| ¿En qué idioma son las explicaciones?                      | **Español.** Los enlaces van a la documentación oficial en inglés.                                                   |
| ¿Llevan IA las explicaciones en la primera versión?        | **Sí.**                                                                                                              |
| ¿Cómo se explican las cosas del lenguaje (`async/await`…)? | **Con IA, sin añadir la documentación de JavaScript (MDN).** Se marcan como "Explicación de IA, sin fuente oficial". |

## Decisiones pendientes

1. **¿Se confirma que el código pegado no se guarda?**
