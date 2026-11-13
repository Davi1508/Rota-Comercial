// ---------- painel de lojas do estado ----------
let ufFil={cidade:'',marca:'',status:''};
function renderLojasUF(anim){
  const box=$('#ufPainel');if(anim){box.classList.remove('entra');void box.offsetWidth;box.classList.add('entra')}
  if(!estadoSel){box.hidden=true;box.innerHTML='';return}
  box.hidden=false;
  const todas=lojasVis().filter(l=>l.uf===estadoSel);
  if(!todas.length){
    const extra=filtro.marca!=='todas'?` que trabalhem com a ${marca(filtro.marca).nome}`:'';
    box.innerHTML=`<div class="lhead"><h2>Lojas ${emUF(estadoSel)}</h2><span class="lcount">0 lojas</span></div>
      <div class="list" style="padding:8px 16px 16px"><p class="empty">Ainda não existem lojas cadastradas ${emUF(estadoSel)}${extra}.</p><button class="btn" data-nova-uf="${estadoSel}" style="margin-top:0">Cadastrar loja ${emUF(estadoSel)}</button></div>`;
    return;
  }
  const cidades=[...new Set(todas.map(l=>l.cidade))].sort((a,b)=>a.localeCompare(b));
  const marcasDisp=MARCAS.filter(m=>(filtro.marca==='todas'||m.id===filtro.marca)&&todas.some(l=>l.marcas.includes(m.id)));
  if(ufFil.cidade&&!cidades.includes(ufFil.cidade))ufFil.cidade='';
  if(ufFil.marca&&!marcasDisp.some(m=>m.id===ufFil.marca))ufFil.marca='';
  const ls=todas.filter(l=>(!ufFil.cidade||l.cidade===ufFil.cidade)&&(!ufFil.marca||l.marcas.includes(ufFil.marca))&&(!ufFil.status||status(l)[0]===ufFil.status));
  const ag={};filtrados().forEach(o=>{if(ufFil.marca&&o.marca!==ufFil.marca)return;const a=ag[o.loja]||(ag[o.loja]={n:0,v:0,c:0});a.n++;a.v+=o.valor;a.c+=com(o)});
  const z={n:0,v:0,c:0};ls.sort((a,b)=>(ag[b.id]||z).v-(ag[a.id]||z).v);
  const ativo=ufFil.cidade||ufFil.marca||ufFil.status,pl=n=>n===1?'loja encontrada':'lojas encontradas';
  const opt=(v,t,sel)=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(t)}</option>`;
  box.innerHTML=`<div class="lhead"><h2>Lojas ${emUF(estadoSel)}</h2><span class="lcount">${ls.length} ${pl(ls.length)}${ativo?` de ${todas.length}`:''}</span></div>
    <div class="lfil">
      <select id="fCid" aria-label="Filtrar por cidade">${opt('','Cidades',ufFil.cidade)}${cidades.map(c=>opt(c,c,ufFil.cidade)).join('')}</select>
      <select id="fMar" aria-label="Filtrar por marca">${opt('','Marcas',ufFil.marca)}${marcasDisp.map(m=>opt(m.id,m.nome,ufFil.marca)).join('')}</select>
      <select id="fSt" aria-label="Filtrar por status">${opt('','Status',ufFil.status)}${opt('ok','Comprando',ufFil.status)}${opt('warn','Esfriando',ufFil.status)}${opt('bad','Paradas',ufFil.status)}</select>
    </div>
    ${ls.length?`<div class="lgrid">${ls.map(l=>{const a=ag[l.id]||z,[st,lab]=status(l);
      return `<button class="lcard" data-l="${l.id}"><div class="lc-top">${avatar(l)}<div class="grow"><div class="t">${esc(l.nome)}</div><div class="s">${esc(l.cidade)}${l.regiao?' · '+esc(l.regiao):''}</div></div><span class="pill p-${st}">${lab}</span></div>
        <div class="lc-marcas">${l.marcas.map(id=>{const m=marca(id);return `<span><i class="dot" style="background:${m.cor}"></i>${esc(m.nome)}</span>`}).join('')}</div>
        <div class="lc-num"><div><span>Pedidos</span><b class="num">${a.n}</b></div><div><span>Vendas</span><b class="num">${fmt.format(a.v)}</b></div><div><span>Comissão</span><b class="num" style="color:var(--primary)">${fmt.format(a.c)}</b></div></div></button>`}).join('')}</div>`
    :`<div class="list"><p class="empty">Nenhuma loja com esses filtros. <button class="link" data-limpar>Limpar filtros</button></p></div>`}`;
}
function linhaLoja(l,valor){
  const u=ultima(l);
  return `<button class="row" data-l="${l.id}">${avatar(l)}<div class="grow"><div class="t">${esc(l.nome)}</div><div class="s">${esc(l.cidade)}, ${u?'última compra '+haDias(u):'sem pedidos ainda'}</div></div><div class="n num">${valor}</div></button>`;
}
function renderHero(){
  const list=filtrados(),c=sum(list,com),r=sum(list.filter(o=>o.pago),com);
  $('#hBig').textContent=fmt.format(c-r);$('#hRec').textContent=fmt.format(r);$('#hFat').textContent=fmt.format(sum(list,o=>o.valor));
}
function renderCidadeBox(){
  const list=filtrados(),box=$('#cidadeBox'),base=lojasVis().filter(l=>!estadoSel||l.uf===estadoSel);
  if(cidadeSel){
    const [c,u]=cidadeSel.split('|'),ls=base.filter(l=>l.cidade===c&&l.uf===u);
    $('#cidTit').innerHTML=`${esc(c)} <small>${ls.length} loja${ls.length!==1?'s':''} <button class="link" data-c="">ver todas as cidades</button></small>`;
    box.innerHTML=ls.map(l=>linhaLoja(l,fmt.format(sum(list.filter(o=>o.loja===l.id),o=>o.valor)))).join('')||'<p class="empty">Nenhuma loja nesta cidade com o filtro atual.</p>';
    return;
  }
  const gr={};base.forEach(l=>{const k=l.cidade+'|'+l.uf;(gr[k]=gr[k]||{k,c:l.cidade,uf:l.uf,n:0,v:0}).n++});
  list.forEach(o=>{const l=loja(o.loja),g=l&&gr[l.cidade+'|'+l.uf];if(g)g.v+=o.valor});
  const rows=Object.values(gr).sort((a,b)=>b.v-a.v),max=Math.max(1,...rows.map(r=>r.v));
  $('#cidTit').innerHTML=`Cidades que mais rendem <small>${estadoSel?UFS[estadoSel]:'todos os estados'}</small>`;
  box.innerHTML=rows.map(r=>`<button class="row" data-c="${esc(r.k)}"><div class="grow"><div class="t">${esc(r.c)}</div><div class="s">${r.n} loja${r.n>1?'s':''}, ${r.uf}</div><div class="bar"><i style="width:${r.v/max*100}%"></i></div></div><div class="n num">${fmt.format(r.v)}</div></button>`).join('')
    ||`<p class="empty">Nenhuma loja cadastrada${estadoSel?' '+emUF(estadoSel):''} ainda.</p>`;
}
