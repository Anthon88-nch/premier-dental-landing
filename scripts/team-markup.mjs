import {doctors} from '../content/doctors.mjs';
import {laboratoryPhotos,laboratoryVideo} from '../content/laboratory.mjs';
import {clinic} from '../content/site.mjs';
import {escapeHtml as e} from './page-shell.mjs';
import {consultationButton,conversionCta} from './conversion-markup.mjs';
const arrow = '<svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
export const doctorsInGroup = group => doctors.filter(d=>d.groups.includes(group));
const role = d => d.specialties.join(' · ');
export function doctorCards(items,prefix='',{profiles=false}={}) {
  return `<div class="doctor-grid">${items.map(d=>{
    const image=`<img src="${prefix}${d.image}" srcset="${prefix}${d.image.replace('.webp','-400.webp')} 400w, ${prefix}${d.image} 800w" sizes="(min-width:1100px) 440px, (min-width:700px) 45vw, calc(100vw - 48px)" width="${d.imageWidth}" height="${d.imageHeight}" alt="${e(d.name)}" loading="lazy" decoding="async">`;
    const [surname,...rest]=d.name.split(' ');
    const name=`${e(surname)} <span>${e(rest.join(' '))}</span>`;
    return `<article class="doctor-card"${profiles?` id="${d.slug}"`:''}><div class="doctor-card-photo">${profiles?image:`<a href="${prefix}doctors/#${d.slug}" aria-label="О враче: ${e(d.name)}">${image}</a>`}</div><div class="doctor-card-copy"><p class="doctor-experience">${e(d.experience)}</p><h3>${profiles?name:`<a href="${prefix}doctors/#${d.slug}">${name}</a>`}</h3><p class="doctor-specialties">${e(role(d))}</p>${profiles?'':`<a class="doctor-profile-link" href="${prefix}doctors/#${d.slug}">О враче ${arrow}</a>`}${consultationButton('Консультация: '+d.name)}</div></article>`;
  }).join('')}</div>`;
}
export function teamSection(group,prefix='',{home=false}={}) {
  const orthopedics=group==='orthopedics';
  return `<section class="${home?'section':'service-section'} wrap team-section" id="${home?'doctor':'team-'+group}"><div class="section-heading"><p class="eyebrow">ВРАЧИ PREMIER</p><h2>${orthopedics?'Стоматологи-<em>ортопеды.</em>':'Хирурги-<em>имплантологи.</em>'}</h2><p class="section-intro">${orthopedics?'Восстанавливают зубы коронками и протезами. Подбирают материал, форму и способ фиксации конструкции.':'Проводят удаление зубов, установку имплантатов и контрольные осмотры после операции.'}</p></div>${doctorCards(doctorsInGroup(group),prefix)}${conversionCta(prefix,{context:orthopedics?'Консультация ортопеда':'Консультация по имплантации',implantology:!orthopedics})}<a class="text-link team-all-link" href="${prefix}doctors/${orthopedics?'#orthopedists':''}">Все врачи клиники ${arrow}</a></section>`;
}
export function laboratorySection(prefix='',{compact=false}={}) {
  const photos=compact?laboratoryPhotos.filter((p,i)=>i===0||i===2):laboratoryPhotos;
  const technician=clinic.laboratory.technician;
  const video=`<figure class="laboratory-video"><video controls playsinline preload="none" poster="${prefix}${laboratoryVideo.poster}" width="${laboratoryVideo.width}" height="${laboratoryVideo.height}" aria-label="${e(laboratoryVideo.title)}"><source src="${prefix}${laboratoryVideo.image}" type="video/mp4"><p>Ваш браузер не поддерживает видео. <a href="${prefix}${laboratoryVideo.image}">Открыть видео лаборатории</a>.</p></video><figcaption>${e(laboratoryVideo.title)}. Новиков Павел Сергеевич — зубной техник.</figcaption></figure>`;
  return `<section class="${compact?'service-section':'section'} wrap laboratory-section" id="laboratory"><div class="section-heading"><p class="eyebrow">ЗУБОТЕХНИЧЕСКАЯ ЛАБОРАТОРИЯ</p><h2>Собственная<br><em>зуботехническая лаборатория.</em></h2><p class="section-intro">${e(clinic.laboratory.description)}</p></div><div class="laboratory-technician"><img src="${prefix}${technician.image}" width="${technician.width}" height="${technician.height}" alt="${e(technician.name)}, зубной техник" loading="lazy" decoding="async"><div><p class="eyebrow">${e(technician.role)}</p><h3>${e(technician.name)}</h3></div></div><div class="laboratory-grid${compact?' laboratory-grid-compact':''}">${photos.map(p=>`<figure><img src="${prefix}${p.image}" srcset="${prefix}${p.image.replace('.webp','-600.webp')} 600w, ${prefix}${p.image} 1200w" sizes="(min-width:1000px) 620px, calc(100vw - 48px)" width="${p.width}" height="${p.height}" alt="${e(p.caption)}" loading="lazy" decoding="async"><figcaption>${e(p.caption)}</figcaption></figure>`).join('')}</div>${video}${conversionCta(prefix,{context:'Консультация ортопеда',implantology:false})}${compact?`<a class="text-link" href="${prefix}index.html#laboratory">Посмотреть лабораторию ${arrow}</a>`:`<a class="text-link" href="${prefix}services/ortoped/">Протезирование: методы и цены ${arrow}</a>`}</section>`;
}
