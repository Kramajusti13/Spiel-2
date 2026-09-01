/**
 * build.mjs — packt das ganze Spiel in EINE HTML-Datei zum Verschicken.
 *
 *   node build.mjs
 *   -> dist/LootAndBlade.html
 *
 * Diese Datei laeuft per Doppelklick, ohne Server und ohne Node. Genau dafuer
 * ist sie da: zum Weitergeben an jemanden, der nur spielen will.
 *
 * Warum ueberhaupt ein Bau-Schritt? Der Browser blockiert bei file:// sowohl
 * ES-Module als auch fetch(). Also werden hier
 *   1. alle Module zu einem einzigen klassischen Skript zusammengefasst,
 *   2. Sprites, Toene und Level als Daten mit eingebettet,
 *   3. fetch() und das Laden von Bildern auf diese eingebetteten Daten umgebogen.
 *
 * Am Quellcode aendert das nichts — die Entwicklung laeuft weiter ueber
 * `node server.mjs`. Nach Aenderungen einfach neu bauen.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';

const root = import.meta.dirname;
const ENTRY = 'src/main.js';

// ---------------------------------------------------------------- Module
/** Pfad eines Imports relativ zum Projektordner aufloesen. */
function resolveImport(fromFile, spec) {
  const dir = posix.dirname(fromFile);
  return posix.normalize(posix.join(dir, spec));
}

/**
 * Ein Modul umschreiben:
 *   import { a, b as c } from './x.js'  ->  const { a, b: c } = __req('src/x.js')
 *   export const/class/function X       ->  const/class/function X   (+ Ausgabeliste)
 */
function transform(file, source) {
  const exported = [];
  let code = source;

  code = code.replace(
    /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/gm,
    (_all, names, spec) => {
      const bindings = names
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => {
          const m = n.match(/^(\S+)\s+as\s+(\S+)$/);
          return m ? `${m[1]}: ${m[2]}` : n;
        })
        .join(', ');
      return `const { ${bindings} } = __req('${resolveImport(file, spec)}');`;
    },
  );

  code = code.replace(/^export\s+(async\s+function|function|class|const)\s+([A-Za-z_$][\w$]*)/gm,
    (_all, kind, name) => {
      exported.push(name);
      return `${kind} ${name}`;
    });

  // Ein uebriggebliebenes "export" waere ein nicht unterstuetzter Sonderfall.
  const rest = code.match(/^\s*export\b.*/m);
  if (rest) throw new Error(`${file}: nicht unterstuetzte Export-Form: ${rest[0].trim()}`);

  const exportLine = exported.length
    ? `\n__exports.${exported.join(' = undefined;\n__exports.')} = undefined;\n`
      + `Object.assign(__exports, { ${exported.join(', ')} });\n`
    : '';
  return code + exportLine;
}

/** Vom Einstiegspunkt aus alle erreichbaren Module einsammeln. */
function collectModules(entry) {
  const modules = new Map();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (modules.has(file)) continue;
    const source = readFileSync(join(root, file), 'utf8');
    modules.set(file, source);
    for (const m of source.matchAll(/^import\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/gm)) {
      queue.push(resolveImport(file, m[1]));
    }
  }
  return modules;
}

// ---------------------------------------------------------------- Assets
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.json': 'application/json',
};

/** Alle Dateien eines Ordners als Daten-URI einsammeln. */
function collectAssets(dir, urlPrefix) {
  const out = {};
  let count = 0;
  let bytes = 0;
  for (const name of readdirSync(join(root, dir))) {
    const full = join(root, dir, name);
    if (!statSync(full).isFile()) continue;
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    const mime = MIME[ext];
    if (!mime) continue;            // CREDITS.md o. Ae. gehoert nicht ins Spiel
    const data = readFileSync(full);
    out[`${urlPrefix}/${name}`] = `data:${mime};base64,${data.toString('base64')}`;
    count += 1;
    bytes += data.length;
  }
  return { out, count, bytes };
}

