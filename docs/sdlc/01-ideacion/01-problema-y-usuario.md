# 01 — El problema y el usuario

> **La pregunta:** ¿qué dolor específico resolvemos, y para quién?

- **Estado:** 🟡 Hipótesis. Nada de esto está comprobado con usuarios reales todavía.
- **Producto:** DocSeek Lens (pegar código y entender qué usa, con la documentación oficial al lado).

---

## 1. Hipótesis inicial (borrador)

Este borrador sale de las conversaciones del proyecto. Sirve como punto de partida para discutir, no como respuesta.

### ¿Para quién?

Personas que trabajan con **código de Node.js que no escribieron ellas**:

- Quien entra en un proyecto nuevo y tiene que entender código que ya existe.
- Quien hereda código antiguo y tiene que actualizarlo.
- Quien recibe código generado por una IA y tiene que decidir si se puede confiar en él.

### ¿Qué le duele?

1. **No sabe qué hace cada parte del código** y tiene que buscar en la documentación una función tras otra, a mano.
2. **No sabe si el código usa cosas viejas o que ya no existen.** Lo descubre cuando algo falla, a menudo en producción.
3. **Las IA explican el código, pero no siempre aciertan** y no dicen de dónde sacan la información, así que no puede comprobarlo.

### ¿Cómo lo resuelve hoy?

- Busca cada función en Google o en nodejs.org.
- Le pregunta a un chat de IA y espera que acierte.
- Le pregunta a un compañero, si tiene uno.
- Ejecuta el código y espera a ver qué se rompe.

### ¿Por qué esto no basta?

- Buscar a mano es lento: con 20 funciones son 20 búsquedas.
- La IA puede inventarse cosas y no deja comprobarlas.
- Las advertencias de "esto está obsoleto" están en la documentación, pero nadie las lee hasta que algo falla.

### Frase del problema (borrador)

> **Para** desarrolladores que trabajan con código de Node.js que no escribieron,
> **el problema es** que entender qué usa ese código y si sigue siendo correcto obliga a buscar función por función,
> **lo que hoy resuelven** buscando a mano o preguntando a una IA sin poder comprobar la respuesta,
> **y les cuesta** tiempo, y errores que descubren tarde.

---

## 2. Lo que todavía no sabemos

Cada punto es un supuesto que podría ser falso:

- [ ] ¿Es un dolor **frecuente** o pasa pocas veces al año?
- [ ] ¿Quién lo sufre más: alguien que empieza, alguien con experiencia, alguien que revisa código de otros?
- [ ] ¿Les importa más **entender** el código o **detectar problemas** (APIs obsoletas)?
- [ ] ¿Ya usan algo que lo resuelve (el editor, una extensión, ChatGPT, Copilot) y están contentos?
- [ ] ¿Pegarían código de su empresa en una web, o eso les frena?
- [ ] ¿Solo Node.js es suficiente, o el dolor está en otros lenguajes o librerías (Express, React…)?

## 3. Preguntas para ti

Respóndelas con tu experiencia real, aunque sea corta:

1. **¿Te ha pasado a ti?** Cuenta una vez concreta en la que tuviste que entender código ajeno o viejo. ¿Qué hiciste? ¿Cuánto tardaste?
2. **¿Quién es tu usuario ideal?** Si solo pudieras ayudar a un tipo de persona, ¿cuál sería?
3. **¿Qué te molesta más:** no entender el código, o no saber si está mal?
4. **¿Conoces a 3–5 personas** que podrían tener este problema y con las que puedas hablar 15 minutos?

## 4. Cómo comprobarlo

Antes de pasar a requisitos:

1. Hablar con **5 personas** que encajen con el usuario. No para venderles la idea, sino para preguntar cómo trabajan:
   - "Cuéntame la última vez que tuviste que entender código que no era tuyo."
   - "¿Qué hiciste? ¿Qué fue lo más molesto?"
   - "¿Usas alguna herramienta para eso? ¿Qué le falta?"
2. Apuntar sus respuestas en este documento, en la sección de abajo, con sus palabras exactas.
3. Reescribir la frase del problema con lo aprendido. Si nadie tiene el problema, **cambiar de idea es un buen resultado**, no un fracaso.

## 5. Lo que aprendimos de los usuarios

_Vacío. Se completa después de las entrevistas._

| Persona (perfil) | Lo que contó | ¿Confirma o contradice la hipótesis? |
| ---------------- | ------------ | ------------------------------------ |
|                  |              |                                      |
