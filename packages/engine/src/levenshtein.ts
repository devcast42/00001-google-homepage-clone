/**
 * Distancia de Levenshtein con cota superior.
 *
 * Devuelve la distancia si es `<= max`, o `max + 1` en cuanto sabe que la supera.
 * La cota permite descartar la mayoría de candidatos tras pocas filas, que es lo que
 * hace viable comparar la consulta contra todo el vocabulario en cada búsqueda.
 */
export function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a === b) return 0;

  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    [previous, current] = [current, previous];
  }

  const distance = previous[b.length]!;
  return distance > max ? max + 1 : distance;
}

/** Errores tolerados según la longitud de la palabra: las palabras cortas no se corrigen. */
export function maxEditsFor(term: string): number {
  if (term.length < 4) return 0;
  if (term.length < 8) return 1;
  return 2;
}
