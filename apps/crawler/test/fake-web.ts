/** Servidor web simulado para probar el rastreador sin red. */
export function fakeWeb(
  pages: Record<string, { status?: number; body?: string; type?: string } | string>,
) {
  const requests: string[] = [];
  const fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    const page = pages[url];
    if (page === undefined) return new Response('not found', { status: 404 });
    const {
      status = 200,
      body = '',
      type = 'text/html',
    } = typeof page === 'string' ? { body: page } : page;
    return new Response(body, { status, headers: { 'content-type': type } });
  }) as typeof globalThis.fetch;
  return { fetch, requests };
}

export const noSleep = async () => {};
