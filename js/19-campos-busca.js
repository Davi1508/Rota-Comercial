// ---------- campos de escolha com busca ----------
// Troca cada <select> por um campo onde se digita e as opções vão aparecendo
const valorSel=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
function combo(sel){
  if(sel.dataset.combo)return;sel.dataset.combo='1';
  const w=document.createElement('div');w.className='combo';sel.parentNode.insertBefore(w,sel);w.appendChild(sel);
  const inp=document.createElement('input');inp.type='text';inp.className='combo-in';inp.autocomplete='off';inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');
  inp.setAttribute('aria-label',sel.getAttribute('aria-label')||(sel.id&&document.querySelector(`label[for="${sel.id}"]`)||{}).textContent||'Escolher');
  if(sel.id){const lb=document.querySelector(`label[for="${sel.id}"]`);if(lb){inp.id=sel.id+'-busca';lb.htmlFor=inp.id}}
  const ul=document.createElement('div');ul.className='combo-list';ul.hidden=true;ul.setAttribute('role','listbox');
  w.append(inp,ul);
  let aberto=false,foco=-1;
  const rot=()=>{const o=sel.options[sel.selectedIndex];return o?o.textContent:''};
  const sync=()=>{if(!aberto){inp.value=rot();inp.placeholder=sel.options.length?'Digite para buscar':'Nada cadastrado ainda'}};
  Object.defineProperty(sel,'value',{configurable:true,get(){return valorSel.get.call(this)},set(v){valorSel.set.call(this,v);sync()}});
  new MutationObserver(sync).observe(sel,{childList:true,subtree:true,attributes:true});
  const marcar=(t,q)=>{if(!q)return esc(t);const i=norm(t).indexOf(q);return i<0?esc(t):esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length))};
  const lista=()=>{const q=norm(inp.value===rot()?'':inp.value),ops=[...sel.options].filter(o=>!q||norm(o.textContent).includes(q));
    foco=ops.length?0:-1;
    ul.innerHTML=ops.length?ops.map((o,i)=>`<button type="button" role="option" data-v="${esc(o.value)}" class="${o.value===sel.value?'on':''}${i===foco&&q?' foco':''}">${marcar(o.textContent,q)}</button>`).join(''):'<div class="vazio">Nada encontrado</div>';};
  const abrir=()=>{aberto=true;ul.hidden=false;lista();inp.select();
    if(innerHeight<900&&!inp.closest('#sheet'))setTimeout(()=>{const r=inp.getBoundingClientRect();if(r.top>innerHeight*.35)scrollBy({top:r.top-96,behavior:semMov?'auto':'smooth'})},250)};
  const fechar=()=>{aberto=false;ul.hidden=true;sync()};
  const escolher=v=>{const mudou=v!==sel.value;valorSel.set.call(sel,v);aberto=false;ul.hidden=true;sync();if(mudou)sel.dispatchEvent(new Event('change',{bubbles:true}));inp.blur()};
  inp.addEventListener('focus',abrir);
  inp.addEventListener('input',()=>{if(!aberto){aberto=true;ul.hidden=false}lista()});
  inp.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==inp)fechar()},150));
  inp.addEventListener('keydown',e=>{const bs=[...ul.querySelectorAll('button')];
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!bs.length)return;foco=(foco+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length;bs.forEach((b,i)=>b.classList.toggle('foco',i===foco));bs[foco].scrollIntoView({block:'nearest'})}
    else if(e.key==='Enter'){e.preventDefault();if(bs[foco])escolher(bs[foco].dataset.v)}
    else if(e.key==='Escape'){fechar();inp.blur()}});
  ul.addEventListener('pointerdown',e=>e.preventDefault());
  ul.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)escolher(b.dataset.v)});
  sync();
}
function comboTudo(root=document){root.querySelectorAll('select:not([data-combo])').forEach(combo)}
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){if(n.tagName==='SELECT')combo(n);else if(n.querySelector&&n.querySelector('select'))comboTudo(n)}}).observe(document.body,{childList:true,subtree:true});
// busca nas linhas de filtro (marcas, regiões, coleções)
