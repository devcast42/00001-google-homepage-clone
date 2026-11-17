import type { Highlighted as HighlightedText } from '@docseek/engine';

/**
 * Pinta texto con las coincidencias en `<mark>`. La API devuelve rangos en lugar de HTML,
 * así que todo el texto pasa por React y se escapa: el contenido indexado no puede inyectar HTML.
 */
export function Highlighted({ value }: { readonly value: HighlightedText }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of value.highlights) {
    if (start < cursor || end > value.text.length || start >= end) continue;
    if (start > cursor) parts.push(value.text.slice(cursor, start));
    parts.push(<mark key={start}>{value.text.slice(start, end)}</mark>);
    cursor = end;
  }
  if (cursor < value.text.length) parts.push(value.text.slice(cursor));
  return <>{parts}</>;
}
