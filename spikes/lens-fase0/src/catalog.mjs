// Catálogo: cada sección de la documentación -> claves por las que se puede encontrar desde código.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const PREFIX_TO_MODULE = {
  fsPromises: 'fs/promises', dnsPromises: 'dns/promises', timersPromises: 'timers/promises',
  readlinePromises: 'readline/promises', streamPromises: 'stream/promises', streamConsumers: 'stream/consumers',
};
export const moduleToPrefix = (mod) =>
  Object.entries(PREFIX_TO_MODULE).find(([, m]) => m === mod)?.[0] ?? mod;

/** Alternativa recomendada, tal y como la escribe la documentación ("Use X instead"). */
const replacementOf = (text) => text.match(/Stability: 0 - Deprecated:? ?([^.]*)/)?.[1]?.trim() || undefined;

/** Estado de una sección según la documentación. Lo autoritativo es su propio "Stability: 0". */
function statusOf(doc, depByApi) {
  if (/Stability: 0 - Deprecated/.test(doc.body)) {
    const dep = depByApi.get(doc.title.split('(')[0].replace(/^(Static method: |new )/, ''));
    return { status: 'deprecated', dep, replacement: replacementOf(doc.body) };
  }
  return { status: 'stable' };
}

/**
 * ¿El aviso trata de la API en sí ("DEP0034: fs.exists(path, callback)") o de un
 * comportamiento suyo ("DEP0162: fs.write(), fs.writeFileSync() coercion to string")?
 * Solo los primeros sirven para marcar una API como obsoleta o eliminada.
 */
function isAboutApiItself(title) {
  const rest = title.replace(/^DEP\d+:\s*/, '')
    .replace(/(?:new )?[A-Za-z_][\w]*(?:\.[\w$]+)+(?:\([^)]*\))?/g, '')
    .replace(/\b(and|or|the|methods?|functions?|class|properties|property|module)\b|[,()]/gi, '');
  return rest.trim() === '';
}

export function buildCatalog(corpusPath) {
  const docs = gunzipSync(readFileSync(corpusPath)).toString().trim().split('\n').map(JSON.parse);
  const byKey = new Map();
  // Avisos DEPxxxx: qué APIs mencionan en el título. Las revocadas no cuentan.
  const depByApi = new Map();
  for (const doc of docs.filter((d) => /^DEP\d+/.test(d.title))) {
    if (/Type: (Deprecation revoked|Revoked)/.test(doc.body) || !isAboutApiItself(doc.title)) continue;
    for (const api of doc.title.matchAll(/\b((?:new )?[A-Za-z_][\w]*(?:\.[\w$]+)+)/g)) depByApi.set(api[1].replace(/^new /, ''), doc);
  }
  const add = (key, doc) => { if (!byKey.has(key)) byKey.set(key, { ...doc, ...statusOf(doc, depByApi) }); };

  for (const doc of docs) {
    const t = doc.title;
    const page = doc.url.split('/api/')[1].split('.html')[0];
    const classCrumb = [...doc.breadcrumbs].reverse().find((c) => c.startsWith('Class: '));
    const cls = classCrumb?.replace('Class: ', '').split(/[ <]/)[0].split('.').pop();
    let m;
    if ((m = t.match(/^Class: (?:[\w]+\.)?([A-Z][\w]*)/))) add(`class:${page}.${m[1]}`, doc), add(`class:*.${m[1]}`, doc);
    else if ((m = t.match(/^Static method: ([A-Z][\w]*)\.([\w$]+)/))) add(`static:${m[1]}.${m[2]}`, doc);
    else if ((m = t.match(/^new ([A-Z][\w.]*)\(/))) add(`new:${m[1].split('.').pop()}`, doc);
    else if ((m = t.match(/^Event: '([\w-]+)'/))) add(`event:${page}.${cls ?? '*'}#${m[1]}`, doc), add(`event:*.${cls ?? page}#${m[1]}`, doc);
    else if ((m = t.match(/^([a-z_][\w]*)\.([\w$]+)(?:\(|$| )/)) && cls) add(`member:${page}.${cls}#${m[2]}`, doc), add(`member:*.${cls}#${m[2]}`, doc);
    else if ((m = t.match(/^([a-z_][\w]*)\.([\w$.]+?)(?:\(|$| )/))) add(`mod:${m[1]}.${m[2]}`, doc);
    else if ((m = t.match(/^([a-zA-Z_$][\w$]*)(?:\(|$)/))) add(`global:${m[1]}`, doc);
    if (t === 'import.meta.dirname' || t === 'import.meta.filename' || t === 'import.meta.url') add(`meta:${t}`, doc);
  }
  // APIs eliminadas: su aviso es End-of-Life y ya no tienen sección propia en la documentación.
  const liveApis = new Set(docs.filter((d) => !/^DEP\d+/.test(d.title)).map((d) => d.title.split('(')[0].replace(/^(Static method: |new )/, '')));
  for (const [api, dep] of depByApi) {
    if (/Type: End-of-Life/.test(dep.body) && !liveApis.has(api)) byKey.set(`removed:${api}`, { ...dep, status: 'removed', dep });
  }
  return { byKey, docs };
}
