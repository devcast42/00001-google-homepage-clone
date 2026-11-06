# 01 — El problema y el usuario

> **La pregunta:** ¿qué dolor específico resolvemos, y para quién?

- **Estado:** 🟡 Hipótesis (versión 3). Enfoque y necesidades definidos; falta validarlo con usuarios reales.
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

> **Para** programadores sin fundamentos sólidos que construyen software con agentes de IA y **quieren aprender sin perder velocidad**,
> **el problema es** que reciben código que funciona pero que no entienden: no saben por qué es así ni de dónde sale cada parte,
> **lo que hoy resuelven** pidiéndole a la misma IA que se lo explique, sin poder comprobar la respuesta, o aceptándolo sin entenderlo,
> **y les cuesta** no poder revisar ni arreglar su propio código, y no aprender los fundamentos.

### Qué hace DocSeek Lens por ellos

Explica el código **con la documentación oficial como fuente**: qué es cada parte, por qué está ahí y de dónde sale, con el enlace para comprobarlo. Así la persona aprende mientras trabaja.

---

## 2. Lo que ya decidimos

Respuestas a las preguntas abiertas de la versión anterior:

| Pregunta                                               | Respuesta                                                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Quiere aprender o solo que funcione?                  | **Quiere aprender, pero sin perder velocidad.** Nada de cursos: explicaciones cortas, al momento.                                              |
| ¿Explicaciones sencillas o enlaces a la documentación? | **Las dos cosas juntas.** La explicación sencilla para entender rápido; el enlace oficial para comprobar y profundizar.                        |
| ¿Qué le cuesta entender?                               | **Todo:** funciones (`fs.readFile`), conceptos (streams, promesas, event loop) y cosas del propio lenguaje (`async/await`, desestructuración). |
| ¿Dentro o fuera del editor?                            | **Fuera.** DocSeek es un buscador: se usa en una web, pegando el código.                                                                       |
| ¿Solo Node.js?                                         | **Se empieza con Node** porque ya tenemos sus datos. Después **se añaden tecnologías** incorporando su documentación a los datos.              |

## 3. Lo que todavía no sabemos

- [ ] ¿**En qué momento** lo usaría: al recibir el código de la IA, cuando algo falla, o al revisar antes de subirlo?
- [ ] ¿Pegaría **código de su empresa** en una web, o eso le frena?
- [ ] ¿Cuál es la **siguiente tecnología** que más falta haría después de Node: JavaScript (MDN), TypeScript, React, Express…?
- [ ] ¿Qué significa "**sin perder velocidad**" en la práctica: cuánto está dispuesto a esperar y cuánto a leer?

## 4. Lo que esto cambia en el producto

Notas para la fase de requisitos, no decisiones todavía:

- **"Sin perder velocidad" pide explicaciones por capas:** primero una frase corta que se lee en dos segundos y, solo si quiere, más detalle y el enlace a la documentación.
- **Explicar conceptos pesa más que detectar APIs obsoletas.** Lo obsoleto sigue siendo útil, pero ya no es lo principal.
- **Las explicaciones sencillas necesitan IA**, pero siempre citando la documentación oficial, para que se puedan comprobar. Así deja de ser "preguntarle a la IA que escribió el código".
- **Las cosas del lenguaje están en MDN, no en nodejs.org.** Para explicar `async/await` hará falta añadir esa fuente pronto, aunque se empiece con Node.
- **Las tecnologías tienen que poder añadirse** sin rehacer el producto. El rastreador ya está preparado: cada fuente nueva es una entrada en su configuración y un extractor para su web.

## 5. Primer usuario: yo

Durante este proyecto, construido con un agente de IA, me pasó exactamente esto:

- El agente usó Playwright y tuve que preguntar qué era y por qué se usa.
- No entendía qué significaba `getByRole('combobox')` en una prueba.
- Una explicación técnica de la fase 0 fue tan densa que no entendí nada.
- Aun así, probando el producto encontré un fallo real (buscar `asy` no daba resultados): el criterio sí lo tenía, me faltaba el contexto.

## 6. Cómo comprobarlo

1. Hablar con **5 personas** que programen con agentes de IA y se consideren junior o sin una base fuerte. Preguntas:
   - "Cuéntame la última vez que la IA te dio código que no entendías. ¿Qué hiciste?"
   - "¿Alguna vez algo falló y no supiste por qué?"
   - "¿En qué momento te gustaría entender mejor el código: al recibirlo, cuando falla, antes de subirlo?"
   - "¿Pegarías código de tu trabajo en una web para que te lo explique?"
   - "¿Con qué otra tecnología, además de Node, te pasa más?"
2. Apuntar sus respuestas abajo, con sus palabras.
3. Reescribir la frase del problema con lo aprendido.

## 7. Lo que aprendimos de los usuarios

| Persona (perfil) | Lo que contó | ¿Confirma o contradice la hipótesis? |
| ---------------- | ------------ | ------------------------------------ |
|                  |              |                                      |
