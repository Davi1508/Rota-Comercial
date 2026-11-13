// ---------- lojas ----------
let stFiltro='todas';
function renderLojas(){
  const q=norm($('#busca').value),list=filtrados();
  $('#chipsSt').innerHTML=[['todas','Todas'],['ok','Comprando'],['warn','Esfriando'],['bad','Paradas']].map(([k,t])=>`<button class="chip ${stFiltro===k?'on':''}" data-st="${k}">${k!=='todas'?`<i class="dot" style="background:${COR[k]}"></i>`:''}${t}</button>`).join('');
  const ls=lojasVis().filter(l=>(stFiltro==='todas'||status(l)[0]===stFiltro)&&(!q||norm(l.nome+' '+l.cidade+' '+l.uf+' '+(UFS[l.uf]||'')+' '+(l.regiao||'')).includes(q))).sort((a,b)=>dias(ultima(a))-dias(ultima(b)));
  $('#listaLojas').innerHTML=ls.length?ls.map(l=>linhaLoja(l,fmt.format(sum(list.filter(o=>o.loja===l.id),o=>o.valor)))).join(''):'<p class="empty">Nenhuma loja com esse nome. Confira a grafia ou limpe a busca.</p>';
}
