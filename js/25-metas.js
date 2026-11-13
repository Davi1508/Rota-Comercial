// ---------- metas por marca (e por coleção) ----------
// Uma meta: {id, marca, colecao ('' = todas), valor, desde ('aaaa-mm-dd')}.
// Conta os pedidos fechados daquela marca/coleção a partir de "desde"; previsões ainda sem valor real aparecem à parte.
let metaEdit=null,metaDataMexida=false;

const pedidosDaMeta=mt=>pedidos.filter(o=>o.marca===mt.marca&&(!mt.colecao||o.colecao===mt.colecao)&&(!mt.desde||o.data>=deIso(mt.desde)));
function progressoMeta(mt){
  const ps=pedidosDaMeta(mt),real=sum(ps.filter(o=>!o.pendente),o=>o.valor),prev=sum(ps.filter(o=>o.pendente),o=>o.previsto||0);
  return{real,prev,r:mt.valor?real/mt.valor:0,rp:mt.valor?(real+prev)/mt.valor:0};
}
const corMeta=r=>r>=1?'ok':r>=.6?'warn':'bad';

function renderMetas(){
  const box=$('#metaBox');if(!box)return;
  if(!MARCAS.length){box.innerHTML='<p class="empty">Cadastre uma marca para criar metas.</p>';return}
  const vis=METAS.filter(mt=>marca(mt.marca)&&(filtro.marca==='todas'||mt.marca===filtro.marca)&&(filtro.colecao==='todas'||!mt.colecao||mt.colecao===filtro.colecao));
  const novo=`<button class="btn ghost meta-novo" data-meta-nova>${METAS.length?'Nova meta':'Criar a primeira meta'}</button>`;
  if(!vis.length){box.innerHTML=`<p class="empty">${METAS.length?'Nenhuma meta para este filtro.':'Recebeu meta de alguma marca? Cadastre aqui e acompanhe quanto falta.'}</p>${novo}`;return}
  box.innerHTML=`<div class="metas">${vis.map(mt=>{
    const m=marca(mt.marca),p=progressoMeta(mt),c=corMeta(p.r),falta=mt.valor-p.real;
    const desde=mt.desde?`desde ${deIso(mt.desde).toLocaleDateString('pt-BR')}`:'todos os pedidos';
    return `<button class="meta" data-meta-edit="${esc(mt.id)}">
      <div class="meta-h"><i class="dot" style="background:${m.cor};margin:0"></i><div class="grow"><div class="t">${esc(m.nome)}</div><div class="s">${esc(mt.colecao||'Todas as coleções')} · ${desde}</div></div><b class="num meta-pc" style="color:var(--${c})">${Math.round(p.r*100)}%</b></div>
      <div class="meta-bar" role="img" aria-label="${Math.round(p.r*100)}% da meta${p.prev?`, ${Math.round(p.rp*100)}% contando as previsões`:''}"><i class="prev" style="width:${Math.min(100,p.rp*100)}%"></i><i style="width:${Math.min(100,p.r*100)}%;background:var(--${c})"></i></div>
      <div class="s"><span class="num">${fmt.format(p.real)}</span> de <span class="num">${fmt.format(mt.valor)}</span> · ${falta>0?`faltam <b class="num">${fmt.format(falta)}</b>`:`<b style="color:var(--ok)">meta batida${falta<0?` (+${fmt.format(-falta)})`:''}</b>`}</div>
      ${p.prev?`<div class="s">${fmt.format(p.prev)} em previsões esperando o valor real: se fecharem, chega a ${Math.round(p.rp*100)}%</div>`:''}
    </button>`}).join('')}</div>${novo}`;
}

// Data inicial sugerida: o pedido mais antigo da marca/coleção nos últimos 6 meses, ou o 1º dia do mês
function desdeSugerido(mid,col){
  const lim=new Date(HOJE-183*DAY),ps=pedidos.filter(o=>o.marca===mid&&(!col||o.colecao===col)&&o.data>=lim).sort((a,b)=>a.data-b.data);
  return isoD(ps.length?ps[0].data:new Date(HOJE.getFullYear(),HOJE.getMonth(),1));
}

