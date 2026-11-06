# Ciclo de vida del proyecto (SDLC)

Cada lab sigue las mismas fases, en orden. Cada carpeta guarda las decisiones y documentos de su fase, para que cualquiera (incluido yo dentro de unos meses) entienda **por qué** el proyecto es como es, no solo **qué** hace.

| Fase                                  | Carpeta                                | Pregunta que responde                                |
| ------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| 1. Ideación y definición del problema | [`01-ideacion`](01-ideacion)           | ¿Qué dolor resolvemos y para quién?                  |
| 2. Requisitos                         | [`02-requisitos`](02-requisitos)       | ¿Qué tiene que hacer exactamente para resolverlo?    |
| 3. Diseño                             | [`03-diseno`](03-diseno)               | ¿Cómo lo vamos a construir?                          |
| 4. Desarrollo                         | [`04-desarrollo`](04-desarrollo)       | ¿Cómo trabajamos mientras lo construimos?            |
| 5. Pruebas                            | [`05-pruebas`](05-pruebas)             | ¿Cómo sabemos que funciona?                          |
| 6. Despliegue                         | [`06-despliegue`](06-despliegue)       | ¿Cómo llega a los usuarios?                          |
| 7. Mantenimiento                      | [`07-mantenimiento`](07-mantenimiento) | ¿Cómo sabemos si sigue funcionando y qué aprendimos? |

Las decisiones técnicas que ya se tomaron están en [`docs/adr`](../adr) y pertenecen a la fase de diseño.
