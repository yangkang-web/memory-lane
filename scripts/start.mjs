import { spawn } from 'node:child_process';
import { openSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir=fileURLToPath(new URL('../',import.meta.url));
try {
  const res = await fetch('http://127.0.0.1:4317/health');
  const data = await res.json();
  if(data.project === 'memory-realm'){console.log('Demo 已运行：http://127.0.0.1:4317');process.exit(0);}
  throw new Error('端口 4317 已被其他项目使用');
} catch(error) {
  if(error.message.includes('端口'))throw error;
}
if(!existsSync(dir+'dist/index.html'))throw new Error('请先运行 npm run build');
const log = openSync(dir+'server.log','a');
const child = spawn(process.execPath,[dir+'scripts/server.mjs'],{cwd:dir,detached:true,stdio:['ignore',log,log]});
child.unref();writeFileSync(dir+'.server.pid',String(child.pid));
let ready=false;
for(let i=0;i<20;i++){
  await new Promise(r=>setTimeout(r,200));
  try{const r=await fetch('http://127.0.0.1:4317/health');const d=await r.json();if(d.project==='memory-realm'){ready=true;break;}}catch{}
}
if(!ready)throw new Error('服务未启动，请查看 server.log；端口 4317 可能已被占用');
console.log('Demo 已启动：http://127.0.0.1:4317');
