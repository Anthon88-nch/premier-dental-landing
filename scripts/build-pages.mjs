import { mkdir, copyFile, cp, writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import {publicPageFiles} from './public-pages.mjs';
import {applySeo,crawlFiles} from './seo.mjs';
import {seoConfig,clinic} from '../content/site.mjs';
import {clientConfigScript} from './client-config.mjs';
await import('./generate-site.mjs');
const output=new URL('../site/',import.meta.url),root=new URL('../',import.meta.url);
await mkdir(output,{recursive:true});
// Explicit public allowlist: no server, admin, patient data, credentials, or research.
const production=process.argv.includes('--production');
const config=seoConfig(production?{...process.env,SITE_URL:process.env.SITE_URL || clinic.primaryUrl,SITE_INDEXABLE:'true'}:process.env);
const htmlFiles = publicPageFiles;
// Remove only obsolete generated HTML within known page directories, never user data.
async function prunePages(dir,relative='') {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const name=relative+entry.name;
    if(entry.isDirectory() && (name==='blog' || name==='services' || relative.startsWith('blog/') || relative.startsWith('services/')))await prunePages(new URL(entry.name+'/',dir),name+'/');
    else if(entry.isFile() && name.endsWith('/index.html') && !htmlFiles.includes(name))await unlink(new URL(entry.name,dir));
  }
}
await prunePages(output);
for(const file of [...htmlFiles,'reviews-widget.js','styles.css','services.css','blog.css','team.css','app.js','analytics.js','contact-widget.css','contact-widget.js']) {
  await mkdir(new URL('./',new URL(file,output)),{recursive:true});
  await copyFile(new URL(file,root),new URL(file,output));
}
await cp(new URL('assets/',root),new URL('assets/',output),{recursive:true});
await writeFile(new URL('site-config.js',output),clientConfigScript({bookingMode:'phone',analyticsEnabled:production}));
for(const file of htmlFiles) {
let html=await readFile(new URL(file,output),'utf8');
html=html.replace('<form id="booking-form">','<form id="booking-form" hidden>');
html=html.replace('В локальной демонстрационной версии заявка сохраняется на компьютере владельца проекта и не передаётся клинике. Для действительной записи используйте телефон +7 (8552) 52-90-90.','На этой странице онлайн-сбор заявок отключён. Запись осуществляется по телефону +7 (8552) 52-90-90.');
await writeFile(new URL(file,output),applySeo(html,file,config));
}
await writeFile(new URL('.nojekyll',output),'');
const {robots,sitemap}=crawlFiles(config);
await writeFile(new URL('robots.txt',output),robots);
await writeFile(new URL('sitemap.xml',output),sitemap);
console.log(`Static site built in site/. Booking by telephone; indexing ${config.indexable?'enabled':'disabled (preview)'}.`);
