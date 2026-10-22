import {pages} from '../content/services.mjs';
import {articles} from '../content/blog.mjs';
export const publicPageFiles = ['index.html','services/index.html','reviews/index.html','blog/index.html','doctors/index.html',...pages.map(p=>`services/${p.slug}/index.html`),...articles.map(a=>`blog/${a.slug}/index.html`)];
export const pagePath = file => file === 'index.html' ? '' : file.replace(/index\.html$/,'');
