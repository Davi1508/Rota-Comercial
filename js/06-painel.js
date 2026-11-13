// ---------- painel ----------
function renderGrafico(){
  const meses=[];for(let i=11;i>=0;i--){const d=new Date(HOJE.getFullYear(),HOJE.getMonth()-i,1);meses.push({y:d.getFullYear(),m:d.getMonth(),v:{}})}
  pedidos.filter(o=>!o.pendente&&passaMarca(o)&&passaRegiao(o)&&passaColecao(o)).forEach(o=>{const k=meses.find(x=>x.y===o.data.getFullYear()&&x.m===o.data.getMonth());if(k)k.v[o.marca]=(k.v[o.marca]||0)+o.valor});
  const tot=meses.map(k=>sum(Object.values(k.v),x=>x)),mx=Math.max(1,...tot);
  const p=Math.pow(10,Math.floor(Math.log10(mx))),top=Math.ceil(mx/p*2)/2*p;
  const Wc=640,Hc=250,pl=46,pb=26,pt=22,bw=(Wc-pl-4)/12,y=v=>pt+(Hc-pt-pb)*(1-v/top);
  let s=`<svg viewBox="0 0 ${Wc} ${Hc}" style="width:100%;height:auto;display:block" font-family="inherit">`;
  for(let i=0;i<=4;i++){const v=top*i/4,yy=y(v);s+=`<line class="gl" x1="${pl}" x2="${Wc}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl-8}" y="${yy+4}" text-anchor="end">${v?Math.round(v/1000)+' mil':'0'}</text>`}
  meses.forEach((k,i)=>{
    const x=pl+i*bw+bw*.18,w=bw*.64,ms=MARCAS.filter(m=>k.v[m.id]);let acc=0;
    if(tot[i]){const yt=y(tot[i]);s+=`<clipPath id="c${i}"><rect x="${x}" y="${yt}" width="${w}" height="${y(0)-yt}" rx="5"/></clipPath><g clip-path="url(#c${i})">`;
      ms.forEach(m=>{const v=k.v[m.id],y1=y(acc+v),y0=y(acc);s+=`<rect x="${x}" y="${y1}" width="${w}" height="${y0-y1}" fill="${m.cor}"><title>${esc(m.nome)}: ${fmt.format(v)}</title></rect>`;acc+=v});
      s+=`</g><text class="tl" x="${x+w/2}" y="${yt-6}" text-anchor="middle">${(tot[i]/1000).toFixed(0)}k</text>`}
    s+=`<text class="ax${i===11?' cur':''}" x="${x+w/2}" y="${Hc-8}" text-anchor="middle">${MES[k.m]}</text>`;
  });
  $('#grafico').innerHTML=s+'</svg>';
  $('#legMarcas').innerHTML=MARCAS.filter(m=>filtro.marca==='todas'||m.id===filtro.marca).map(m=>`<span><i class="dot" style="background:${m.cor}"></i>${esc(m.nome)}</span>`).join('');
}
function renderPainel(){
  const list=filtrados(),fat=sum(list,o=>o.valor),c=sum(list,com),rec=sum(list.filter(o=>o.pago),com);
  $('#kPainel').innerHTML=[['Vendido',fmt.format(fat)],['Comissão total',fmt.format(c)],['Já recebido',fmt.format(rec)],['A receber',fmt.format(c-rec),'acc'],['Pedidos',list.length],['Lojas que compraram',new Set(list.map(o=>o.loja)).size]]
    .map(([l,v,k])=>`<div class="${k||''}"><span>${l}</span><b class="num">${v}</b></div>`).join('');
  renderGrafico();
  $('#tabMarcas').innerHTML=MARCAS.filter(m=>filtro.marca==='todas'||m.id===filtro.marca).map(m=>{
    const ps=list.filter(o=>o.marca===m.id),cm=sum(ps,com),r=sum(ps.filter(o=>o.pago),com);
    return `<div class="marca-row"><i class="sw" style="background:${m.cor}"></i><div class="grow"><div style="font-weight:700">${esc(m.nome)}<span class="taxa">${pct(m.taxa)}</span></div><div class="mini"><span>Vendido <b class="num">${fmt.format(sum(ps,o=>o.valor))}</b></span><span>A receber <b class="num" style="color:var(--primary)">${fmt.format(cm-r)}</b></span></div></div><div class="n num">${fmt.format(cm)}<div class="s" style="font-weight:500">de comissão</div></div></div>`}).join('');
  const ag={};list.forEach(o=>ag[o.loja]=(ag[o.loja]||0)+o.valor);
  const top=Object.entries(ag).filter(([id])=>loja(id)).sort((a,b)=>b[1]-a[1]).slice(0,6),mx=top.length?top[0][1]:1;
  $('#topLojas').innerHTML=top.length?top.map(([id,v])=>{const l=loja(id);return `<button class="row" data-l="${id}">${avatar(l)}<div class="grow"><div class="t">${esc(l.nome)}</div><div class="s">${esc(l.cidade)}, ${l.uf}</div><div class="bar"><i style="width:${v/mx*100}%;background:var(--accent)"></i></div></div><div class="n num">${fmt.format(v)}</div></button>`}).join(''):'<p class="empty">Nenhum pedido neste período. Escolha um período maior lá em cima.</p>';
}
