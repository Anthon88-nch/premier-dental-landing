import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {contactChannels} from '../content/contact-channels.mjs';
import {clientConfigScript} from '../scripts/client-config.mjs';

const appSource = await readFile(new URL('../app.js',import.meta.url),'utf8');
const analyticsSource = await readFile(new URL('../analytics.js',import.meta.url),'utf8');
class Element {
  constructor() { this.listeners = new Map(); this.attributes = new Map(); this.value = ''; this.hidden = false; this.open = false; this.textContent = ''; this.selectionStart = 0; this.selectionEnd = 0; }
  addEventListener(name,callback) { const list = this.listeners.get(name) || []; list.push(callback); this.listeners.set(name,list); }
  async emit(name,properties={}) {
    const event = {target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...properties};
    for(const callback of this.listeners.get(name) || []) await callback(event);
    return event;
  }
  setAttribute(name,value) { this.attributes.set(name,String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  setSelectionRange(start,end) { this.selectionStart=start; this.selectionEnd=end; }
  setCustomValidity(message) { this.validationMessage=message; }
  focus() { this.focused=true; }
  after(element) { this.afterElement=element; }
  showModal() { this.open=true; }
  close() { this.open=false; return this.emit('close'); }
  getBoundingClientRect() { return {left:0,right:100,top:0,bottom:100}; }
  closest(selector) { return selector === 'a[href]' && this.hasAttribute('href') ? this : null; }
}
function setup({enabled=false,bookingMode='local',url='https://implant.example/',fetchImpl,messengers=contactChannels}={}) {
  const elements = new Map();
  for(const selector of ['.menu-toggle','#mobile-menu','#booking','#privacy','#booking-form','#phone','#form-error','.dialog-desc','#booking-content','#booking-result','#booking-result h2','#result-message']) elements.set(selector,new Element());
  const phone=elements.get('#phone'),form=elements.get('#booking-form');
  const submit=new Element(),closeBooking=new Element(),closePrivacy=new Element();
  elements.get('#booking').querySelector=()=>closeBooking;
  elements.get('#privacy').querySelector=()=>closePrivacy;
  form.querySelector=()=>submit;
  form.elements={name:new Element(),consent:{checked:true},website:new Element()};
  form.reportValidity=()=>Boolean(!phone.validationMessage && phone.value && form.elements.consent.checked);
  form.reset=()=>{phone.value='';phone.setSelectionRange(0,0);form.elements.name.value='';};
  const document=new Element();
  document.querySelector=selector=>elements.get(selector) || null;
  const bookButton=new Element();
  const messengerLinks=['whatsapp','telegram','max'].map(channel=>{
    const link=new Element();link.setAttribute('data-messenger',channel);link.hidden=true;return link;
  });
  document.querySelectorAll=selector=>selector==='[data-book]' ? [bookButton] : selector==='[data-messenger]' ? messengerLinks : [];
  document.createElement=()=>new Element();
  const inserted=[];
  document.head={append:element=>inserted.push(element)};
  document.body={classList:{add(){},remove(){}}};
  const calls=[],requests=[];
  const window={location:new URL(url),PREMIER_CONFIG:{bookingMode,analytics:{enabled,metrikaId:95513342},messengers}};
  const context=vm.createContext({window,document,console,URL,crypto:{randomUUID},AbortSignal,fetch:async(input,options)=>{
    requests.push({input,...options});
    return fetchImpl ? fetchImpl(input,options) : {ok:true,json:async()=>({preview:true})};
  }});
  vm.runInContext(analyticsSource,context,{filename:'analytics.js'});
  const initialization=(window.ym?.a || []).map(args=>Array.from(args));
  // Use the same queue API as the asynchronously loaded tag without making requests.
  window.ym=(...args)=>calls.push(args);
  vm.runInContext(appSource,context,{filename:'app.js'});
  return {context,window,document,elements,phone,form,submit,bookButton,messengerLinks,calls,requests,inserted,initialization};
}
async function input(harness,value,position=value.length) {
  harness.phone.value=value;
  harness.phone.setSelectionRange(position,position);
  await harness.phone.emit('input');
}
async function paste(harness,value) {
  return harness.phone.emit('paste',{clipboardData:{getData:()=>value}});
}
async function type(harness,text) {
  for(const char of text) {
    const {phone}=harness,start=phone.selectionStart,end=phone.selectionEnd;
    await input(harness,phone.value.slice(0,start)+char+phone.value.slice(end),start+char.length);
  }
}
async function remove(harness,direction) {
  const {phone}=harness;
  const event=await phone.emit('beforeinput',{inputType:direction==='backward'?'deleteContentBackward':'deleteContentForward'});
  if(event.defaultPrevented) return;
  const start=phone.selectionStart,end=phone.selectionEnd;
  const from=start!==end?start:Math.max(0,start-(direction==='backward'?1:0));
  const to=start!==end?end:Math.min(phone.value.length,end+(direction==='forward'?1:0));
  await input(harness,phone.value.slice(0,from)+phone.value.slice(to),from);
}
const goalNames=h=>h.calls.filter(call=>call[1]==='reachGoal').map(call=>call[2]);

test('unconfigured Telegram and MAX remain hidden without placeholder destinations',()=>{
  const h=setup();
  for(const channel of ['telegram','max']) {
    const link=h.messengerLinks.find(link=>link.getAttribute('data-messenger')===channel);
    assert.equal(link.hidden,true,channel);assert.equal(link.hasAttribute('href'),false,channel);
  }
  const whatsapp=h.messengerLinks[0];assert.equal(whatsapp.hidden,false);assert.equal(whatsapp.getAttribute('href'),contactChannels.whatsapp);
  assert.deepEqual(goalNames(h),[]);
});

test('confirmed Telegram and MAX links become available and emit one existing goal per click',async()=>{
  const messengers={...contactChannels,telegram:'https://t.me/clinic_example',max:'https://max.ru/clinic_example'};
  const h=setup({enabled:true,messengers});
  for(const channel of ['telegram','max']) {
    const link=h.messengerLinks.find(link=>link.getAttribute('data-messenger')===channel);
    assert.equal(link.hidden,false,channel);assert.equal(link.getAttribute('href'),messengers[channel]);
    await h.document.emit('click',{target:link});
  }
  assert.deepEqual(goalNames(h),['messenger_click','messenger_click']);
  for(const call of h.calls.filter(call=>call[1]==='reachGoal'))assert.equal(call.length,3,'no contact data in goal parameters');
});

test('invalid or unrelated messenger destinations never become clickable',()=>{
  for(const url of ['javascript:alert(1)','http://t.me/clinic','https://t.me.evil.example/clinic','https://user:secret@t.me/clinic','https://t.me/','https://t.me:8443/clinic']) {
    const h=setup({messengers:{telegram:url,max:'https://unrelated.example/chat'}});
    for(const link of h.messengerLinks) { assert.equal(link.hidden,true);assert.equal(link.hasAttribute('href'),false); }
  }
});

test('local and production config generation retain the same future messenger URLs',()=>{
  const messengers={...contactChannels,telegram:'https://t.me/clinic_example',max:'https://max.ru/clinic_example'};
  for(const analyticsEnabled of [false,true]) {
    const sandbox={window:{}};
    vm.runInNewContext(clientConfigScript({bookingMode:'phone',analyticsEnabled,messengers}),sandbox);
    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.PREMIER_CONFIG.messengers)),messengers);
    assert.equal(sandbox.window.PREMIER_CONFIG.analytics.enabled,analyticsEnabled);
    assert.equal(sandbox.window.PREMIER_CONFIG.bookingMode,'phone');
  }
});

