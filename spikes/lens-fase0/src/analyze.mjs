// Prototipo: resuelve los usos de APIs de Node en un archivo con el compilador de TypeScript.
import ts from 'typescript';
import { dirname, join } from 'node:path';
import { moduleToPrefix } from './catalog.mjs';

const TYPES_DIR = join(import.meta.dirname, '../node_modules/@types/node');
const options = {
  allowJs: true, checkJs: false, noEmit: true, target: ts.ScriptTarget.ES2023,
  module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
  types: ['node'], typeRoots: [dirname(TYPES_DIR)], skipLibCheck: true, lib: ['lib.es2023.d.ts'],
};

// Caché de los .d.ts entre análisis: es lo que hace que el segundo análisis sea rápido.
const sourceCache = new Map();
const baseHost = ts.createCompilerHost(options);
const host = {
  ...baseHost,
  getSourceFile(fileName, languageVersion, onError) {
    if (fileName.startsWith('/virtual/')) return undefined;
    let sf = sourceCache.get(fileName);
    if (!sf) { sf = baseHost.getSourceFile(fileName, languageVersion, onError); if (sf) sourceCache.set(fileName, sf); }
    return sf;
  },
};

const isNodeTypes = (sf) => sf.fileName.includes('/@types/node/');
function moduleOf(decl) {
  for (let n = decl; n; n = n.parent) {
    if (ts.isModuleDeclaration(n) && n.flags & ts.NodeFlags.GlobalAugmentation) return undefined;
    if (ts.isModuleDeclaration(n) && ts.isStringLiteral(n.name)) return n.name.text.replace(/^node:/, '');
  }
  return undefined; // global
}
function resolveAlias(checker, sym) {
  return sym && sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
}
function classChain(checker, type, out = [], seen = new Set()) {
  const syms = [type.getSymbol(), type.aliasSymbol].filter(Boolean);
  for (const s of syms) {
    if (seen.has(s)) continue; seen.add(s);
    const decl = s.declarations?.find((d) => isNodeTypes(d.getSourceFile()));
    if (decl) out.push({ name: s.getName(), module: moduleOf(decl) });
  }
  const target = type.target ?? type;
  if (target.isClassOrInterface?.()) for (const b of checker.getBaseTypes(target)) classChain(checker, b, out, seen);
  if (type.isUnionOrIntersection?.()) for (const t of type.types) classChain(checker, t, out, seen);
  return out;
}

