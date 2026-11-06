// ¿Qué parte de las APIs públicas de los tipos de Node tiene sección en la documentación?
import ts from 'typescript';
import { join } from 'node:path';
import { buildCatalog, moduleToPrefix } from './catalog.mjs';

const catalog = buildCatalog(process.argv[2]);
const MODULES = ['fs', 'fs/promises', 'path', 'os', 'util', 'crypto', 'http', 'https', 'net', 'dns', 'zlib', 'url', 'child_process',
  'events', 'stream', 'stream/promises', 'readline', 'timers/promises', 'worker_threads', 'assert', 'buffer', 'querystring', 'dgram', 'tls', 'perf_hooks', 'vm', 'v8', 'cluster', 'async_hooks', 'test'];
const types = join(import.meta.dirname, '../node_modules/@types');
const file = '/virtual/all.ts';
const code = MODULES.map((m, i) => `import * as m${i} from 'node:${m}';`).join('\n');
const options = { noEmit: true, types: ['node'], typeRoots: [types], module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, target: ts.ScriptTarget.ES2023, lib: ['lib.es2023.d.ts'], skipLibCheck: true };
const base = ts.createCompilerHost(options);
const sf = ts.createSourceFile(file, code, ts.ScriptTarget.ES2023, true);
const program = ts.createProgram({ rootNames: [file], options, host: { ...base, getSourceFile: (f, v) => (f === file ? sf : base.getSourceFile(f, v)), fileExists: (f) => f === file || base.fileExists(f) } });
const checker = program.getTypeChecker();

const stats = { functions: [0, 0], classMembers: [0, 0] };
const missing = [];
MODULES.forEach((mod, i) => {
  const decl = sf.statements[i];
  const modSym = checker.getSymbolAtLocation(decl.moduleSpecifier);
  if (!modSym) return;
  const prefix = moduleToPrefix(mod);
  for (const exp of checker.getExportsOfModule(modSym)) {
    const sym = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
    const name = exp.getName();
    if (name === 'default' || name.startsWith('_')) continue;
    if (sym.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable)) {
      stats.functions[1]++;
      const keys = [`mod:${prefix}.${name}`, `mod:${mod.split('/')[0]}.${name}`];
      if (keys.some((k) => catalog.byKey.has(k))) stats.functions[0]++; else missing.push(`${prefix}.${name}`);
    } else if (sym.flags & ts.SymbolFlags.Class) {
      const page = mod.split('/')[0];
      const type = checker.getDeclaredTypeOfSymbol(sym);
      for (const prop of checker.getPropertiesOfType(type)) {
        const pd = prop.declarations?.[0];
        if (!pd || prop.getName().startsWith('_') || !pd.getSourceFile().fileName.includes('@types/node')) continue;
        // Solo los miembros declarados en la propia clase (los heredados cuentan en su clase base).
        if (pd.parent?.name?.getText?.() !== name) continue;
        stats.classMembers[1]++;
        const keys = [`member:${page}.${name}#${prop.getName()}`, `member:*.${name}#${prop.getName()}`];
        if (keys.some((k) => catalog.byKey.has(k))) stats.classMembers[0]++; else missing.push(`${name}#${prop.getName()}`);
      }
    }
  }
});
const pct = ([a, b]) => `${a}/${b} = ${((100 * a) / b).toFixed(0)}%`;
console.log(`Funciones y valores de módulo con sección: ${pct(stats.functions)}`);
console.log(`Miembros de clases con sección:           ${pct(stats.classMembers)}`);
console.log(`Ejemplos sin sección:`, missing.sort(() => 0.5 - Math.random()).slice(0, 15).join(', '));