test('phone typing, full-number paste and autofill preserve Russian numbers and the caret',async()=>{
  const h=setup();
  await h.phone.emit('focus');
  await type(h,'9274513261');
  assert.equal(h.phone.value,'+7 (927) 451-32-61');
  assert.equal(h.phone.selectionStart,h.phone.value.length);
  assert.equal(h.phone.validationMessage,'');
  for(const number of ['8 (927) 451-32-61','79274513261','9274513261','+7 (927) 451-32-61','8274513261']) {
    h.phone.setSelectionRange(0,h.phone.value.length);
    const event=await paste(h,number);
    assert.equal(event.defaultPrevented,true);
    assert.equal(h.phone.validationMessage,'');
    const expected=number==='8274513261'?'+7 (827) 451-32-61':'+7 (927) 451-32-61';
    assert.equal(h.phone.value,expected,number);
  }
  await input(h,'89274513261');
  assert.equal(h.phone.value,'+7 (927) 451-32-61');
});

test('mask allows editing digits, deleting across punctuation and replacing a selection',async()=>{
  const h=setup();
  await input(h,'+7 (927) 451-32-61');
  h.phone.setSelectionRange(9,9); // after the space that follows the area code
  await remove(h,'backward');
  assert.equal(h.phone.value,'+7 (924) 513-26-1');
  await input(h,'+7 (927) 451-32-61');
  h.phone.setSelectionRange(7,7); // Delete immediately before ") "
  await remove(h,'forward');
  assert.equal(h.phone.value,'+7 (927) 513-26-1');
  await input(h,'+7 (927) 451-32-61');
  h.phone.setSelectionRange(4,7);
  await type(h,'999');
  assert.equal(h.phone.value,'+7 (999) 451-32-61');
  h.phone.setSelectionRange(0,h.phone.value.length);
  await remove(h,'backward');
  assert.equal(h.phone.value,'');
  assert.equal(h.phone.validationMessage,'');
  await input(h,'+7 (927) 451-32-61x');
  await remove(h,'backward');
  assert.equal(h.phone.value,'+7 (927) 451-32-61');
  assert.equal(h.phone.validationMessage,'');
  h.phone.setSelectionRange(1,1);
  await remove(h,'forward');
  assert.equal(h.phone.value,'+7 (274) 513-26-1');
});

