# 01 — El problema y el usuario

> **La pregunta:** ¿qué dolor específico resolvemos, y para quién?

- **Estado:** 🟡 Hipótesis (versión 2). Enfoque definido, pero sin validar con usuarios reales.
- **Producto:** DocSeek Lens.

---

## 1. Hipótesis

### ¿Para quién?

**Programadores que construyen software hablándole a un agente de IA** (Claude Code, Cursor, Copilot…) **y que no tienen fundamentos sólidos**, sea porque están empezando o porque la IA usa cosas que nunca vieron.

Ya no escriben el código: lo **piden en lenguaje natural** y lo reciben hecho.

### ¿Qué le duele?

**El código funciona (o casi), pero no lo entiende.** Y eso trae problemas concretos:

1. **No sabe por qué el código es así.** Ve `fs.createReadStream(...).pipe(...)` y no sabe qué es un stream ni por qué no se usó algo más simple.
2. **No sabe de dónde sale cada cosa**: qué es de Node, qué es del lenguaje, qué es de una librería y qué se inventó la IA.
3. **No puede revisar lo que le entrega la IA.** Si no entiende el código, no sabe si es correcto, seguro o si usa algo obsoleto.
4. **Cuando algo falla, no sabe arreglarlo**, y vuelve a pedírselo a la IA, que a veces lo empeora.
5. **No aprende.** Pasa el tiempo y sigue dependiendo de la IA para todo, sin ganar los fundamentos.

### ¿Cómo lo resuelve hoy?

- Le pide a la misma IA que se lo explique. Pero la explicación puede estar mal, no cita fuentes y no hay forma de comprobarla.
- Busca cada cosa en Google, una por una.
- No lo resuelve: acepta el código sin entenderlo y sigue adelante.

### ¿Por qué esto no basta?

- Preguntar a la IA que escribió el código es pedirle que se revise a sí misma.
- Buscar una por una es lento, y no explica **cómo encajan** las piezas.
- Aceptar sin entender acumula código que nadie sabe mantener.

### Frase del problema

> **Para** programadores sin fundamentos sólidos que construyen software con agentes de IA,
> **el problema es** que reciben código que funciona pero que no entienden: no saben por qué es así ni de dónde sale cada parte,
> **lo que hoy resuelven** pidiéndole a la misma IA que se lo explique, sin poder comprobar la respuesta, o aceptándolo sin entenderlo,
> **y les cuesta** no poder revisar ni arreglar su propio código, y no aprender los fundamentos.

### Qué hace DocSeek Lens por ellos

Explica el código **con la documentación oficial como fuente**: qué es cada parte, por qué está ahí y de dónde sale, con el enlace para comprobarlo. Así la persona aprende mientras trabaja.

---

## 2. Lo que todavía no sabemos

- [ ] ¿Esta persona **quiere aprender**, o solo quiere que el código funcione? Si solo quiere que funcione, no usará una herramienta para entender.
- [ ] ¿**En qué momento** lo usaría: al recibir el código, cuando algo falla, al revisar antes de subirlo?
- [ ] ¿Le basta con **enlaces a la documentación**, o necesita **explicaciones en palabras sencillas**? La documentación oficial es técnica y puede ser difícil para alguien sin fundamentos.
- [ ] ¿Qué le cuesta más entender: **funciones de Node** (`fs.readFile`), **conceptos** (streams, promesas, event loop) o **el propio lenguaje** (`async/await`, desestructuración)?
- [ ] ¿Lo usaría **fuera** de su editor, o tiene que estar **dentro** de donde ya trabaja con la IA?
- [ ] ¿Solo Node.js es suficiente para empezar?

## 3. Lo que esto cambia en el producto

Notas para la fase de requisitos, no decisiones todavía:

- **Explicar conceptos pesa más que detectar APIs obsoletas.** Lo obsoleto sigue siendo útil, pero ya no es lo principal.
- **El "por qué" necesita palabras sencillas.** Los enlaces a nodejs.org son la fuente que da confianza, pero probablemente no bastan: la versión con explicaciones (la "versión 2" de Lens) pasa a ser importante, siempre citando la documentación.
- **El índice actual solo tiene Node.js.** Gran parte de lo que esta persona no entiende es del propio lenguaje JavaScript (`async/await`, `map`, `Promise`), que está en MDN, no en nodejs.org. Habrá que añadir esa fuente.
- **Encaja con trabajar dentro del agente de IA** (la idea del servidor MCP): explicar el código justo donde se genera.

## 4. Primer usuario: yo

Durante este proyecto, construido con un agente de IA, me pasó exactamente esto:

- El agente usó Playwright y tuve que preguntar qué era y por qué se usa.
- No entendía qué significaba `getByRole('combobox')` en una prueba.
- Una explicación técnica de la fase 0 fue tan densa que no entendí nada.
- Aun así, probando el producto encontré un fallo real (buscar `asy` no daba resultados): el criterio sí lo tenía, me faltaba el contexto.

## 5. Cómo comprobarlo

1. Hablar con **5 personas** que programen con agentes de IA y se consideren junior o sin una base fuerte. Preguntas:
   - "Cuéntame la última vez que la IA te dio código que no entendías. ¿Qué hiciste?"
   - "¿Alguna vez algo falló y no supiste por qué?"
   - "¿Te importa entender el código, o te basta con que funcione?"
   - "Si pudieras entenderlo mejor, ¿dónde lo querrías: en tu editor, en una web, en el chat con la IA?"
2. Apuntar sus respuestas abajo, con sus palabras.
3. Reescribir la frase del problema con lo aprendido.

## 6. Lo que aprendimos de los usuarios

| Persona (perfil) | Lo que contó | ¿Confirma o contradice la hipótesis? |
| ---------------- | ------------ | ------------------------------------ |
|                  |              |                                      |
