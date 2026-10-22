import {readFile,writeFile} from 'node:fs/promises';
import {publicPageFiles} from './public-pages.mjs';
import {applySeo,crawlFiles} from './seo.mjs';
const root = new URL('../',import.meta.url);
// Local source pages stay in preview mode; production settings apply only to site/.
for(const file of publicPageFiles) {
  const url = new URL(file,root);
  await writeFile(url,applySeo(await readFile(url,'utf8'),file));
}
const {sitemap,robots}=crawlFiles();
await writeFile(new URL('sitemap.xml',root),sitemap);
await writeFile(new URL('robots.txt',root),robots);
console.log(`SEO metadata generated for ${publicPageFiles.length} pages (preview mode).`);
