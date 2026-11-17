/**
 * Forma canónica de una URL para evitar visitar la misma página dos veces:
 * sin fragmento, sin parámetros de seguimiento, host en minúsculas y sin puerto por defecto.
 */
export function normalizeUrl(input: string, base?: string): string | undefined {
  let url: URL;
  try {
    url = new URL(input, base);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;

  url.hash = '';
  url.username = '';
  url.password = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}