test('letters, another country, incomplete and multiple phone numbers cannot be submitted',async()=>{
  for(const invalid of ['+7 (927) 451-32-61abc','+7 (927) 451-32-61 доб. 12','792745132617','9274513261 9274513261','+8 (927) 451-32-61','+44 20 1234 5678','+7 (927) 45','+7 927 +4513261']) {
    const h=setup();
    await paste(h,invalid);
    await h.form.emit('submit');
    assert.equal(h.requests.length,0,invalid);
    assert.ok(h.elements.get('#form-error').textContent,invalid);
  }
});

test('analytics requires explicit production configuration and never runs on local or login pages',async()=>{
  for(const config of [{},{enabled:true,url:'http://127.0.0.1:4173/'},{enabled:true,url:'https://localhost/'},{enabled:true,url:'https://preview.localhost/'},{enabled:true,url:'https://implant.example/admin/'},{enabled:true,url:'https://implant.example/admin/login.html'},{enabled:true,url:'https://implant.example/login/'}]) {
    const h=setup(config);
    assert.equal(h.inserted.length,0,JSON.stringify(config));
    assert.equal(h.window.PREMIER_ANALYTICS.goal('lead_submit'),false);
    const link=new Element();link.setAttribute('href','tel:+78552529090');
    await h.document.emit('click',{target:link});
    assert.deepEqual(goalNames(h),[]);
  }
  const h=setup({enabled:true});
  assert.equal(h.inserted.length,1);
  assert.equal(h.inserted[0].src,'https://mc.yandex.ru/metrika/tag.js');
  assert.equal(h.inserted[0].async,true);
  assert.equal(h.initialization.length,1);
  assert.equal(h.initialization[0][0],95513342);
  assert.equal(h.initialization[0][1],'init');
  assert.equal(h.initialization[0][2].webvisor,false);
  assert.equal(h.initialization[0][2].clickmap,false);
  assert.equal(h.initialization[0][2].trackLinks,false);
});

