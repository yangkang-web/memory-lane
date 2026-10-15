import http from 'node:http';
import { createReadStream, existsSync, openSync, writeFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const project = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(project, 'dist-bloodbound');
const port = 4330;
const address = `http://127.0.0.1:${port}`;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.hdr': 'application/octet-stream' };

if (process.argv.includes('--start')) {
  let existing;
  try {
    const response = await fetch(`${address}/health`, { signal: AbortSignal.timeout(1500) });
    existing = await response.json();
  } catch (error) {
    if (error.cause?.code !== 'ECONNREFUSED') throw new Error(`端口 ${port} 无法确认，请检查占用。`, { cause: error });
  }
  if (existing) {
    if (existing.project !== 'memory-lane-bloodbound-next') throw new Error(`端口 ${port} 已被其他服务使用`);
    console.log(`BLOODBOUND 已运行：${address}`);
  } else {
    if (!existsSync(resolve(root, 'bloodbound.html'))) throw new Error('请先运行 npm run build:bloodbound');
    const log = openSync(resolve(project, 'bloodbound-server.log'), 'a');
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: project, detached: true, stdio: ['ignore', log, log] });
    child.unref();
    writeFileSync(resolve(project, '.bloodbound.pid'), String(child.pid));
    let ready = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const response = await fetch(`${address}/health`, { signal: AbortSignal.timeout(1000) });
        ready = (await response.json()).project === 'memory-lane-bloodbound-next';
        if (ready) break;
      } catch {}
    }
    if (!ready) throw new Error('服务启动失败，请查看 bloodbound-server.log');
    console.log(`BLOODBOUND 已启动：${address}`);
  }
} else {
  const server = http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    try {
      const url = new URL(request.url, address);
      if (url.pathname === '/health') {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ project: 'memory-lane-bloodbound-next', status: 'ready' }));
        return;
      }
      const path = resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/bloodbound.html' : url.pathname)}`);
      if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      const info = await stat(path);
      if (!info.isFile()) { response.writeHead(404).end(); return; }
      const headers = { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
      const range = request.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
        const start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
        const end = match[1] ? (match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1) : info.size - 1;
        if (start >= info.size || end < start) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
        response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${info.size}` });
        if (request.method === 'HEAD') response.end();
        else createReadStream(path, { start, end }).on('error', () => response.destroy()).pipe(response);
        return;
      }
      response.writeHead(200, { ...headers, 'Content-Length': info.size });
      if (request.method === 'HEAD') response.end();
      else createReadStream(path).on('error', () => response.destroy()).pipe(response);
    } catch { response.writeHead(404).end('Not found'); }
  });
  server.listen(port, '127.0.0.1', () => console.log(`BLOODBOUND ready: ${address}`));
}
