import { randomBytes, scryptSync } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
let env='';try{env=await readFile(new URL('.env',root),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
if(/^ADMIN_PASSWORD_HASH=.+/m.test(env))throw new Error('Учётная запись уже настроена. Существующий пароль не изменён.');
const password=randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex');
const hash=scryptSync(password,salt,64).toString('hex');
env=env.replace(/^ADMIN_(PASSWORD_HASH|USERNAME)=.*\r?\n?/gm,'');
await mkdir(new URL('data/',root),{recursive:true,mode:0o700});
await writeFile(new URL('data/admin-access.txt',root),`Локальная панель: http://127.0.0.1:4173/admin/\nЛогин: admin\nПароль: ${password}\nХраните этот файл в защищённом месте. Он исключён из Git.\n`,{flag:'wx',mode:0o600});
await writeFile(new URL('.env',root),env+`\nADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=${salt}:${hash}\n`,{mode:0o600});
console.log('Локальная учётная запись создана. Доступы: '+fileURLToPath(new URL('data/admin-access.txt',root))+' Перезапустите npm start.');
