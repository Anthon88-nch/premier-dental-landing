import http from 'node:http';
import { readFile, mkdir, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createAdmin } from './admin-server.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(path.join(root, '.env')); } catch(error) { if(error.code !== 'ENOENT') throw error; }
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const dataDir = path.resolve(root, process.env.LEAD_DATA_DIR || 'data');
const webhook = process.env.LEAD_WEBHOOK_URL || '';
if(webhook && new URL(webhook).protocol !== 'https:') throw new Error('LEAD_WEBHOOK_URL must use HTTPS');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2' };
const inFlight = new Map();
const rate = new Map();
const allowed = new Set(['/index.html','/styles.css','/app.js','/site-config.js','/admin/index.html','/admin/admin.css','/admin/admin.js']);
const headers = { 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'X-Frame-Options':'DENY', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" };
function json(res, status, data) { res.writeHead(status, { ...headers, 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(data)); }
function validLead(body) {
  return body && typeof body === 'object' && typeof body.phone === 'string' && /^\+7\d{10}$/.test(body.phone)
    && typeof body.name === 'string' && body.name.length <= 70 && !/[\x00-\x1f]/.test(body.name)
    && body.consent === true && typeof body.requestId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId);
}
async function persistLead(body) {
  await mkdir(dataDir, {recursive:true, mode:0o700});
  const file = path.join(dataDir, `${body.requestId}.json`);
  const fingerprint = createHash('sha256').update(body.phone+'\0'+body.name).digest('hex');
  let record;
  try { record = JSON.parse(await readFile(file,'utf8')); } catch(e) { if(e.code !== 'ENOENT') throw e; }
  if(record && record.fingerprint !== fingerprint) return {status:409, message:'Обновите страницу и попробуйте снова.'};
  if(record?.status === 'delivered' || record?.status === 'preview') return {status:200, preview:record.status === 'preview'};
  if(!record) {
    record = {id:body.requestId,name:body.name,phone:body.phone,consent:true,consentVersion:'preview-2026-09-23',createdAt:new Date().toISOString(),status:webhook?'pending':'preview',fingerprint};
    await writeFile(file,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
  }
  if(webhook) {
    const response = await fetch(webhook, {method:'POST',signal:AbortSignal.timeout(9000),headers:{'Content-Type':'application/json','Idempotency-Key':body.requestId,...(process.env.LEAD_WEBHOOK_TOKEN?{Authorization:`Bearer ${process.env.LEAD_WEBHOOK_TOKEN}`}:{})},body:JSON.stringify({id:record.id,name:record.name,phone:record.phone,consent:record.consent,createdAt:record.createdAt,source:'premier-landing'})});
    if(!response.ok) return {status:502,message:'Не удалось подтвердить передачу заявки. Попробуйте ещё раз или позвоните в клинику.'};
    record.status = 'delivered';
    const temp = `${file}.tmp`;
    await writeFile(temp,JSON.stringify(record,null,2),{mode:0o600});
    await rename(temp,file);
  }
  return {status:200,preview:!webhook};
}
const admin = createAdmin({dataDir,json,locks:inFlight});
const server = http.createServer(async(req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if(await admin(req,res,url))return;
    if(url.pathname === '/api/leads' && req.method === 'POST') {
      const origin = req.headers.origin;
      const allowedOrigin = process.env.PUBLIC_ORIGIN || `http://${req.headers.host}`;
      if(origin && origin !== allowedOrigin) return json(res,403,{message:'Запрос отклонён.'});
      if(!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{message:'Неверный формат запроса.'});
      const now = Date.now();
      for(const [key,value] of rate) if(now - value.time > 600000) rate.delete(key);
      const ip = req.socket.remoteAddress || 'local';
      const current = rate.get(ip) || {time:now,count:0};
      if(current.count >= 15) return json(res,429,{message:'Слишком много попыток. Попробуйте позже или позвоните в клинику.'});
      current.count++; rate.set(ip,current);
      let size = 0; const chunks = [];
      for await(const chunk of req) {
        size += chunk.length;
        if(size > 4096) { json(res,413,{message:'Слишком большой запрос.'}); req.resume(); return; }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(res,400,{message:'Неверный формат запроса.'}); }
      if(!body || typeof body !== 'object' || body.website) return json(res,400,{message:'Запрос отклонён.'});
      if(!validLead(body)) return json(res,400,{message:'Проверьте имя, телефон и согласие на обработку данных.'});
      const id = body.requestId;
      // Serialize a repeated click and preserve the same id across network retries.
      while(inFlight.has(id)) await inFlight.get(id);
      const task = persistLead(body);
      inFlight.set(id,task);
      try { const result = await task; return json(res,result.status,result); }
      finally { if(inFlight.get(id) === task) inFlight.delete(id); }
    }
    if(!['GET','HEAD'].includes(req.method)) return json(res,405,{message:'Метод не поддерживается.'});
    const pathname = url.pathname === '/' ? '/index.html' : ['/admin','/admin/'].includes(url.pathname) ? '/admin/index.html' : decodeURIComponent(url.pathname);
    const asset = /^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname);
    if(!allowed.has(pathname) && !asset) return json(res,404,{message:'Страница не найдена.'});
    const filename = path.join(root,pathname);
    const ext = path.extname(filename);
    if(!mime[ext]) return json(res,404,{message:'Файл не найден.'});
    const info = await stat(filename);
    if(!info.isFile()) return json(res,404,{message:'Файл не найден.'});
    res.writeHead(200,{...headers,'Content-Type':mime[ext],'Content-Length':info.size,'Cache-Control':asset?'public, max-age=86400':'no-cache'});
    res.end(req.method === 'HEAD' ? undefined : await readFile(filename));
  } catch(e) {
    if(!res.headersSent) json(res,e.code === 'ENOENT'?404:503,{message:'Сервис временно недоступен. Позвоните в клинику: +7 (8552) 59-77-00.'});
    else res.end();
    // Do not log request bodies, phone numbers, names, tokens, or webhook responses.
  }
});
server.requestTimeout = 20000;
server.headersTimeout = 10000;
server.listen(port,host,() => console.log(`Premier preview: http://${host}:${port} (${webhook?'CRM configured':'local preview'})`));
function shutdown(){server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