test('only telephone links and explicitly marked messenger links emit click goals, without contact data',async()=>{
  const h=setup({enabled:true});
  for(const [href,messenger] of [['tel:+78552529090',false],['https://wa.me/79274513261',true],['https://t.me/example',false],['https://implant.example/services/',false],['javascript:void(0)',true]]) {
    const link=new Element();link.setAttribute('href',href);if(messenger)link.setAttribute('data-messenger','whatsapp');
    await h.document.emit('click',{target:{closest:()=>link}});
  }
  await h.bookButton.emit('click');
  assert.deepEqual(goalNames(h),['phone_click','messenger_click']);
  assert.ok(h.calls.every(call=>call.length===3 && call[0]===95513342));
  assert.equal(h.window.PREMIER_ANALYTICS.goal('doctor_name'),false);
});

test('preview saves, phone-only mode and failed or malformed responses never emit lead_submit',async()=>{
  for(const response of [{ok:true,json:async()=>({preview:true})},{ok:false,json:async()=>({message:'Повторите отправку'})},{ok:true,json:async()=>({})}]) {
    const h=setup({enabled:true,fetchImpl:async()=>response});
    await input(h,'89274513261');
    await h.form.emit('submit');
    assert.deepEqual(goalNames(h),[]);
    if(response.ok && (await response.json()).preview===true) {
      assert.equal(h.elements.get('#booking-result h2').textContent,'Заявка сохранена');
      assert.match(h.elements.get('#result-message').textContent,/не передана в клинику/);
    } else assert.ok(h.elements.get('#form-error').textContent);
  }
  const phone=setup({enabled:true,bookingMode:'phone'});
  await input(phone,'89274513261');await phone.form.emit('submit');
  assert.equal(phone.form.hidden,true);
  assert.equal(phone.requests.length,0);
  assert.deepEqual(goalNames(phone),[]);
});

test('in-flight duplicate submit is ignored and retries retain the idempotency key; only delivery emits one goal',async()=>{
  let release;
  const h=setup({enabled:true,fetchImpl:()=>new Promise(resolve=>{release=resolve;})});
  await input(h,'89274513261');
  const first=h.form.emit('submit');
  await h.form.emit('submit');
  assert.equal(h.requests.length,1);
  release({ok:false,json:async()=>({message:'Не удалось подтвердить передачу заявки.'})});
  await first;
  assert.equal(h.submit.disabled,false);
  const failedId=JSON.parse(h.requests[0].body).requestId;
  const retry=h.form.emit('submit');
  assert.equal(JSON.parse(h.requests[1].body).requestId,failedId);
  release({ok:true,json:async()=>({preview:false})});
  await retry;
  assert.deepEqual(goalNames(h),['lead_submit']);
  assert.equal(h.elements.get('#booking-result h2').textContent,'Заявка получена');
  assert.match(h.elements.get('#result-message').textContent,/Запись будет подтверждена после разговора/);
  assert.equal(h.phone.value,'');
  assert.equal(h.submit.disabled,false);
  assert.ok(h.calls.every(call=>call.length===3));
});

test('network interruption retains the request for manual retry without a false conversion',async()=>{
  let attempt=0;
  const h=setup({enabled:true,fetchImpl:async()=>{
    if(attempt++ === 0) throw new TypeError('Network unavailable');
    return {ok:true,json:async()=>({preview:false})};
  }});
  await input(h,'89274513261');
  await h.form.emit('submit');
  assert.equal(h.phone.value,'+7 (927) 451-32-61');
  assert.equal(h.submit.disabled,false);
  assert.deepEqual(goalNames(h),[]);
  assert.ok(h.elements.get('#form-error').textContent);
  await h.form.emit('submit');
  assert.equal(JSON.parse(h.requests[0].body).requestId,JSON.parse(h.requests[1].body).requestId);
  assert.deepEqual(goalNames(h),['lead_submit']);
});
