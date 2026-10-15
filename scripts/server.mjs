import http from 'node:http';
import {isAppPath} from '../src/routes.js';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = {'.jpg':'image/jpeg','.jpeg':'image/jpeg','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.gltf':'model/gltf+json','.bin':'application/octet-stream','.txt':'text/plain; charset=utf-8','.json':'application/json'};
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    const url = new URL(req.url, 'http://127.0.0.1');
    if(url.pathname === '/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({project:'memory-realm-next',status:'ready'}));return;}
    const path = resolve(root, '.' + decodeURIComponent(isAppPath(url.pathname) ? '/index.html' : url.pathname));
    if(path !== root && !path.startsWith(root + sep)){res.writeHead(403);res.end();return;}
    const info = await stat(path);
    if(!info.isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':types[extname(path)] || 'application/octet-stream','Cache-Control':'no-cache','Content-Length':info.size,'X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : await readFile(path));
  } catch {res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.MEMORY_LANE_PORT||4327);
server.listen(port,'127.0.0.1',()=>console.log(`Memory Lane ready: http://127.0.0.1:${port}/school`));
