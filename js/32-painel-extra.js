// ---------- painel: lucro líquido, rota do dia e conferência de comissão ----------
let rotaBase='',confMarca='',confValor='';
const kmEntre=(a,b)=>{const r=Math.PI/180,dl=(b[1]-a[1])*r,dn=(b[0]-a[0])*r,h=Math.sin(dl/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dn/2)**2;return 12742*Math.asin(Math.sqrt(h))};
const coordLoja=l=>l.coord||coordCidade(l.cidade,l.uf);
function montarExtras(){
  const t=$('#t-painel');if(!t||$('#pxLucro'))return;
  $('#kPainel').insertAdjacentHTML('afterend',`<h2>Lucro líquido <small>comissão menos despesas de viagem</small></h2><div class="stats" id="pxLucro"></div>
    <h2>Rota do dia <small>lojas esfriando ou paradas, da mais perto para a mais longe</small></h2><div id="pxRota"></div>
    <h2>Conferir comissão <small>compare com o extrato da representada</small></h2><div id="pxConf"></div>`);
  t.addEventListener('change',e=>{
    if(e.target.id==='pxBase'){rotaBase=e.target.value;renderRota()}
    else if(e.target.id==='pxMarca'){confMarca=e.target.value;renderConf()}
  });
  t.addEventListener('input',e=>{if(e.target.id==='pxExtrato'){confValor=e.target.value;renderConfRes()}});
}
function renderLucro(){
  const c=sum(filtrados(),com),g=sum(DESPESAS.filter(x=>noPeriodo(x.data)),x=>x.valor),liq=c-g;
  $('#pxLucro').innerHTML=[['Comissão',fmt2.format(c)],['Despesas de viagem',fmt2.format(g)],['Lucro líquido',fmt2.format(liq),'acc']]
    .map(([l,v,k])=>`<div class="${k||''}"${k?' style="grid-column:1/-1"':''}><span>${l}</span><b class="num"${k&&liq<0?' style="color:var(--bad)"':''}>${v}</b></div>`).join('')
    +(filtro.marca!=='todas'?'<div style="grid-column:1/-1"><span>As despesas de viagem não são separadas por marca: aqui entram todas do período.</span></div>':'');
}
function renderRota(){
  const box=$('#pxRota');if(!box)return;
  const cand=ativas().filter(l=>status(l)[0]!=='ok'&&(filtro.marca==='todas'||l.marcas.includes(filtro.marca)));
  if(!cand.length){box.innerHTML='<p class="empty">Nenhuma loja esfriando ou parada. Todas estão comprando no ritmo.</p>';return}
  const cid={};cand.forEach(l=>{const k=l.cidade+'|'+l.uf;cid[k]=(cid[k]||0)+1});
  const chaves=Object.keys(cid).sort((a,b)=>cid[b]-cid[a]);
  if(!cid[rotaBase])rotaBase=chaves[0];
  const [bc,bu]=rotaBase.split('|'),base=coordCidade(bc,bu);
  // vizinho mais próximo a partir da cidade escolhida; sem coordenada, só entram as lojas da própria cidade
  let resto=cand.filter(l=>{const c=coordLoja(l);return c?(base?kmEntre(base,c)<=150:l.cidade===bc&&l.uf===bu):l.cidade===bc&&l.uf===bu}),pos=base,rota=[];
  while(resto.length&&rota.length<9){
    let mi=0,md=Infinity;resto.forEach((l,i)=>{const c=coordLoja(l),d=c&&pos?kmEntre(pos,c):0;if(d<md){md=d;mi=i}});
    const l=resto.splice(mi,1)[0],c=coordLoja(l);rota.push({l,km:c&&pos?Math.round(md):null});if(c)pos=c}
  const pt=l=>{const c=coordLoja(l);return c?`${c[1]},${c[0]}`:`${l.cidade}, ${l.uf}, Brasil`};
  const url=rota.length?`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(base?`${base[1]},${base[0]}`:`${bc}, ${bu}, Brasil`)}&destination=${encodeURIComponent(pt(rota[rota.length-1].l))}&waypoints=${encodeURIComponent(rota.slice(0,-1).map(r=>pt(r.l)).join('|'))}&travelmode=driving`:'';
  box.innerHTML=`<label class="f" for="pxBase">Saindo de</label><select id="pxBase">${chaves.map(k=>`<option value="${esc(k)}"${k===rotaBase?' selected':''}>${esc(k.split('|')[0])}, ${k.split('|')[1]} (${cid[k]} ${cid[k]===1?'loja':'lojas'} a visitar)</option>`).join('')}</select>
    ${rota.length?`<div class="list" style="margin-top:var(--s2)">${rota.map((r,i)=>{const[st,lab]=status(r.l),u=ultima(r.l);return `<button class="row" data-l="${r.l.id}">${avatar(r.l)}<div class="grow"><div class="t">${i+1}. ${esc(r.l.nome)}</div><div class="s">${esc(r.l.cidade)}, ${r.l.uf} · ${u?`${lab}, última compra ${haDias(u)}`:'Sem pedidos ainda'}</div></div>${r.km!=null?`<div class="n num">${r.km} km</div>`:''}</button>`}).join('')}</div>
    <a class="btn acc" href="${url}" target="_blank" rel="noopener">Abrir rota no Google Maps</a>`:'<p class="empty">Nenhuma loja a visitar perto dessa cidade.</p>'}`;
}
function renderConf(){
  const box=$('#pxConf');if(!box)return;
  if(!MARCAS.length){box.innerHTML='<p class="empty">Cadastre uma marca para conferir a comissão.</p>';return}
  if(!marca(confMarca))confMarca=MARCAS[0].id;
  box.innerHTML=`<label class="f" for="pxMarca">Marca</label><select id="pxMarca">${MARCAS.map(m=>`<option value="${m.id}"${m.id===confMarca?' selected':''}>${esc(m.nome)}</option>`).join('')}</select>
    <label class="f" for="pxExtrato">Valor que a representada pagou (R$)</label><input id="pxExtrato" type="text" inputmode="decimal" autocomplete="off" placeholder="Ex.: 1.250,00" value="${esc(confValor)}">
    <div class="ufmsg" id="pxConfRes"></div>`;
  renderConfRes();
}
function renderConfRes(){
  const el=$('#pxConfRes');if(!el)return;
  const ps=filtrados().filter(o=>o.marca===confMarca),calc=sum(ps,com),pago=sum(ps.filter(o=>o.pago),com),v=num(confValor);
  const base=`O app calculou <b class="num">${fmt2.format(calc)}</b> em ${ps.length} ${ps.length===1?'pedido':'pedidos'} do período (já marcados como recebidos: ${fmt2.format(pago)}).`;
  if(!(v>=0)||confValor.trim()===''){el.innerHTML=base+' Digite o valor do extrato para ver a diferença.';return}
  const d=v-calc,ab=Math.abs(d);
  el.innerHTML=base+(ab<.5?` <b style="color:var(--ok)">Confere com o extrato.</b>`
    :d<0?` <b style="color:var(--bad)">Faltam ${fmt2.format(ab)}</b> (${Math.round(ab/(calc||1)*100)}% do calculado). Confira pedidos cancelados, parcelados ou ainda não faturados.`
    :` <b style="color:var(--warn)">O extrato tem ${fmt2.format(ab)} a mais</b> que o calculado. Veja se há pedido sem lançar ou taxa diferente.`);
}
function renderExtras(){montarExtras();renderLucro();renderRota();renderConf()}
(function(){const orig=renderPainel;renderPainel=function(){orig();renderExtras()}})();
