import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {mainSections} from '../scripts/homepage-ux.mjs';

const root=new URL('../',import.meta.url);
const baseline=JSON.parse(await readFile(new URL('fixtures/home-ux-baseline.json',import.meta.url),'utf8'));
const home=await readFile(new URL('index.html',root),'utf8');
const sections=mainSections(home).sections;
const id=section=>section.match(/^<section[^>]*\bid="([^"]+)"/)?.[1] || 'hero';

test('homepage UX leaves unrelated inner pages and supplied image descriptions unchanged',async()=>{
  assert.equal(Object.keys(baseline.innerPages).length,15);
  for(const [file,expected] of Object.entries(baseline.innerPages)) {
    const bytes=await readFile(new URL(file,root));
    // Checkout line endings vary on Windows; HTML content must stay identical.
    const normalized=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
    assert.equal(createHash('sha256').update(normalized).digest('hex'),expected,file);
  }
  const images=[...home.matchAll(/<img\b[^>]*>/g)].map(([tag])=>({src:tag.match(/\bsrc="([^"]+)"/)?.[1],alt:tag.match(/\balt="([^"]*)"/)?.[1]}));
  const sort=items=>items.map(item=>JSON.stringify(item)).sort();
  assert.deepEqual(sort(images),sort(baseline.images));
});

test('homepage section order, preserved anchors and contextual booking actions remain valid',()=>{
  assert.deepEqual(sections.map(id),['hero','solutions','cost','reviews','doctor','steps','clinic','faq','contacts']);
  for(const section of sections) {
    const labelled=section.match(/^<section[^>]*aria-labelledby="([^"]+)"/)?.[1];
    assert.ok(labelled,id(section));assert.ok(section.includes(`id="${labelled}"`));
  }
  for(const anchor of ['systems','aftercare','laboratory'])assert.equal((home.match(new RegExp(`id="${anchor}"`,'g'))||[]).length,1);
  assert.doesNotMatch(home,/<section[^>]*id="(?:aftercare|systems|laboratory|blog)"/);
  assert.doesNotMatch(home,/<div class="conversion-cta">/);
  for(const [name,context,label] of [['cost','Обсудить план лечения','Рассчитать стоимость для вашего случая'],['steps','Этапы лечения','Начать с консультации'],['faq','Вопрос по лечению','Записаться на консультацию']]) {
    const section=sections.find(value=>id(value)===name);
    assert.equal((section.match(/data-book=/g)||[]).length,1);
    assert.match(section,new RegExp(`data-book="${context}"[^>]*>${label}`));
  }
  const fourth=sections.find(value=>id(value)==='steps').match(/<article\b[^>]*>[\s\S]*?<\/article>/g)[3];
  assert.match(fourth,/id="aftercare"/);assert.match(fourth,/Гарантия 1 год: условия/);
  assert.equal((home.match(/Профессиональная гигиена оплачивается отдельно\./g)||[]).length,1);
});

test('homepage carousels are labelled regions and unknown clinic information stays explicit',()=>{
  for(const [track,count] of [['home-doctor-carousel',3],['home-laboratory-carousel',4]]) {
    assert.match(home,new RegExp(`id="${track}" data-ux-carousel role="region" aria-label="[^"]+" tabindex="0"`));
    assert.match(home,new RegExp(`data-carousel-status="${track}"[^>]*>1 / ${count}<`));
  }
  assert.equal((home.match(/\{\{TODO: срок\}\}/g)||[]).length,4);
  assert.match(home,/\{\{TODO: дата лицензии\}\}/);
  assert.match(home,/ООО «ДЕНТА-РИА»/);
  assert.match(home,/<script src="home-ux\.js" defer>/);
});

test('imported screenshot reviews stay removed from both pages while MyReviews remains',async()=>{
  for(const html of [home,await readFile(new URL('reviews/index.html',root),'utf8')]) {
    assert.match(html,/id="myReviews__block-widget"/);
    assert.doesNotMatch(html,/class="review-(?:card|full|original)\b/);
    assert.doesNotMatch(html,/review-(?:implantation|treatment-plan|crowns)\.webp/);
    assert.doesNotMatch(html,/\{\{TODO: (?:Имя Ф\.|рейтинг и число отзывов)\}\}/);
    assert.doesNotMatch(html,/Ниже доступны отзывы пациентов/);
    assert.match(html,/<a href="https:\/\/prodoctorov\.ru\/naberezhnye-chelny\/lpu\/28283-stomatologiya-na-pushkinskoy-denta-ria\/"[^>]*>Посмотреть на ПроДокторов<\/a>/);
  }
  assert.doesNotMatch(home,/home-review-carousel/);
  assert.doesNotMatch(home,/\{\{TODO: 5,0/);
  assert.match(home,/<a class="ux-hero-rating" href="https:\/\/prodoctorov\.ru\/naberezhnye-chelny\/lpu\/28283-stomatologiya-na-pushkinskoy-denta-ria\/"[^>]*>[\s\S]*?<span>5,0 · ПроДокторов · 344 отзыва<\/span><\/a>/);
});
