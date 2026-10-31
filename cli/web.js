#!/usr/bin/env node
/* Weasel — servidor local do editor web (npm run web). Só usa o Node, sem dependências:
   serve a pasta do projeto e mostra os endereços (localhost, IPv4 e na rede), clicáveis no terminal.

     npm run web                  http://localhost:5317/
     npm run web -- --port 8080   outra porta
*/
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.weasel': 'text/plain; charset=utf-8', '.tsv': 'text/plain; charset=utf-8', '.srt': 'text/plain; charset=utf-8', '.vtt': 'text/vtt; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.flac': 'audio/flac',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.zip': 'application/zip',
};

const args = process.argv.slice(2);
let port = 5317;
const pi = args.indexOf('--port');
if (pi >= 0) port = Number(args[pi + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('weasel: use --port com um número de 1 a 65535'); process.exit(2); }

const server = http.createServer((req, res) => {
  const send = (code, msg) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(msg); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'só GET');
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { return send(400, 'endereço inválido'); }
  let file = path.join(ROOT, rel);
  // nada fora da pasta do projeto
  if (path.relative(ROOT, file).startsWith('..')) return send(403, 'fora do projeto');
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { file = path.join(file, 'index.html'); st = fs.existsSync(file) && fs.statSync(file); }
    if (err || !st || !st.isFile()) return send(404, `não achei ${rel}`);
    // sem cache: o editor mostra na hora o que mudou nos arquivos
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

// link clicável: o texto já é o endereço (os terminais o reconhecem) e, onde dá, vai também como hiperlink (OSC 8)
const tty = process.stdout.isTTY && process.env.TERM !== 'dumb';
const link = (url) => (tty ? `\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\` : url);
const bold = (s) => (tty && !process.env.NO_COLOR ? `\x1b[1m${s}\x1b[0m` : s);

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`weasel: a porta ${port} já está em uso (o editor já está aberto? use npm run web -- --port ${port + 1})`);
  else console.error(`weasel: ${e.message}`);
  process.exit(1);
});
// como antes: escuta em todos os endereços, então outro aparelho da rede também abre
server.listen(port, () => {
  // o endereço na rede de casa (192.168…, depois 10…, depois 172.16–31…), para abrir no celular
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  const lan = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./].map((re) => ips.find((ip) => re.test(ip))).find(Boolean);
  // o navegador guarda os arquivos por endereço: localhost e 127.0.0.1 não veem os mesmos
  console.log(`${bold(`Weasel ${VERSION}`)} — editor em ${link(`http://localhost:${port}/`)}`);
  console.log(`  IPv4:    ${link(`http://127.0.0.1:${port}/`)}`);
  if (lan) console.log(`  na rede: ${link(`http://${lan}:${port}/`)}`);
  console.log('  Ctrl+C para parar');
});