export function analyze(fileName, code, catalog) {
  const virtual = `/virtual/${fileName}`;
  const sf = ts.createSourceFile(virtual, code, ts.ScriptTarget.ES2023, true,
    fileName.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const program = ts.createProgram({
    rootNames: [virtual], options,
    host: { ...host, getSourceFile: (f, v, e) => (f === virtual ? sf : host.getSourceFile(f, v, e)), fileExists: (f) => f === virtual || baseHost.fileExists(f), readFile: (f) => (f === virtual ? code : baseHost.readFile(f)) },
  });
  const checker = program.getTypeChecker();
  const findings = [];
  const unresolved = [];
  const line = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const record = (node, keys, label) => {
    for (const key of keys) {
      const doc = catalog.byKey.get(key);
      if (doc) return findings.push({ line: line(node), label, key, title: doc.title, url: doc.url, status: doc.status, dep: doc.dep, replacement: doc.replacement });
    }
    unresolved.push({ line: line(node), label, tried: keys.slice(0, 3) });
  };

  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      const member = node.name.text;
      const sym = resolveAlias(checker, checker.getSymbolAtLocation(node.name));
      const decl = sym?.declarations?.[0];
      const recvSym = resolveAlias(checker, checker.getSymbolAtLocation(node.expression));
      const recvDecl = recvSym?.declarations?.[0];
      const recvModule = recvSym && (recvSym.flags & ts.SymbolFlags.ValueModule || (recvDecl && (ts.isSourceFile(recvDecl) || ts.isModuleDeclaration(recvDecl))))
        ? (moduleOf(recvDecl) ?? recvSym.getName().replace(/"/g, '').replace(/^node:/, '')) : undefined;
          if (ts.isMetaProperty(node.expression)) {
        record(node, [`meta:import.meta.${member}`], `import.meta.${member}`);
      } else if (!decl && recvModule) {
        // El miembro no existe en los tipos: puede ser una API eliminada (crypto.createCipher).
        const keys = [`removed:${moduleToPrefix(recvModule)}.${member}`, `removed:${recvModule}.${member}`];
        if (keys.some((k) => catalog.byKey.has(k))) record(node, keys, node.getText(sf).slice(0, 60));
      } else if (decl && isNodeTypes(decl.getSourceFile())) {
        const recvIsStatic = ts.isIdentifier(node.expression) && recvSym &&
          (recvSym.flags & ts.SymbolFlags.Class || checker.typeToString(checker.getTypeAtLocation(node.expression)) === `${recvSym.getName()}Constructor`);
        const keys = [];
        const moduleLevel = decl.parent && ts.isModuleBlock(decl.parent) || (decl.parent?.parent && ts.isModuleBlock(decl.parent.parent));
        if (recvModule) {
          keys.push(`mod:${moduleToPrefix(recvModule)}.${member}`);
          if (recvModule.endsWith('/promises')) keys.push(`mod:${recvModule.split('/')[0]}.${member}`);
        } else if (recvIsStatic) keys.push(`static:${recvSym.getName()}.${member}`);
        else {
          const recvName = ts.isIdentifier(node.expression) ? node.expression.text : undefined;
          const chain = classChain(checker, checker.getTypeAtLocation(node.expression));
          // x.on('evento') / x.once('evento'): la sección del evento es más útil que la de on().
          const call = node.parent;
          if (['on', 'once', 'addListener', 'off'].includes(member) && ts.isCallExpression(call) && call.expression === node && ts.isStringLiteral(call.arguments[0] ?? node)) {
            const evt = call.arguments[0].text;
            if (recvName === 'process') keys.push(`event:process.*#${evt}`);
            for (const c of chain) keys.push(`event:${moduleToPrefix(c.module ?? '*')}.${c.name}#${evt}`, `event:*.${c.name}#${evt}`);
          }
          if (recvName && ['process', 'console'].includes(recvName)) keys.push(`mod:${recvName}.${member}`);
          for (const c of chain) keys.push(`member:${moduleToPrefix(c.module ?? '*')}.${c.name}#${member}`, `member:*.${c.name}#${member}`);
          const mod = moduleOf(decl);
          if (mod && moduleLevel) keys.push(`mod:${moduleToPrefix(mod)}.${member}`);
        }
        record(node, keys, node.getText(sf).slice(0, 60));
      }
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const sym = resolveAlias(checker, checker.getSymbolAtLocation(node.expression));
      const decl = sym?.declarations?.[0];
      if (decl && isNodeTypes(decl.getSourceFile())) {
        const mod = moduleOf(decl);
        const keys = mod ? [`mod:${moduleToPrefix(mod)}.${sym.getName()}`] : [`global:${sym.getName()}`];
        if (mod?.endsWith('/promises')) keys.push(`mod:${mod.split('/')[0]}.${sym.getName()}`);
        record(node, keys, `${node.expression.text}()`);
      }
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const sym = resolveAlias(checker, checker.getSymbolAtLocation(node.expression));
      const decl = sym?.declarations?.find((d) => isNodeTypes(d.getSourceFile()));
      if (decl) { const mod = moduleOf(decl); record(node, [`new:${sym.getName()}`, `class:${mod ?? '*'}.${sym.getName()}`, `class:*.${sym.getName()}`], `new ${sym.getName()}()`); }
    } else if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent) && !ts.isImportClause(node.parent) && !ts.isNamespaceImport(node.parent)
      && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
      && !((ts.isCallExpression(node.parent) || ts.isNewExpression(node.parent)) && node.parent.expression === node)) {
      // Usos de valores importados que no se llaman: if (isMainThread), parentPort?.on(...)
      const raw = checker.getSymbolAtLocation(node);
      if (raw && raw.flags & ts.SymbolFlags.Alias) {
        const sym = resolveAlias(checker, raw);
        const decl = sym?.declarations?.[0];
        if (decl && isNodeTypes(decl.getSourceFile()) && sym.flags & ts.SymbolFlags.Variable) {
          const mod = moduleOf(decl); if (mod) record(node, [`mod:${moduleToPrefix(mod)}.${sym.getName()}`], sym.getName());
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { findings, unresolved };
}