function abrirMeta(id){
  if(!MARCAS.length){toast('Cadastre uma marca primeiro');return}
  lojaAberta=null;metaEdit=id?METAS.find(x=>x.id===id)||null:null;metaDataMexida=!!metaEdit;
  const mt=metaEdit||{marca:filtro.marca!=='todas'?filtro.marca:MARCAS[0].id,colecao:filtro.colecao!=='todas'?filtro.colecao:'',valor:0,desde:''};
  const cols=[...new Set([...COLECOES,...(mt.colecao?[mt.colecao]:[])])];
  const sh=$('#sheet');sh.dataset.tipo='meta';sh.setAttribute('aria-label',metaEdit?'Editar meta':'Nova meta');
  sh.innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>${metaEdit?'Editar meta':'Nova meta'}</h3><div class="s">O valor que a marca pediu para você vender</div></div><button class="x" data-close aria-label="Fechar">×</button></div></div>
    <div class="sh-body"><form id="formMeta" novalidate>
      <label class="f" for="mtMarca">Marca</label><select id="mtMarca">${MARCAS.map(m=>`<option value="${esc(m.id)}"${m.id===mt.marca?' selected':''}>${esc(m.nome)}</option>`).join('')}</select>
      <label class="f" for="mtColecao">Coleção</label><select id="mtColecao"><option value="">Todas as coleções</option>${cols.map(c=>`<option value="${esc(c)}"${c===mt.colecao?' selected':''}>${esc(c)}</option>`).join('')}</select>
      <label class="f" for="mtValor">Valor da meta</label><div class="valor"><span>R$</span><input id="mtValor" class="num" type="text" inputmode="decimal" placeholder="0" autocomplete="off" value="${mt.valor?mt.valor.toLocaleString('pt-BR'):''}"></div>
      <label class="f" for="mtDesde">Contar pedidos a partir de</label><input id="mtDesde" type="date" value="${mt.desde||desdeSugerido(mt.marca,mt.colecao)}">
      <div class="hint">Use o início das vendas da coleção. Pedidos antes dessa data não entram na meta.</div>
      <p class="erro" id="mtErro" role="alert" hidden></p>
      <div class="fpe">${metaEdit?'<button type="button" class="btn ghost" data-meta-del>Excluir</button>':'<button type="button" class="btn ghost" data-close>Cancelar</button>'}<button type="submit" class="btn">Salvar meta</button></div>
    </form></div>`;
  const sug=()=>{if(!metaDataMexida)$('#mtDesde').value=desdeSugerido($('#mtMarca').value,$('#mtColecao').value)};
  $('#mtMarca').onchange=sug;$('#mtColecao').onchange=sug;$('#mtDesde').onchange=()=>{metaDataMexida=true};
  $('#formMeta').onsubmit=e=>{e.preventDefault();salvarMeta()};
  $('#veu').style.display='block';requestAnimationFrame(()=>sh.classList.add('on'));
  if(!metaEdit)setTimeout(()=>$('#mtValor')&&$('#mtValor').focus(),300);
}

function salvarMeta(){
  const v=Math.round((num($('#mtValor').value)||0)*100)/100,mid=$('#mtMarca').value,col=$('#mtColecao').value,ds=$('#mtDesde').value;
  const erro=t=>{const el=$('#mtErro');el.textContent=t;el.hidden=false};
  if(!(v>0))return erro('Digite o valor da meta.');
  if(!marca(mid))return erro('Escolha a marca.');
  const repetida=METAS.find(x=>x!==metaEdit&&x.marca===mid&&x.colecao===col&&x.desde===ds);
  if(repetida)return erro('Já existe uma meta igual para essa marca e coleção. Toque nela para editar.');
  const mt=metaEdit||{id:'mt'+Date.now().toString(36)};
  Object.assign(mt,{marca:mid,colecao:col,valor:v,desde:/^\d{4}-\d{2}-\d{2}$/.test(ds)?ds:''});
  if(!metaEdit)METAS.push(mt);
  metaEdit=null;salvar();fecharLoja();renderTudo();toast('Meta salva');
}

function excluirMeta(t){
  if(!metaEdit)return;
  if(!t.dataset.ok){t.dataset.ok='1';t.textContent='Toque de novo para excluir';return}
  METAS=METAS.filter(x=>x!==metaEdit);metaEdit=null;salvar();fecharLoja();renderTudo();toast('Meta excluída');
}

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-meta-nova],[data-meta-edit],[data-meta-del]');if(!t)return;
  if('metaNova' in t.dataset)abrirMeta();
  else if(t.dataset.metaEdit)abrirMeta(t.dataset.metaEdit);
  else if('metaDel' in t.dataset)excluirMeta(t);
});

const renderTudoSemMetas=renderTudo;
renderTudo=function(){renderTudoSemMetas();renderMetas()};
