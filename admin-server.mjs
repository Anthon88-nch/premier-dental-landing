import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, readdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export function createAdmin({dataDir, json, locks}) {
  const sessions = new Map(), attempts = new Map();
  const statuses = ['new','in_progress','waiting','booked','completed','cancelled'];
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  const secure = (process.env.PUBLIC_ORIGIN || '').startsWith('https://');
  const cookie = (value, age) => `premier_admin=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${age}${secure?'; Secure':''}`;
  const equal = (a,b) => { const aa=Buffer.from(a),bb=Buffer.from(b); return aa.length===bb.length && timingSafeEqual(aa,bb); };
  async function body(req) {
    let size=0; const chunks=[];
    for await (const chunk of req) {size+=chunk.length;if(size>8192)throw new Error('body');chunks.push(chunk);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  return async function admin(req,res,url) {
    if(!url.pathname.startsWith('/api/admin/'))return false;
    const send=(status,data)=>{json(res,status,data);return true;};
    if(!hash)return send(503,{message:'Панель ещё не настроена. Выполните npm run admin:init на компьютере владельца.'});
    const origin=process.env.PUBLIC_ORIGIN || `http://${req.headers.host}`;
    if(!['GET','HEAD'].includes(req.method) && (req.headers.origin!==origin || !req.headers['content-type']?.startsWith('application/json')))return send(403,{message:'Запрос отклонён.'});
    const now=Date.now();
    for(const [key,s] of sessions)if(s.expires<now)sessions.delete(key);
    for(const [key,a] of attempts)if(a.until<now)attempts.delete(key);
    if(url.pathname==='/api/admin/login' && req.method==='POST') {
      const ip=req.socket.remoteAddress, attempt=attempts.get(ip)||{count:0,until:now+900000};
      if(attempt.count>=5)return send(429,{message:'Слишком много попыток входа. Повторите через 15 минут.'});
      attempt.count++;attempts.set(ip,attempt);
      let input;try{input=await body(req);}catch{return send(400,{message:'Неверный формат.'});}
      const [salt,expected]=hash.split(':');
      if(typeof input?.password!=='string'||input.password.length>256||!salt||!/^[a-f0-9]{128}$/.test(expected||''))return send(401,{message:'Неверный логин или пароль.'});
      const actual=scryptSync(input.password,salt,64).toString('hex');
      if(!equal(actual,expected)||!equal(String(input.username||''),process.env.ADMIN_USERNAME||'admin'))return send(401,{message:'Неверный логин или пароль.'});
      attempts.delete(ip);
      const token=randomBytes(32).toString('hex'), csrf=randomBytes(24).toString('hex');
      sessions.set(token,{csrf,expires:now+8*3600000});
      res.setHeader('Set-Cookie',cookie(token,28800));
      return send(200,{csrf});
    }
    const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('premier_admin='))?.slice(14);
    const session=sessions.get(token);
    if(!session)return send(401,{message:'Войдите в панель.'});
    if(req.method!=='GET' && req.headers['x-csrf-token']!==session.csrf)return send(403,{message:'Обновите страницу и повторите действие.'});
    if(url.pathname==='/api/admin/session' && req.method==='GET')return send(200,{csrf:session.csrf});
    if(url.pathname==='/api/admin/logout' && req.method==='POST') {sessions.delete(token);res.setHeader('Set-Cookie',cookie('',0));return send(200,{ok:true});}
    if(url.pathname==='/api/admin/leads' && req.method==='GET') {
      let files;try{files=await readdir(dataDir);}catch(e){if(e.code!=='ENOENT')throw e;files=[];}
      const records=[];
      for(const file of files.filter(x=>/^[a-f0-9-]{36}\.json$/.test(x))) {
        const {fingerprint,...record}=JSON.parse(await readFile(path.join(dataDir,file),'utf8'));
        records.push({...record,workflow:record.workflow||'new',version:record.version||0});
      }
      records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      return send(200,{leads:records});
    }
    const match=url.pathname.match(/^\/api\/admin\/leads\/([a-f0-9-]{36})$/);
    if(match && req.method==='PATCH') {
      let input;try{input=await body(req);}catch{return send(400,{message:'Неверный формат.'});}
      if(!input||!statuses.includes(input.workflow)||typeof input.note!=='string'||input.note.length>2000||!Number.isInteger(input.version))return send(400,{message:'Проверьте статус и комментарий (до 2000 символов).'});
      const id=match[1];
      // Serialize edits with form submissions; optimistic version prevents lost edits.
      while(locks.has(id))await locks.get(id);
      const task=(async()=>{
        const file=path.join(dataDir,id+'.json');
        let record;try{record=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return [404,{message:'Заявка не найдена.'}];throw e;}
        if((record.version||0)!==input.version)return [409,{message:'Заявка уже изменена. Обновите список и повторите правку.'}];
        const previous=record.workflow||'new', noteChanged=(record.note||'')!==input.note;
        record.workflow=input.workflow;record.note=input.note;record.version=(record.version||0)+1;record.updatedAt=new Date().toISOString();
        record.history=[...(record.history||[]),{at:record.updatedAt,from:previous,to:input.workflow,noteChanged,actor:process.env.ADMIN_USERNAME||'admin'}];
        await writeFile(file+'.admin.tmp',JSON.stringify(record,null,2),{mode:0o600});await rename(file+'.admin.tmp',file);
        return [200,{ok:true}];
      })();
      locks.set(id,task);
      try{const [status,result]=await task;return send(status,result);}finally{if(locks.get(id)===task)locks.delete(id);}
    }
    return send(404,{message:'Метод не найден.'});
  };
}
