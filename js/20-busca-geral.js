// ---------- busca geral ----------
let buscaQ='';
function abrirBusca(){lojaAberta=null;$('#sheet').setAttribute('aria-label','Buscar');
  $('#sheet').innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>Buscar</h3><div class="s">Lojas, cidades, marcas, regiões, coleções, pedidos e despesas</div></div><button class="x" data-close aria-label="Fechar">×</button></div>
    <input class="search" id="bTudo" type="search" placeholder="Digite um nome, cidade ou valor" autocomplete="off" aria-label="Buscar em tudo" style="margin-top:var(--s3)" value="${esc(buscaQ)}"></div><div class="sh-body" id="bRes"></div>`;
  $('#bTudo').oninput=e=>{buscaQ=e.target.value;renderBusca()};renderBusca();
  $('#veu').style.display='block';requestAnimationFrame(()=>{$('#sheet').classList.add('on');setTimeout(()=>$('#bTudo').focus(),250)});
}
function renderBusca(){
  const q=norm(buscaQ),el=$('#bRes');if(!el)return;
  if(q.length<2){el.innerHTML='<p class="empty">Digite pelo menos 2 letras.</p>';return}
  const tem=t=>norm(t).includes(q),MAX=8,grupos=[];
  const g=(tit,itens)=>{if(itens.length)grupos.push(`<div class="res-g">${tit}${itens.length>MAX?` · ${itens.length}`:''}</div><div class="list">${itens.slice(0,MAX).join('')}</div>`)};
  const linha=(attr,t,sub,dir='')=>`<button class="row" ${attr}><div class="grow"><div class="t">${t}</div>${sub?`<div class="s">${sub}</div>`:''}</div>${dir?`<div class="n num">${dir}</div>`:''}</button>`;
  g('Lojas',lojas.filter(l=>tem(l.nome+' '+l.cidade+' '+(l.regiao||''))).map(l=>linha(`data-b-loja="${l.id}"`,esc(l.nome),esc(l.cidade+'/'+l.uf+(l.regiao?' · '+l.regiao:'')))));
  const cids=[...new Map(lojas.filter(l=>tem(l.cidade)).map(l=>[norm(l.cidade)+'|'+l.uf,l])).values()];
  g('Cidades',cids.map(l=>{const n=lojas.filter(x=>x.cidade===l.cidade&&x.uf===l.uf).length;return linha(`data-b-cid="${esc(norm(l.cidade)+'|'+l.uf)}"`,esc(l.cidade+'/'+l.uf),`${n} ${n===1?'loja':'lojas'} · ver no mapa`)}));
  g('Marcas',MARCAS.filter(m=>tem(m.nome)).map(m=>linha(`data-b-marca="${m.id}"`,`<i class="dot" style="background:${m.cor};margin:0 var(--s2) 0 0"></i>${esc(m.nome)}`,`${pct(m.taxa)} de comissão · filtrar por esta marca`)));
  g('Regiões',REGIOES.filter(tem).map(r=>linha(`data-b-div="regiao" data-val="${esc(r)}"`,esc(r),'Filtrar por esta região')));
  g('Coleções',COLECOES.filter(tem).map(c=>linha(`data-b-div="colecao" data-val="${esc(c)}"`,esc(c),'Filtrar por esta coleção')));
  const ped=pedidos.filter(o=>{const l=loja(o.loja)||{},m=marca(o.marca)||{};return tem([l.nome,l.cidade,m.nome,o.colecao||'',o.data.toLocaleDateString('pt-BR'),String(o.valor).replace('.',',')].join(' '))}).sort((a,b)=>b.data-a.data);
  g('Pedidos',ped.map(o=>{const l=loja(o.loja)||{},m=marca(o.marca)||{};return linha(`data-b-ped="${o.id}"`,esc(l.nome||'Loja'),esc(`${o.data.toLocaleDateString('pt-BR')} · ${m.nome||''}${o.colecao?' · '+o.colecao:''}${o.pendente?' · previsão':''}`),fmt2.format(o.pendente?o.previsto:o.valor))}));
  const des=DESPESAS.filter(x=>tem([x.descricao,x.categoria,x.data.toLocaleDateString('pt-BR'),String(x.valor).replace('.',',')].join(' '))).sort((a,b)=>b.data-a.data);
  g('Despesas de viagem',des.map(x=>linha(`data-b-desp="${x.id}"`,esc(x.descricao||x.categoria||'Despesa'),esc(x.data.toLocaleDateString('pt-BR')+(x.categoria?' · '+x.categoria:'')),fmt2.format(x.valor))));
  el.innerHTML=grupos.join('')||'<p class="empty">Nada encontrado. Confira a grafia.</p>';
}
