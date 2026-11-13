// ---------- filtros: um botão só, com os ativos à mostra ----------
let fBusca='';
const ICO_FIL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
function filtrosAtivos(){const a=[];
  if(filtro.marca!=='todas'&&marca(filtro.marca))a.push(['marca',marca(filtro.marca).nome,marca(filtro.marca).cor]);
  if(filtro.regiao!=='todas')a.push(['regiao',filtro.regiao]);
  if(filtro.colecao!=='todas')a.push(['colecao',filtro.colecao]);return a}
function renderFbar(){
  const a=filtrosAtivos();
  $('#fbar').innerHTML=`<button class="mchip fbtn${a.length?' on':''}" data-filtros aria-label="Filtros${a.length?`, ${a.length} ativos`:''}">${ICO_FIL}Filtros${a.length?`<span class="cnt">${a.length}</span>`:''}</button>`
    +a.map(([k,t,c])=>`<button class="mchip fativo" data-tirar-f="${k}" aria-label="Remover filtro ${esc(t)}">${c?`<i class="dot" style="background:${c};margin:0"></i>`:''}${esc(t)}<span class="xx" aria-hidden="true">×</span></button>`).join('');
  if($('#sheet').classList.contains('on')&&$('#sheet').dataset.tipo==='filtros')renderFiltrosLista();
}
function abrirFiltros(){lojaAberta=null;fBusca='';const sh=$('#sheet');sh.dataset.tipo='filtros';sh.setAttribute('aria-label','Filtros');
  sh.innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>Filtros</h3><div class="s">Escolha marca, região e coleção</div></div><button class="x" data-close aria-label="Fechar">×</button></div>
    <input class="search" id="fBusca" type="search" placeholder="Buscar marca, região ou coleção" autocomplete="off" aria-label="Buscar nos filtros" style="margin-top:var(--s3)"></div>
    <div class="sh-body"><div id="fLista"></div><div class="fpe"><button class="btn ghost" data-limpar-f>Limpar</button><button class="btn" data-close>Ver resultados</button></div></div>`;
  $('#fBusca').oninput=e=>{fBusca=e.target.value;renderFiltrosLista()};renderFiltrosLista();
  $('#veu').style.display='block';requestAnimationFrame(()=>sh.classList.add('on'));
}
function renderFiltrosLista(){
  const el=$('#fLista');if(!el)return;const q=norm(fBusca);
  const sec=(tit,tipo,todas,itens)=>{const vis=itens.filter(([,t])=>!q||norm(t).includes(q));if(q&&!vis.length)return'';
    return `<div class="fsec"><h4>${tit}</h4>${(q?[]:[['todas',todas]]).concat(vis).map(([v,t,c])=>`<button class="fop${filtro[tipo]===v?' on':''}" data-f-tipo="${tipo}" data-val="${esc(v)}">${c?`<i class="dot" style="background:${c}"></i>`:''}${esc(t)}<span class="ck" aria-hidden="true"></span></button>`).join('')}</div>`};
  el.innerHTML=(sec('Marca','marca','Todas as marcas',MARCAS.map(m=>[m.id,m.nome,m.cor]))
    +(REGIOES.length?sec('Região','regiao','Todas as regiões',REGIOES.map(r=>[r,r])):'')
    +(COLECOES.length?sec('Coleção','colecao','Todas as coleções',COLECOES.map(c=>[c,c])):''))||'<p class="empty">Nada encontrado.</p>';
}