// ---------------------------------------------------------------- Bauen
const modules = collectModules(ENTRY);

// Bilder werden nicht ueber fetch geladen, sondern ueber img.src — deshalb hier
// die eine Stelle in gfx.js auf die eingebetteten Daten umbiegen.
const IMG_SRC_ORIGINAL = '    img.src = url;';
const IMG_SRC_PATCHED = '    img.src = (self.__ASSET && self.__ASSET[url]) || url;';
const gfx = modules.get('src/gfx.js');
if (!gfx || !gfx.includes(IMG_SRC_ORIGINAL)) {
  throw new Error('src/gfx.js: Zeile "img.src = url;" nicht gefunden — build.mjs anpassen.');
}
modules.set('src/gfx.js', gfx.replace(IMG_SRC_ORIGINAL, IMG_SRC_PATCHED));

const sprites = collectAssets('assets/sprites', './assets/sprites');
const sounds = collectAssets('assets/sounds', './assets/sounds');
const levels = collectAssets('assets/levels', './assets/levels');
const assets = { ...sprites.out, ...sounds.out, ...levels.out };

const moduleSource = [...modules.entries()]
  .map(([file, src]) => `'${file}': (__exports, __req) => {\n${transform(file, src)}\n},`)
  .join('\n');

const runtime = `
// --- Eingebettete Assets: Pfad -> Daten-URI ---
self.__ASSET = ${JSON.stringify(assets)};

// fetch() auf die eingebetteten Daten umbiegen (Level-JSON und Toene).
// Alles Unbekannte geht weiter an das echte fetch.
const __origFetch = self.fetch ? self.fetch.bind(self) : null;
self.fetch = (input, init) => {
  const url = String(input);
  const data = self.__ASSET[url];
  if (!data) {
    if (__origFetch) return __origFetch(input, init);
    return Promise.reject(new Error('Nicht eingebettet: ' + url));
  }
  const komma = data.indexOf(',');
  const mime = data.slice(5, data.indexOf(';'));
  const roh = atob(data.slice(komma + 1));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return Promise.resolve(new Response(bytes, { status: 200, headers: { 'Content-Type': mime } }));
};

// --- Mini-Modulsystem: ersetzt import/export in einer einzelnen Datei ---
const __mods = {
${moduleSource}
};
const __cache = {};
const __req = (pfad) => {
  if (!__cache[pfad]) {
    const exports = {};
    __cache[pfad] = exports;          // vor dem Ausfuehren, wegen Ringbezuegen
    const mod = __mods[pfad];
    if (!mod) throw new Error('Modul fehlt im Bundle: ' + pfad);
    mod(exports, __req);
  }
  return __cache[pfad];
};
__req('${ENTRY}');
`;

// index.html uebernehmen und das Modul-Skript durch das Bundle ersetzen
let html = readFileSync(join(root, 'index.html'), 'utf8');
const scriptTag = /<script type="module"[^>]*><\/script>/;
if (!scriptTag.test(html)) {
  throw new Error('index.html: <script type="module"> nicht gefunden — build.mjs anpassen.');
}
html = html.replace(scriptTag, `<script>\n${runtime}\n</script>`);
html = html.replace('<title>', '<!-- Gebaut mit build.mjs — nicht von Hand bearbeiten. -->\n  <title>');

mkdirSync(join(root, 'dist'), { recursive: true });
const outFile = join(root, 'dist', 'LootAndBlade.html');
writeFileSync(outFile, html, 'utf8');

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`${relative(root, outFile)} gebaut`);
console.log(`  ${modules.size} Module`);
console.log(`  ${sprites.count} Sprites (${kb(sprites.bytes)}), ${sounds.count} Toene (${kb(sounds.bytes)}), ${levels.count} Level`);
console.log(`  Gesamtgroesse: ${kb(Buffer.byteLength(html))}`);
console.log('\nDiese eine Datei kannst du verschicken — Doppelklick genuegt.');
