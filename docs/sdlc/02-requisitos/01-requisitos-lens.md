# 01 — Requisitos de DocSeek Lens

**Estado:** 🟡 Borrador. Faltan las decisiones del final.

## Qué debe hacer

1. **Recibir código**: pegarlo en el buscador o arrastrar un archivo `.js` o `.ts`.
2. **Subrayar las funciones** de Node.js en su línea.
3. **Mostrar una tarjeta** al pasar el ratón o tocar una función: qué es, en una frase sencilla, y el enlace a su sección de la documentación.
4. **Listar los conceptos** y las cosas del lenguaje que aparecen (streams, promesas, `async/await`…), cada uno con su enlace.
5. **Explicar el código en palabras entendibles**: una frase corta por cada parte y un "ver más" con el detalle.
6. **Decir lo que no reconoce**, sin inventar.
7. **Avisar si algo está obsoleto** y qué se usa en su lugar (secundario).

## Cómo debe ser

- **Rápido**: el subrayado aparece en menos de 1 segundo. Las explicaciones pueden tardar más, pero se ven aparecer mientras se escriben.
- **Comprobable**: toda explicación cita la sección de la documentación de la que sale.
- **Usable en móvil y con teclado.**
- **Privado**: el código pegado no se guarda.

## Fuera de alcance (por ahora)

- Otros lenguajes que no sean JavaScript o TypeScript.
- Librerías de npm (Express, React…): solo Node.js.
- Revisar o corregir el código.
- Extensión para el editor.
- Cuentas de usuario o historial.

## Decisiones pendientes

1. **¿Dónde se pega el código?** En el mismo cuadro del buscador (DocSeek se da cuenta solo) o en una pestaña aparte.
2. **¿En qué idioma son las explicaciones?** La documentación de Node está en inglés.
3. **¿Las explicaciones sencillas van en la primera versión?** Necesitan IA, y eso tiene un coste por uso.
