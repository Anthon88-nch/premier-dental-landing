const $=selector=>document.querySelector(selector);
const labels={new:'Новая',in_progress:'В работе',waiting:'Ожидаем ответ',booked:'Записан',completed:'Завершена',cancelled:'Отказ'};
let csrf='',leads=[],selected;
const formatDate=value=>new Date(value).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'short',timeStyle:'short'});
const day=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date(value));
const node=(tag,text,className)=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
async function api(route,method='GET',body){
 const response=await fetch('/api/admin/'+route,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 const result=await response.json();
 if(!response.ok){if(response.status===401){$('#dashboard').hidden=true;$('#login').hidden=false;$('#logout').hidden=true;$('#card').close();leads=[];$('#list').replaceChildren();}throw new Error(result.message||'Ошибка запроса.');}return result;
}
function showError(error){$('#message').textContent=error.name==='TimeoutError'?'Сервер не ответил. Повторите попытку.':error.message;}
async function load(){const result=await api('leads');leads=result.leads;$('#message').textContent='';$('#login').hidden=true;$('#dashboard').hidden=false;$('#logout').hidden=false;render();}
function render(){
 const stats=[['Новые',leads.filter(l=>(l.workflow||'new')==='new').length],['Сегодня',leads.filter(l=>day(l.createdAt)===day(Date.now())).length],['Записаны',leads.filter(l=>l.workflow==='booked').length],['Всего заявок',leads.length]];
 $('#stats').replaceChildren(...stats.map(([label,value])=>{const el=node('div','','stat');el.append(node('strong',String(value)),node('span',label));return el;}));
 const search=$('#search').value.trim().toLocaleLowerCase('ru'),digits=search.replace(/\D/g,'');
 const filtered=leads.filter(l=>(!$('#status').value||l.workflow===$('#status').value)&&(!$('#from').value||day(l.createdAt)>=$('#from').value)&&(!$('#to').value||day(l.createdAt)<=$('#to').value)&&(!search||`${l.name} ${l.phone} ${l.id}`.toLowerCase().includes(search)||(digits.length>=3&&l.phone.includes(digits))));
 $('#count').textContent=`Найдено: ${filtered.length}`;
 $('#list').replaceChildren(...filtered.map(l=>{const el=node('article','','lead'),who=node('div',''),date=node('div',''),badge=node('span',labels[l.workflow],'badge'),open=node('button','Открыть ↗');who.append(node('strong',l.name||'Имя не указано'),node('small',l.phone));date.append(node('small',formatDate(l.createdAt)+' МСК'));badge.dataset.status=l.workflow;open.addEventListener('click',()=>openLead(l));el.append(who,date,badge,open);return el;}));
 if(!filtered.length)$('#list').append(node('p',leads.length?'По этим условиям заявок нет.':'Заявок пока нет. Новые обращения появятся здесь.','empty'));
}
function openLead(lead){selected=lead;$('#reference').textContent='ЗАЯВКА / '+lead.id.slice(0,8).toUpperCase();$('#lead-name').textContent=lead.name||'Имя не указано';$('#lead-phone').textContent=lead.phone;$('#lead-phone').href='tel:'+lead.phone;$('#lead-date').textContent=formatDate(lead.createdAt)+' МСК';$('#edit-form').elements.workflow.value=lead.workflow;$('#edit-form').elements.note.value=lead.note||'';$('#save-error').textContent='';$('#history').replaceChildren(node('p','Согласие: '+formatDate(lead.createdAt)+' · '+lead.consentVersion),...(lead.history||[]).map(h=>node('p',`${formatDate(h.at)} · ${labels[h.from]} → ${labels[h.to]} · ${h.actor}`)));$('#card').showModal();}
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const result=await api('login','POST',{username:event.target.elements.username.value,password:event.target.elements.password.value});csrf=result.csrf;event.target.elements.password.value='';await load();}catch(e){showError(e);}finally{button.disabled=false;}});
$('#logout').addEventListener('click',async()=>{try{await api('logout','POST',{});location.reload();}catch(e){showError(e);}});
$('#refresh').addEventListener('click',()=>load().catch(showError));
for(const selector of ['#search','#status','#from','#to'])$(selector).addEventListener('input',render);
$('.close').addEventListener('click',()=>$('#card').close());
$('#edit-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await api('leads/'+selected.id,'PATCH',{workflow:event.target.elements.workflow.value,note:event.target.elements.note.value,version:selected.version});$('#card').close();await load();}catch(e){$('#save-error').textContent=e.message;}finally{button.disabled=false;}});
api('session').then(result=>{csrf=result.csrf;return load();}).catch(error=>{if(error.message!=='Войдите в панель.')showError(error);});
