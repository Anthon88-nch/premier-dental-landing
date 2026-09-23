import { mkdir, copyFile, cp, writeFile, readFile } from 'node:fs/promises';
const output=new URL('../site/',import.meta.url),root=new URL('../',import.meta.url);
await mkdir(output,{recursive:true});
// Explicit public allowlist: no server, admin, patient data, credentials, or research.
for(const file of ['index.html','styles.css','app.js'])await copyFile(new URL(file,root),new URL(file,output));
await cp(new URL('assets/',root),new URL('assets/',output),{recursive:true});
await writeFile(new URL('site-config.js',output),"window.PREMIER_CONFIG = Object.freeze({bookingMode:'phone'});\n");
let html=await readFile(new URL('index.html',output),'utf8');
html=html.replace('<form id="booking-form">','<form id="booking-form" hidden>');
html=html.replace('В локальной демонстрационной версии заявка сохраняется на компьютере владельца проекта и не передаётся клинике. Для действительной записи используйте телефон +7 (8552) 59-77-00.','На этой странице онлайн-сбор заявок отключён. Запись осуществляется по телефону +7 (8552) 59-77-00.');
await writeFile(new URL('index.html',output),html);
await writeFile(new URL('.nojekyll',output),'');
await writeFile(new URL('robots.txt',output),'User-agent: *\nDisallow: /\n');
console.log('Static site built in site/. Booking by telephone; backend excluded.');
