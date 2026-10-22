import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findPlaceholders,assertNoPlaceholders} from '../scripts/release-guard.mjs';

test('release guard finds editorial placeholders but ignores ordinary text and HTML comments',()=>{
  assert.deepEqual(findPlaceholders('<p>{{TODO: срок}}</p><p>{{ TODO: цена от }}</p>'),['{{TODO: срок}}','{{ TODO: цена от }}']);
  assert.deepEqual(findPlaceholders('<p>Цена от 55 500 ₽</p><!-- TODO: виджет Яндекс.Карт -->'),[]);
});

test('release guard stops a production build and lists every unfilled placeholder by page',()=>{
  assert.doesNotThrow(()=>assertNoPlaceholders([{file:'index.html',html:'<p>Готово</p>'}]));
  assert.throws(
    ()=>assertNoPlaceholders([{file:'index.html',html:'<p>{{TODO: срок}}</p>'},{file:'services/ortoped/index.html',html:'{{TODO: цена от}}'}]),
    error=>error.message.includes('демонстрационные данные — 2') && error.message.includes('index.html: {{TODO: срок}}') && error.message.includes('services/ortoped/index.html: {{TODO: цена от}}')
  );
});

test('production build script runs the placeholder guard before writing pages',async()=>{
  const script=await readFile(new URL('../scripts/build-pages.mjs',import.meta.url),'utf8');
  const guard=script.indexOf('assertNoPlaceholders(');
  assert.ok(guard>0,'guard is called');
  assert.ok(script.slice(guard-40,guard).includes('if(production)'),'guard applies to production builds only');
  assert.ok(guard<script.indexOf('await prunePages(output)'),'guard runs before the site/ folder is touched');
});

test('release guard also stops on demo figures and on missing Telegram or MAX links',()=>{
  assert.deepEqual(findPlaceholders('<p class="ux-installment"><span data-draft>Рассрочка — от 4 625 ₽/мес</span></p>'),['черновое значение «Рассрочка — от 4 625 ₽/мес»']);
  assert.throws(
    ()=>assertNoPlaceholders([{file:'index.html',html:'<p>Готово</p>'}],{channels:{whatsapp:'https://wa.me/1',telegram:'',max:' '}}),
    error=>error.message.includes('нет ссылки Telegram') && error.message.includes('нет ссылки MAX')
  );
  assert.doesNotThrow(()=>assertNoPlaceholders([{file:'index.html',html:'<p>Готово</p>'}],{channels:{telegram:'https://t.me/a',max:'https://max.ru/a'}}));
});

test('every public page has the same footer navigation to the main sections',async()=>{
  const {publicPageFiles}=await import('../scripts/public-pages.mjs');
  for(const file of publicPageFiles) {
    const html=await readFile(new URL(`../${file}`,import.meta.url),'utf8');
    const nav=html.match(/<nav class="footer-nav" aria-label="Разделы сайта">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav,file);
    assert.deepEqual([...nav.matchAll(/>([^<]+)<\/a>/g)].map(m=>m[1]),['Услуги','Врачи','Стоимость','Отзывы','Блог','Контакты'],file);
  }
});
