import {writeFile} from 'node:fs/promises';
import {clientConfigScript} from './client-config.mjs';
await writeFile(new URL('../site-config.js',import.meta.url),clientConfigScript());
await import('./generate-home.mjs');
await import('./generate-services.mjs');
await import('./generate-blog.mjs');
await import('./generate-doctors.mjs');
await import('./generate-seo.mjs');
