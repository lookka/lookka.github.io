'use strict';
document.querySelectorAll('#year').forEach(el=>el.textContent=new Date().getFullYear());
const tabs=[...document.querySelectorAll('[role="tab"]')];
function selectTab(tab){for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectTab(tabs[next]);tabs[next].focus();}});});
document.querySelectorAll('.copy-code').forEach(button=>button.addEventListener('click',async()=>{const code=button.closest('.example-panel').querySelector('code');try{await navigator.clipboard.writeText(code.textContent);button.textContent='Copied';}catch{const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(code);selection.removeAllRanges();selection.addRange(range);button.textContent='Select & copy';}setTimeout(()=>button.textContent='Copy source',2000);}));
const input=document.querySelector('.docs-search');
if(input){
 const sections=[...document.querySelectorAll('.manual-section')],status=document.querySelector('.search-status'),category=document.querySelector('.reference-category');
 const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function filter(){
  const query=normalize(input.value.trim()),terms=query.split(/\s+/).filter(Boolean),group=category?.value||'';
  const exact=sections.filter(section=>section.dataset.command&&(normalize(section.dataset.command)===query||normalize(section.dataset.command.split('.').pop())===query));
  let visible=0;
  for(const section of sections){const match=exact.length?exact.includes(section):terms.every(term=>normalize(section.textContent).includes(term));section.hidden=!match||(group&&section.dataset.category!==group);if(!section.hidden)visible++;}
  const active=terms.length>0||Boolean(group),unit=category?(visible===1?'scheda trovata':'schede trovate'):(visible===1?'sezione trovata':'sezioni trovate');status.textContent=active?`${visible} ${unit}. Cancella i filtri per leggere tutto.`:'';
  document.querySelector('.docs-toc').hidden=active;document.querySelector('.docs-layout').classList.toggle('is-filtered',active);
 }
 input.addEventListener('input',filter);category?.addEventListener('change',filter);
 document.addEventListener('click',event=>{const anchor=event.target.closest('a[href^="#"]');if(!anchor)return;const target=document.getElementById(anchor.getAttribute('href').slice(1)),section=target?.closest('.manual-section');if(section?.hidden){input.value=section.dataset.command||'';if(category)category.value='';filter();}});
}
