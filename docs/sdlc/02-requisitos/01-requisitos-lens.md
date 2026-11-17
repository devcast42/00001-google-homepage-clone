# 01 — Requisitos de DocSeek Lens

**Estado:** ✅ Completo.

## Qué debe hacer

1. **Recibir código** de dos formas:
   - **Pegándolo en el buscador**: DocSeek se da cuenta solo de que es código.
   - **Con un botón al lado del buscador**, como el de Google Lens en Google, que abre el modo para pegar código o arrastrar un archivo `.js` o `.ts`.
2. **Subrayar las funciones** de Node.js en su línea.
3. **Mostrar una tarjeta** al pasar el ratón o tocar una función: qué es, en una frase sencilla, y el enlace a su sección de la documentación.
4. **Listar los conceptos** y las cosas del lenguaje que aparecen (streams, promesas, `async/await`…), cada uno con su enlace: lo de Node a la documentación de Node, y lo del lenguaje a la de JavaScript (MDN).
5. **Explicar el código en palabras entendibles, en español**: una frase corta por cada parte y un "ver más" con el detalle. Los enlaces llevan a la documentación oficial, que está en inglés.
6. **Decir lo que no reconoce**, sin inventar.
7. **Avisar si algo está obsoleto** y qué se usa en su lugar (secundario).
8. **Copiar** el análisis (el código con sus explicaciones) para pegarlo en otro sitio.
9. **Exportar** el análisis a un archivo, por ejemplo Markdown, para guardarlo en los apuntes.
10. **Compartir** el análisis con un enlace. El enlace lleva el código dentro, así que quien lo abre ve lo mismo sin que el servidor lo guarde.

## Cómo debe ser

- **Rápido**: el subrayado aparece en menos de 1 segundo. Las explicaciones pueden tardar más, pero se ven aparecer mientras se escriben.
- **Comprobable**: toda explicación cita la sección de la documentación de la que sale (Node o MDN).
- **Usable en móvil y con teclado.**
- **Privado**: el servidor no guarda el código pegado, ni siquiera para compartirlo.

## Fuera de alcance (por ahora)

- Otros lenguajes que no sean JavaScript o TypeScript.
- Librerías de npm (Express, React…): solo Node.js y el propio JavaScript.
- Revisar o corregir el código.
- Extensión para el editor.
- Cuentas de usuario o historial.

## Decisiones tomadas

| Pregunta                                                   | Decisión                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ¿Dónde se pega el código?                                  | En el buscador (se detecta solo) **y** con un botón al lado, como Google Lens.                       |
| ¿En qué idioma son las explicaciones?                      | **Español.** Los enlaces van a la documentación oficial en inglés.                                   |
| ¿Llevan IA las explicaciones en la primera versión?        | **Sí.**                                                                                              |
| ¿Cómo se explican las cosas del lenguaje (`async/await`…)? | **Se añade la documentación de JavaScript (MDN)** como fuente, y la IA la cita igual que la de Node. |
| ¿Se guarda el código pegado?                               | **No.** Pero se puede copiar, exportar y compartir con un enlace que lleva el código dentro.         |
