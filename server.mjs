/**
 * Winziger statischer Webserver ohne Abhaengigkeiten.
 *
 *   node server.mjs            -> http://localhost:8080
 *   node server.mjs 3000       -> anderer Port
 *
 * Noetig, weil ES-Module und fetch() ueber file:// vom Browser blockiert werden.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const port = Number(process.argv[2]) || 8080;
const root = import.meta.dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.md': 'text/markdown; charset=utf-8',
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const rel = normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^([/\\])+/, '');
  const file = join(root, rel);

  // Nichts ausserhalb des Projektordners ausliefern.
  if (!file.startsWith(root + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — nicht gefunden: ' + rel);
  }
}).listen(port, () => {
  console.log(`Loot & Blade laeuft auf http://localhost:${port}`);
  console.log('Beenden mit Strg+C');
});
