import {pages} from '../content/services.mjs';
import {articles} from '../content/blog.mjs';
import {homeAnswers} from '../content/answers.mjs';
import {doctors} from '../content/doctors.mjs';
import {clinic,seoConfig} from '../content/site.mjs';
import {publicPageFiles,pagePath} from './public-pages.mjs';
import {escapeHtml as e} from './page-shell.mjs';
export const stripSeo = html => html.replace(/\s*<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/g,'');
const json = data => JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const text = html => html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();

export function applySeo(input,file,config = seoConfig()) {
  let html = stripSeo(input.replace(/\r\n/g,'\n'));
  const url = new URL(pagePath(file),config.url).href;
  const absolute = path => new URL(path,config.url).href;
  const service = pages.find(p=>file === `services/${p.slug}/index.html`);
  const article = articles.find(a=>file === `blog/${a.slug}/index.html`);
  const title = text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || 'Стоматология Премьер');
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1] || '';
  const orgId = absolute('#clinic'), siteId = absolute('#website'), editorId = absolute('#editorial');
  const pageId = `${url}#webpage`;
  const organization = {'@type':'Dentist','@id':orgId,name:clinic.name,legalName:clinic.legalName,url:config.url,telephone:clinic.phone,
    logo:{'@type':'ImageObject',url:absolute('assets/logo.svg')},
    image:absolute('assets/reception.webp'),
    address:{'@type':'PostalAddress',streetAddress:clinic.street,addressLocality:clinic.city,addressCountry:'RU'},
    areaServed:{'@type':'City',name:clinic.city},
    openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday'],opens:'08:00',closes:'20:00'},{'@type':'OpeningHoursSpecification',dayOfWeek:'Saturday',opens:'08:00',closes:'14:00'}]};
  const webPage = {'@type':service || article ? 'MedicalWebPage' : ['blog/index.html','services/index.html','doctors/index.html'].includes(file) ? 'CollectionPage' : 'WebPage','@id':pageId,url,name:title,description,inLanguage:'ru-RU',isPartOf:{'@id':siteId},publisher:{'@id':orgId},about:{'@id':orgId}};
  const graph = [organization,{'@type':'WebSite','@id':siteId,url:config.url,name:clinic.name,inLanguage:'ru-RU',publisher:{'@id':orgId}},webPage];
  if(file !== 'index.html') {
    const labels = [{'@type':'ListItem',position:1,name:'Главная',item:config.url}];
    if(service || file === 'services/index.html') labels.push({'@type':'ListItem',position:2,name:'Услуги',item:absolute('services/')});
    else if(article || file === 'blog/index.html') labels.push({'@type':'ListItem',position:2,name:'Блог',item:absolute('blog/')});
    else labels.push({'@type':'ListItem',position:2,name:file === 'doctors/index.html'?'Врачи':'Отзывы',item:url});
    if(service || article) labels.push({'@type':'ListItem',position:3,name:service?.label || article.heading,item:url});
    graph.push({'@type':'BreadcrumbList','@id':`${url}#breadcrumbs`,itemListElement:labels});
    webPage.breadcrumb={'@id':`${url}#breadcrumbs`};
  }
  if(service) {
    const id = `${url}#service`;
    graph.push({'@type':'Service','@id':id,name:service.label,description:service.intro,url,serviceType:service.heading,provider:{'@id':orgId},areaServed:{'@type':'City',name:clinic.city}});
    webPage.mainEntity={'@id':id};
  }
  const visibleDoctors = file === 'doctors/index.html' ? doctors : file === 'index.html' || service ? doctors.filter(d=>d.groups.includes(service?.slug==='ortoped'?'orthopedics':'implantology')) : [];
  if(visibleDoctors.length) {
    organization.employee=visibleDoctors.map(d=>({'@id':absolute(`doctors/#${d.slug}`)}));
    for(const d of visibleDoctors)graph.push({'@type':'Person','@id':absolute(`doctors/#${d.slug}`),name:d.name,url:absolute(`doctors/#${d.slug}`),image:absolute(d.image),jobTitle:d.specialties.join(', '),description:`${d.description} ${d.experience}.`,worksFor:{'@id':orgId}});
    if(file === 'doctors/index.html') {
      graph.push({'@type':'ItemList','@id':`${url}#list`,itemListElement:visibleDoctors.map((d,i)=>({'@type':'ListItem',position:i+1,item:{'@id':absolute(`doctors/#${d.slug}`)}}))});
      webPage.mainEntity={'@id':`${url}#list`};
    }
  }
  if(file === 'index.html' || service?.slug === 'ortoped') {
    const technician=clinic.laboratory.technician,id=absolute('#lab-technician');
    graph.push({'@type':'Person','@id':id,name:technician.name,jobTitle:technician.role,image:absolute(technician.image),worksFor:{'@id':orgId}});
    organization.employee=[...(organization.employee||[]),{'@id':id}];
  }
  if(article) {
    graph.push({'@type':'Organization','@id':editorId,name:clinic.editor,parentOrganization:{'@id':orgId}});
    graph.push({'@type':'BlogPosting','@id':`${url}#article`,url,headline:article.heading,description:article.description,inLanguage:'ru-RU',datePublished:`${article.datePublished}T12:00:00+03:00`,dateModified:`${article.datePublished}T12:00:00+03:00`,author:{'@id':editorId},publisher:{'@id':orgId},mainEntityOfPage:{'@id':pageId},image:absolute('assets/reception.webp'),articleSection:article.category,citation:article.sources.map(s=>s.url),about:{'@type':'Thing',name:'Имплантация зубов'}});
    webPage.mainEntity={'@id':`${url}#article`};
  }
  const faqs = article?.faqs || service?.faqs || (file === 'index.html' ? homeAnswers : []);
  if(faqs.length) {
    const id = `${url}#${service || article ? 'questions' : 'faq'}`;
    graph.push({'@type':'FAQPage','@id':id,isPartOf:{'@id':pageId},mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))});
    webPage.hasPart={'@id':id};
  }
  if(file === 'blog/index.html' || file === 'services/index.html') {
    const items = file === 'blog/index.html' ? articles.map(a=>({name:a.heading,path:`blog/${a.slug}/`})) : pages.map(p=>({name:p.label,path:`services/${p.slug}/`}));
    graph.push({'@type':'ItemList','@id':`${url}#list`,itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,url:absolute(item.path)}))});
    webPage.mainEntity={'@id':`${url}#list`};
  }
  const robots = config.indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow';
  html=html.replace(/<meta name="robots" content="[^"]*">/,`<meta name="robots" content="${robots}">`);
  const metadata = `\n<!-- SEO:START -->\n<link rel="canonical" href="${e(url)}">\n<meta property="og:locale" content="ru_RU">\n<meta property="og:type" content="${article?'article':'website'}">\n<meta property="og:site_name" content="${e(clinic.name)}">\n<meta property="og:title" content="${e(title)}">\n<meta property="og:description" content="${e(description)}">\n<meta property="og:url" content="${e(url)}">\n<meta property="og:image" content="${e(absolute('assets/reception.webp'))}">\n<meta property="og:image:alt" content="Ресепшен стоматологии Премьер">\n<meta name="twitter:card" content="summary_large_image">\n<script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script>\n<!-- SEO:END -->\n`;
  return html.replace('</head>',metadata+'</head>');
}

export function crawlFiles(config = seoConfig()) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPageFiles.map(file=>`  <url><loc>${e(new URL(pagePath(file),config.url).href)}</loc></url>`).join('\n')}\n</urlset>\n`;
  const base = new URL(config.url).pathname;
  const robots = config.indexable ? `User-agent: *\nAllow: ${base}\nDisallow: ${base}admin/\nDisallow: ${base}api/\nDisallow: ${base}data/\nDisallow: ${base}research/\nSitemap: ${new URL('sitemap.xml',config.url).href}\n` : 'User-agent: *\nDisallow: /\n';
  return {sitemap,robots};
}
