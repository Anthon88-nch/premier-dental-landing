export const clinic = Object.freeze({
  name:'Стоматология Премьер', legalName:'ООО «ДЕНТА-РИА»',
  telephone:'+7 (8552) 52-90-90', phone:'+78552529090',
  city:'Набережные Челны', street:'ул. Пушкина, 4 (45/05)',
  editor:'Редакция сайта «Премьер»',
  laboratory:{heading:'Собственная зуботехническая лаборатория',description:'Коронки и протезы изготавливают в собственной лаборатории клиники. Для работы используют 3D-сканер, принтер и фрезерное оборудование.',technician:{name:'Новиков Павел Сергеевич',role:'Зубной техник',image:'assets/lab-novikov-pavel.webp',width:600,height:900}},
  primaryUrl:'https://имплантация-челны.рф/'
});

export function seoConfig(env = {}) {
  const indexable = env.SITE_INDEXABLE === 'true';
  if(indexable && !env.SITE_URL) throw new Error('An indexable build requires SITE_URL with the confirmed primary HTTPS URL.');
  const url = new URL(env.SITE_URL || clinic.primaryUrl);
  if(url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || ['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(url.hostname) || /\.[a-z0-9]+\/?$/i.test(url.pathname)) {
    throw new Error('SITE_URL must be a public HTTPS URL without credentials, query or fragment.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '') + '/';
  return {url:url.href, indexable};
}
