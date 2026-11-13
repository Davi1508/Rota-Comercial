// ---------- ficha da loja ----------
let lojaAberta=null;
function abrirLoja(id){
  lojaAberta=id;const l=loja(id),ps=pedidos.filter(o=>o.loja===id).sort((a,b)=>b.data-a.data);
  const tot=sum(ps,o=>o.valor),c=sum(ps,com),pend=sum(ps.filter(o=>!o.pago),com),[st,lab]=status(l),u=ps[0]&&ps[0].data;
  const ms=[...new Set([...l.marcas,...ps.map(o=>o.marca)])];
  $('#sheet').innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h">${avatar(l)}<div><h3>${esc(l.nome)}</h3><div class="s">${esc(l.cidade)}, ${UFS[l.uf]||l.uf}</div></div><button class="x" data-close aria-label="Fechar">×</button></div>
    <span class="pill p-${st}" style="margin-top:16px"><i class="dot" style="background:${COR[st]};margin:0"></i>${lab}${u?', última compra '+haDias(u):''}</span>${ritmo(l)?`<div class="s" style="margin-top:var(--s2)">Costuma comprar a cada ${ritmo(l)} dias</div>`:''}</div>
  <div class="sh-body">
    <div class="stats" style="margin-top:16px;grid-template-columns:1fr 1fr">
      <div><span>Vendas acumuladas</span><b class="num">${fmt.format(tot)}</b></div>
      <div><span>Comissão acumulada</span><b class="num">${fmt.format(c)}</b></div>
      <div><span>Pedidos</span><b class="num">${ps.length}</b></div>
      <div><span>Ticket médio</span><b class="num">${fmt.format(ps.length?tot/ps.length:0)}</b></div>
      <div class="acc" style="grid-column:1/-1"><span>Comissão a receber desta loja</span><b class="num">${fmt.format(pend)}</b></div>
    </div>
    <h2>Por marca</h2>
    <div class="list">${ms.map(mid=>{const m=marca(mid),pm=ps.filter(o=>o.marca===mid);return `<div class="marca-row"><i class="sw" style="background:${m.cor}"></i><div class="grow"><div style="font-weight:700">${esc(m.nome)}<span class="taxa">${pct(m.taxa)}</span></div><div class="mini"><span>${pm.length} pedido${pm.length!==1?'s':''}</span><span>Vendido <b class="num">${fmt.format(sum(pm,o=>o.valor))}</b></span></div></div><div class="n num">${fmt.format(sum(pm,com))}</div></div>`}).join('')}</div>
    <h2>Pedidos <small>toque num pedido para editar</small></h2>
    <div class="list">${ps.map(o=>{const m=marca(o.marca);return `<div class="ped clic" data-edit-ped="${o.id}"><i class="dot" style="background:${m.cor};margin:0"></i><div class="grow"><div style="font-weight:700">${o.pendente?'Previsto '+fmt.format(o.previsto):fmt.format(o.valor)}</div><div class="s">${o.data.toLocaleDateString('pt-BR')}, ${esc(m.nome)}${!o.pendente&&o.previsto?` · previsto ${fmt.format(o.previsto)}`:''}</div></div><div style="text-align:right">${o.pendente?'<span class="pv-tag pend">falta o valor real</span>':`<div class="num" style="font-weight:700">${fmt2.format(com(o))}</div>${o.previsto?`<span class="pv-tag ${corPrev(o.valor/o.previsto)}">${Math.round(o.valor/o.previsto*100)}% do previsto</span> `:''}<button class="badge ${o.pago?'b-ok':'b-pend'}" data-pay="${o.id}">${o.pago?'recebida':'a receber'}</button>`}</div></div>`}).join('')||'<p class="empty">Nenhum pedido registrado ainda.</p>'}</div>
    ${(()=>{const pl=mapaPronto&&posLoja(l);return `<div class="loc">${pl&&pl.aprox?'<span>Localização aproximada no mapa</span>':'<span>Localização no mapa</span>'}<button class="chipbtn${pl&&pl.aprox?' pri':''}" data-colocar="${id}">${pl&&pl.aprox?'Marcar no mapa':'Ajustar'}</button></div>`})()}
    <button class="btn acc" data-novo="${id}">Registrar pedido desta loja</button>
    <button class="btn ghost" data-editar-loja="${id}">Editar dados da loja</button>
    <button class="btn danger" data-remover="${id}">Arquivar loja</button>
  </div>`;
  $('#veu').style.display='block';requestAnimationFrame(()=>$('#sheet').classList.add('on'));
}
function fecharLoja(){lojaAberta=null;$('#sheet').dataset.tipo='';$('#sheet').classList.remove('on');$('#veu').style.display='none'}
