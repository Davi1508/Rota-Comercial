// ---------- aba Produtos: o que mais vende e o catálogo em fotos ----------
let prodBusca='',prodOrdem='vendidos',prodLimite=60;
const passaMarcaProd=x=>filtro.marca==='todas'||x.marca===filtro.marca;
// soma os itens dos pedidos do período (respeita os filtros do topo)
function vendasPorProduto(){
  const m=new Map();
  for(const o of filtrados())for(const i of o.itens||[]){
    const k=i.p&&produto(i.p)?i.p:'~'+o.marca+'|'+norm(i.ref||i.nome);
    let r=m.get(k);if(!r){r={k,p:produto(i.p)||null,nome:i.nome,ref:i.ref,foto:i.foto,marca:o.marca,pecas:0,valor:0,lojas:new Set(),pedidos:0};m.set(k,r)}
    r.pecas+=+i.qtd||0;r.valor+=(+i.qtd||0)*(+i.preco||0);r.lojas.add(o.loja);r.pedidos++;
  }
  return m;
}
function renderProdutos(){
  const sec=$('#t-produtos');if(!sec)return;
  const vend=vendasPorProduto(),cat=PRODUTOS.filter(passaMarcaProd),vs=[...vend.values()];
  const pecasT=vs.reduce((a,r)=>a+r.pecas,0),valorT=vs.reduce((a,r)=>a+r.valor,0),comFoto=cat.filter(x=>x.foto).length;
  const peds=filtrados().filter(o=>o.itens&&o.itens.length).length;
  $('#kProd').innerHTML=[['Peças vendidas',pecasT.toLocaleString('pt-BR')],['Vendido em produtos',fmt.format(valorT)],['Pedidos com produtos',peds],['No catálogo',cat.length.toLocaleString('pt-BR')],['Com foto',cat.length?Math.round(comFoto/cat.length*100)+'%':'—'],['Sem venda no período',cat.filter(x=>!vend.has(x.id)).length.toLocaleString('pt-BR')]]
    .map(([t,v])=>`<div><span>${t}</span><b class="num">${v}</b></div>`).join('');
  // mais vendidos
  const top=vs.sort((a,b)=>b.pecas-a.pecas||b.valor-a.valor).slice(0,10),max=top[0]?top[0].pecas:1;
  $('#topProd').innerHTML=top.length?`<div class="list">${top.map((r,i)=>{const x=r.p||r,m=marca(r.marca);return `<button class="row rank" ${r.p?`data-prod-edit="${esc(r.p.id)}"`:''}><b class="pos num">${i+1}</b>${thumb({nome:x.nome,foto:x.foto||r.foto})}<div class="grow"><div class="t">${esc(x.nome)}</div><div class="s">${[x.ref&&'Ref. '+esc(x.ref),m&&esc(m.nome),`${r.lojas.size} ${r.lojas.size===1?'loja':'lojas'}`].filter(Boolean).join(' · ')}</div><div class="barra"><i style="width:${Math.max(4,r.pecas/max*100)}%;background:${m?m.cor:'var(--primary)'}"></i></div></div><div class="dir"><b class="num">${r.pecas.toLocaleString('pt-BR')}</b><span class="s">${r.pecas===1?'peça':'peças'}</span><span class="s num">${fmt.format(r.valor)}</span></div></button>`}).join('')}</div>`
    :`<div class="list vazio-box"><p class="empty" style="margin:0">${PRODUTOS.length?'Quando os pedidos tiverem produtos, os mais vendidos do período aparecem aqui.':'Monte seu catálogo e registre pedidos com produtos para ver o que mais vende.'}</p>${PRODUTOS.length?`<button class="btn ghost" data-tab="pedido">Registrar pedido com produtos</button>`:''}</div>`;
  $('#nCat').textContent=cat.length?`${cat.length.toLocaleString('pt-BR')} ${cat.length===1?'produto':'produtos'}${filtro.marca!=='todas'&&marca(filtro.marca)?' da '+marca(filtro.marca).nome:''}`:'';
  gradeProdutos(vend);
}
function gradeProdutos(vend){
  const el=$('#gradeProd');if(!el)return;vend=vend||vendasPorProduto();const q=norm(prodBusca.trim());
  if(!PRODUTOS.length){el.innerHTML=`<div class="list vazio-box"><p class="empty" style="margin:0">Nenhum produto ainda. Importe a planilha de produtos da marca (com fotos dentro dela ou link das fotos) ou adicione um por um.</p></div>`;return}
  let ls=PRODUTOS.filter(x=>passaMarcaProd(x)&&(!q||norm(x.ref+' '+x.nome).includes(q)));
  const pc=x=>(vend.get(x.id)||{pecas:0}).pecas;
  ls.sort(prodOrdem==='az'?(a,b)=>a.nome.localeCompare(b.nome):prodOrdem==='preco'?(a,b)=>b.preco-a.preco:prodOrdem==='menor'?(a,b)=>a.preco-b.preco:prodOrdem==='parados'?(a,b)=>(pc(a)>0)-(pc(b)>0)||a.nome.localeCompare(b.nome):prodOrdem==='semfoto'?(a,b)=>(!!a.foto)-(!!b.foto)||a.nome.localeCompare(b.nome):(a,b)=>pc(b)-pc(a)||a.nome.localeCompare(b.nome));
  if(!ls.length){el.innerHTML='<p class="empty">Nenhum produto encontrado.</p>';return}
  el.innerHTML=`<div class="pgrid">${ls.slice(0,prodLimite).map(x=>{const n=pc(x),m=marca(x.marca);return `<button class="pcard" data-prod-edit="${esc(x.id)}"><span class="pfoto">${x.foto?`<img src="${esc(x.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-ini="${esc(iniciais(x.nome))}">`:`<span class="ini">${esc(iniciais(x.nome))}</span>`}${n?`<span class="vend num">${qtdBR(n)} ${unCurta(x.un)||(n===1?'vendida':'vendidas')}</span>`:''}</span><span class="pinfo"><span class="t">${esc(x.nome)}</span><span class="s">${[x.ref&&'Ref. '+esc(x.ref),filtro.marca==='todas'&&MARCAS.length>1&&m&&esc(m.nome)].filter(Boolean).join(' · ')||'&nbsp;'}</span><b class="num">${x.preco?precoBR(x.preco)+(unCurta(x.un)?`<small class="s"> / ${unCurta(x.un)}</small>`:''):'sem preço'}</b></span></button>`}).join('')}</div>
    ${ls.length>prodLimite?`<button class="btn ghost" data-prod-mais>Mostrar mais (${(ls.length-prodLimite).toLocaleString('pt-BR')})</button>`:''}`;
}
// foto do cartão que não abre: vira as iniciais
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.parentNode&&t.parentNode.classList&&t.parentNode.classList.contains('pfoto')){const s=document.createElement('span');s.className='ini';s.textContent=t.dataset.ini||'?';t.replaceWith(s)}},true);

// ---------- ferramenta: importar catálogo de produtos ----------
let ip=null;
const CAMPOS_IP=[['produto','Nome do produto',1],['ref','Referência / código'],['preco','Preço'],['unidade','Unidade de venda'],['foto','Foto (link da imagem)'],['marca','Marca']];
function abrirImportProd(){ip={etapa:'escolher',erro:''};lojaAberta=null;renderImportProd();mostrarSheet()}
function renderImportProd(){
  const sh=$('#sheet');sh.dataset.tipo='impprod';sh.setAttribute('aria-label','Importar catálogo de produtos');let corpo='';
  if(ip.etapa==='escolher')corpo=`
    <p class="s" style="margin:0">Traga os produtos de uma marca de uma vez: a planilha da fábrica, da importadora ou de outro app. Funciona com Excel (.xlsx) e .csv.</p>
    <ul class="dicas"><li><b>Fotos dentro do Excel</b> entram junto: cada foto vai para o produto da linha onde ela está.</li><li>Ou uma coluna com o <b>link da foto</b> de cada produto.</li><li>Importar de novo atualiza preços sem repetir produtos.</li></ul>
    ${ip.erro?`<div class="erro">${esc(ip.erro)}</div>`:''}
    <label class="btn" style="cursor:pointer">Escolher planilha<input type="file" id="ipArq" accept=".xlsx,.xlsm,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden></label>
    <label class="btn ghost" style="cursor:pointer">Importar nota fiscal (XML)<input type="file" id="ipXml" accept=".xml,text/xml,application/xml" multiple hidden></label>
    <p class="s" style="margin:0 0 var(--s2)">Pelo XML da NF-e que a fábrica manda, os produtos entram com código, nome e custo. Dá para escolher várias notas de uma vez. A nota fica no seu aparelho.</p>
    <button class="btn ghost" data-ip-modelo>Baixar planilha modelo</button>
    <details class="colar"><summary>Ou colar do Excel ou do Google Planilhas</summary><textarea id="ipTexto" rows="5" placeholder="Selecione as linhas na planilha (com o cabeçalho), copie e cole aqui" maxlength="2000000"></textarea><button class="btn ghost" data-ip-colar>Usar o que colei</button></details>`;
  else if(ip.etapa==='colunas'){
    const a=ip.abas[ip.aba],ex=k=>{const i=ip.mapa[k];if(i==null)return'';const v=ip.dados.map(l=>l[i]).find(x=>x!==''&&x!=null);if(v==null)return'';if(k==='preco'){const n=valorPlan(v);return n>0?fmt2.format(n):String(v).slice(0,40)}return String(v).slice(0,40)};
    const op=k=>`<option value="">— não tem —</option>`+ip.colunas.map((c,i)=>`<option value="${i}"${ip.mapa[k]===i?' selected':''}>${esc(c)}</option>`).join('');
    const prev=ip.dados.filter(l=>!linhaDeTotal(l)&&String(cel(l,'produto')||'').trim()).slice(0,6);
    corpo=`<div class="plan-top"><div class="grow"><b>${esc(ip.nomeArq)}</b><div class="s">${ip.dados.length.toLocaleString('pt-BR')} linhas${a.nFotos?` · ${a.nFotos.toLocaleString('pt-BR')} fotos dentro da planilha`:''}</div></div><button class="chipbtn" data-ip-voltar>Trocar</button></div>
      ${ip.abas.length>1?`<label class="f" for="ipAba">Aba</label><select id="ipAba" data-sem-combo>${ip.abas.map((x,i)=>`<option value="${i}"${i===ip.aba?' selected':''}>${esc(x.nome)} (${x.linhas.length} linhas${x.nFotos?`, ${x.nFotos} fotos`:''})</option>`).join('')}</select>`:''}
      ${ip.mapa.marca==null?`<label class="f" for="ipMarca">Marca destes produtos *</label><select id="ipMarca" data-sem-combo><option value="">Escolha a marca</option>${MARCAS.map(m=>`<option value="${esc(m.id)}"${ip.marcaPadrao===m.id?' selected':''}>${esc(m.nome)}</option>`).join('')}</select>${MARCAS.length?'':'<p class="s" style="color:var(--warn)">Cadastre a marca em Ajustes > Marcas antes de importar.</p>'}`:''}
      <p class="s" style="margin:var(--s3) 0 var(--s1)">Confira de qual coluna vem cada informação. Já liguei as que reconheci.</p>
      <div class="plan-campos">${CAMPOS_IP.map(([k,t,ob])=>`<div class="plan-campo"><label class="f" for="ip-${k}">${t}${ob?' *':''}</label><select id="ip-${k}" data-ip-col="${k}" data-sem-combo>${op(k)}</select>${ex(k)?`<div class="s">ex.: ${esc(ex(k))}</div>`:''}</div>`).join('')}</div>
      ${prev.length?`<div class="f" style="margin-top:var(--s3)">Prévia</div><div class="pgrid mini" id="ipPrev">${prev.map((l,i)=>{const v=valorPlan(cel(l,'preco')),lk=fotoLink(l);return `<div class="pcard"><span class="pfoto" data-ip-foto="${i}">${lk?`<img src="${esc(lk)}" alt="" referrerpolicy="no-referrer">`:l._foto?'':'<span class="ini">sem foto</span>'}</span><span class="pinfo"><span class="t">${esc(String(cel(l,'produto')))}</span><span class="s">${cel(l,'ref')?'Ref. '+esc(String(cel(l,'ref'))):'&nbsp;'}</span><b class="num">${v>0?fmt2.format(v):'sem preço'}</b></span></div>`}).join('')}</div>`:'<p class="erro">Não achei produtos nessa aba. Confira a coluna do nome.</p>'}
      <label class="check" style="margin-top:var(--s3)"><input type="checkbox" id="ipAtualizar"${ip.atualizar?' checked':''}> Atualizar preço e nome dos produtos que já existem</label>
      ${ip.erro?`<div class="erro">${esc(ip.erro)}</div>`:''}
      <button class="btn" data-ip-conferir>Conferir ${ip.dados.length.toLocaleString('pt-BR')} linhas</button>`;
  }
  else if(ip.etapa==='conferido'){const r=ip.res,n=r.novos.length+r.atual.length;
    corpo=`<div class="imp-resumo" style="margin-top:0"><div><b>${r.novos.length.toLocaleString('pt-BR')}</b><span>novos</span></div><div><b>${r.atual.length.toLocaleString('pt-BR')}</b><span>vão ser atualizados</span></div><div><b>${r.iguais.toLocaleString('pt-BR')}</b><span>já estavam iguais</span></div></div>
      ${r.semMarca.size?`<div class="aviso" style="margin-top:var(--s3)"><b>Marca não cadastrada</b><p class="s" style="margin:var(--s1) 0 0">${[...r.semMarca].map(([k,v])=>`${esc(k)} (${v})`).join(', ')}. Esses produtos ficaram de fora.</p><button class="btn ghost" data-ip-marcas>Cadastrar ${r.semMarca.size===1?'essa marca':'essas marcas'} e conferir de novo</button><p class="s" style="margin:var(--s2) 0 0">A comissão começa em 0%. Ajuste depois em Ajustes > Marcas.</p></div>`:''}
      ${r.fotosPlan?`<p class="s" style="margin:var(--s3) 0 0">${r.fotosPlan.toLocaleString('pt-BR')} fotos de dentro da planilha vão para ${naConta()?'a sua conta':'este celular'}.${!naConta()&&r.fotosPlan>LIMITE_SEM_CONTA?` Sem conta, só as primeiras ${LIMITE_SEM_CONTA} cabem no celular.`:''}</p>`:''}
      ${r.fotosLink?`<p class="s" style="margin:var(--s2) 0 0">${r.fotosLink.toLocaleString('pt-BR')} com link de foto.</p>`:''}
      ${r.ignoradas?`<p class="s" style="margin:var(--s2) 0 0">${r.ignoradas.toLocaleString('pt-BR')} ${r.ignoradas===1?'linha ignorada':'linhas ignoradas'} (sem nome, repetidas ou de total).</p>`:''}
      ${r.novos.length?`<div class="f" style="margin-top:var(--s3)">Primeiros novos</div><div class="list">${r.novos.slice(0,8).map((x,i)=>`<div class="ped">${x.foto?thumb(x):x.fotoGet?`<span class="thumb vazio" aria-hidden="true" data-ip-nf="${i}"></span>`:thumb(x)}<div class="grow"><div class="t">${esc(x.nome)}</div><div class="s">${[x.ref&&'Ref. '+esc(x.ref),esc((marca(x.marca)||{}).nome||'')].filter(Boolean).join(' · ')}</div></div><b class="num">${x.preco?precoBR(x.preco):''}</b></div>`).join('')}</div>`:''}
      ${n?`<button class="btn" data-ip-salvar>Salvar ${n.toLocaleString('pt-BR')} ${n===1?'produto':'produtos'}</button>`:'<p class="empty">Nada novo para salvar.</p>'}
      <button class="btn ghost" data-ip-colunas>Voltar e mudar as colunas</button>`}
  else if(ip.etapa==='salvando'){const p=ip.prog;
    corpo=`<p style="margin:0"><b>Produtos salvos.</b> Agora enviando as fotos…</p><div class="progresso"><i id="ipBarra" style="width:${p.total?p.feito/p.total*100:0}%"></i></div><p class="s num" id="ipProg">${p.feito} de ${p.total} fotos</p><p class="s">Deixe o app aberto até terminar.</p>`}
  else if(ip.etapa==='nota')corpo=corpoNota();
  else if(ip.etapa==='pronto'){const f=ip.fim;
    corpo=`<div class="ok-box"><b>${f.novos.toLocaleString('pt-BR')} ${f.novos===1?'produto novo':'produtos novos'}${f.atual?` e ${f.atual.toLocaleString('pt-BR')} ${f.atual===1?'atualizado':'atualizados'}`:''}</b>${f.fotos?`<p class="s" style="margin:var(--s1) 0 0">${f.fotos.toLocaleString('pt-BR')} fotos guardadas${f.falhas?`, ${f.falhas} não deram certo`:''}.</p>`:''}</div>
      <button class="btn" data-ip-ver>Ver produtos</button><button class="btn ghost" data-ip-outra>Importar outra planilha</button>`}
  sh.innerHTML=topoSheet('Importar catálogo de produtos',ip.etapa==='colunas'?'Passo 2 de 3 · colunas':ip.etapa==='conferido'?'Passo 3 de 3 · conferir':ip.etapa==='escolher'?'Passo 1 de 3 · planilha':ip.etapa==='nota'?'Nota fiscal':'Catálogo')+`<div class="sh-body" style="padding-top:var(--s3)">${corpo}</div>`;
  const arq=$('#ipArq');if(arq)arq.onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)lerPlanilhaProd(f)};
  if(ip.etapa==='colunas')carregarFotosPrevia();
  if(ip.etapa==='conferido')ip.res.novos.slice(0,8).forEach(async(x,i)=>{if(!x.fotoGet)return;try{const b=await x.fotoGet(),el=document.querySelector(`[data-ip-nf="${i}"]`);if(b&&el){const im=document.createElement('img');im.className='thumb';im.alt='';im.src=URL.createObjectURL(b);el.replaceWith(im)}}catch(e){}});
}
const LIMITE_SEM_CONTA=60;
const cel=(l,k)=>ip.mapa[k]!=null?l[ip.mapa[k]]:'';
const fotoLink=l=>{const f=String(cel(l,'foto')||'').trim().split(/[\s,;|]+/)[0];return /^https?:\/\/\S{4,}$/i.test(f)&&f.length<=590?f:''};
async function carregarFotosPrevia(){
  const prev=ip.dados.filter(l=>!linhaDeTotal(l)&&String(cel(l,'produto')||'').trim()).slice(0,6);
  for(let i=0;i<prev.length;i++){const l=prev[i];if(fotoLink(l)||!l._foto)continue;
    try{const b=await l._foto(),el=document.querySelector(`[data-ip-foto="${i}"]`);if(b&&el){const u=URL.createObjectURL(b);el.innerHTML=`<img src="${u}" alt="">`}}catch(e){}}
}
function prepararPlanProd(abas,nome){
  const ia=abas.reduce((b,a,i)=>(a.nFotos||0)>(abas[b].nFotos||0)||((a.nFotos||0)===(abas[b].nFotos||0)&&a.linhas.length>abas[b].linhas.length)?i:b,0);
  ip={etapa:'colunas',abas,aba:ia,nomeArq:nome,marcaPadrao:filtro.marca!=='todas'&&marca(filtro.marca)?filtro.marca:(MARCAS.length===1?MARCAS[0].id:''),atualizar:true,erro:''};
  prepararAbaProd();renderImportProd();
}
function prepararAbaProd(){
  const a=ip.abas[ip.aba];ip.cab=acharCabecalho(a.linhas);const cab=a.linhas[ip.cab]||[];
  ip.colunas=cab.map((c,i)=>String(c||'').trim()||`Coluna ${i+1}`);ip.mapa=mapearColunas(cab,CAMPOS_PROD);
  ip.dados=a.linhas.slice(ip.cab+1).filter(l=>l.some(c=>c!==''&&c!=null)||l._foto);
}
async function lerPlanilhaProd(f){
  const nome=(f.name||'').toLowerCase();
  try{
    if(f.size>80*1024*1024)throw new Error('Arquivo grande demais (mais de 80 MB). Divida a planilha em partes.');
    if(/\.xls$/.test(nome))throw new Error('Arquivo .xls antigo: abra no Excel e use "Salvar como" .xlsx');
    if(/\.(xlsx|xlsm)$/.test(nome)){const sh=$('#sheet .sh-body');if(sh)sh.insertAdjacentHTML('afterbegin','<p class="s" id="ipLendo">Lendo a planilha…</p>');prepararPlanProd(await lerXlsx(await f.arrayBuffer()),f.name);return}
    const txt=decodificarTexto(await f.arrayBuffer());
    if(!pareceTabelaTexto(txt))throw new Error('Não reconheci uma tabela nesse arquivo. Use .xlsx ou .csv.');
    prepararPlanProd([{nome:f.name,linhas:lerCsv(txt)}],f.name);
  }catch(e){ip={etapa:'escolher',erro:e.message||'Não consegui ler esse arquivo'};renderImportProd()}
}
function conferirImportProd(){
  if(ip.mapa.produto==null){ip.erro='Escolha a coluna do nome do produto.';return renderImportProd()}
  if(ip.mapa.marca==null&&!marca(ip.marcaPadrao)){ip.erro='Escolha a marca destes produtos.';return renderImportProd()}
  ip.erro='';
  const porNome=new Map(MARCAS.map(m=>[norm(m.nome),m])),chave=(mid,ref,nome)=>mid+'|'+(norm(ref)||'#'+norm(nome));
  const exist=new Map(PRODUTOS.map(x=>[chave(x.marca,x.ref,x.nome),x])),vistos=new Set();
  const r={novos:[],atual:[],iguais:0,semMarca:new Map(),ignoradas:0,fotosPlan:0,fotosLink:0};
  for(const l of ip.dados){
    if(linhaDeTotal(l)){r.ignoradas++;continue}
    const nome=String(cel(l,'produto')??'').trim();if(!nome){r.ignoradas++;continue}
    let m=marca(ip.marcaPadrao);if(ip.mapa.marca!=null){const mn=String(cel(l,'marca')??'').trim();m=porNome.get(norm(mn))||(mn?null:m);
      if(!m){const k=mn||'(sem marca)';r.semMarca.set(k,(r.semMarca.get(k)||0)+1);continue}}
    const ref=String(cel(l,'ref')??'').trim().slice(0,60),p=valorPlan(cel(l,'preco')),link=fotoLink(l);
    const k=chave(m.id,ref,nome);if(vistos.has(k)){r.ignoradas++;continue}vistos.add(k);
    const un=ip.mapa.unidade!=null?unOk(cel(l,'unidade')):'';
    const x={marca:m.id,ref,nome:nome.slice(0,160),preco:p>0?Math.round(p*100)/100:0,foto:link,fotoGet:!link&&l._foto?l._foto:null,...(un&&un!=='un'?{un}:{})};
    const e=exist.get(k);
    if(e){const mud={};if(ip.atualizar){if(x.preco&&x.preco!==e.preco)mud.preco=x.preco;if(x.nome!==e.nome)mud.nome=x.nome;if(ip.mapa.unidade!=null&&(x.un||'')!==(e.un||''))mud.un=x.un||''}
      if(!e.foto&&(x.foto||x.fotoGet)){if(x.foto)mud.foto=x.foto;else mud.fotoGet=x.fotoGet}
      else if(x.foto&&e.foto!==x.foto&&!fotoDaConta(e.foto)&&!/^data:/.test(e.foto||''))mud.foto=x.foto;
      if(Object.keys(mud).length){r.atual.push([e,mud]);if(mud.fotoGet)r.fotosPlan++;else if(mud.foto)r.fotosLink++}else r.iguais++}
    else{r.novos.push(x);if(x.fotoGet)r.fotosPlan++;else if(x.foto)r.fotosLink++}
  }
  ip.res=r;ip.etapa='conferido';renderImportProd();$('#sheet').scrollTop=0;
}
function cadastrarMarcasIP(){
  for(const nome of ip.res.semMarca.keys()){if(nome==='(sem marca)'||MARCAS.some(m=>norm(m.nome)===norm(nome)))continue;
    let id='m'+norm(nome).replace(/[^a-z0-9]/g,'').slice(0,20);while(marca(id))id+='x';
    MARCAS.push({id,nome:nome.slice(0,80),taxa:0,cor:PALETA[MARCAS.length%PALETA.length]})}
  salvar();preencherForm();renderTudo();conferirImportProd();toast('Marcas cadastradas com 0% de comissão. Ajuste em Ajustes > Marcas.');
}
async function salvarImportProd(){
  const r=ip.res,fila=[];let novos=0,atual=0;
  for(const x of r.novos){const p={id:novoIdProd(),marca:x.marca,ref:x.ref,nome:x.nome,preco:x.preco,foto:x.foto||'',...(x.un?{un:x.un}:{})};PRODUTOS.push(p);novos++;if(x.fotoGet)fila.push([p,x.fotoGet])}
  for(const [e,m] of r.atual){const{fotoGet,...resto}=m;Object.assign(e,resto);if(resto.un==='')delete e.un;atual++;if(fotoGet)fila.push([e,fotoGet])}
  salvar();renderItensForm();renderProdutos();
  const lista=naConta()?fila:fila.slice(0,LIMITE_SEM_CONTA);
  ip.fim={novos,atual,fotos:0,falhas:0};
  if(lista.length){
    ip.etapa='salvando';ip.prog={feito:0,total:lista.length};renderImportProd();
    let pos=0,desdeSalvar=0;
    const trabalhador=async()=>{while(pos<lista.length){const [p,get]=lista[pos++];
      try{const b=await get();if(!b||!b.size)throw new Error('vazia');const u=fotoOk(await guardarFoto(b,p.id));if(!u)throw new Error('não salvou');p.foto=u;ip.fim.fotos++}catch(e){ip.fim.falhas++}
      ip.prog.feito++;const bar=$('#ipBarra'),t=$('#ipProg');if(bar)bar.style.width=(ip.prog.feito/ip.prog.total*100)+'%';if(t)t.textContent=`${ip.prog.feito} de ${ip.prog.total} fotos`;
      if(++desdeSalvar>=25){desdeSalvar=0;salvar()}}};
    await Promise.all([trabalhador(),trabalhador(),trabalhador()]);
    salvar();renderProdutos();
  }
  if(ip){ip.etapa='pronto';if($('#sheet').dataset.tipo==='impprod')renderImportProd()}
  toast(`${(novos+atual).toLocaleString('pt-BR')} produtos salvos no catálogo`);
}
function baixarModelo(){
  const txt='﻿Referência;Nome do produto;Preço;Foto (link da imagem);Marca\r\nCF-500;Café torrado 500 g;18,90;https://site-da-marca.com.br/fotos/cf-500.jpg;'+((MARCAS[0]||{}).nome||'Maré Alta')+'\r\nFR-650;Furadeira de impacto 650 W;289,90;;'+((MARCAS[0]||{}).nome||'Maré Alta')+'\r\n';
  const u=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='modelo-catalogo-rota-comercial.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
  toast('Modelo baixado. Abra no Excel, preencha e importe aqui.');
}

// ---------- cliques e campos ----------
document.addEventListener('input',e=>{const t=e.target;if(!t)return;if(t.id==='bProd'){prodBusca=t.value;prodLimite=60;gradeProdutos()}});
document.addEventListener('change',e=>{const t=e.target;if(!t)return;
  if(t.id==='ordProd'){prodOrdem=t.value;prodLimite=60;gradeProdutos()}
  else if(ip&&t.dataset&&t.dataset.ipCol){const k=t.dataset.ipCol;if(t.value==='')delete ip.mapa[k];else{const i=+t.value;for(const x in ip.mapa)if(ip.mapa[x]===i&&x!==k)delete ip.mapa[x];ip.mapa[k]=i}ip.erro='';renderImportProd()}
  else if(ip&&t.id==='ipAba'){ip.aba=+t.value;prepararAbaProd();renderImportProd()}
  else if(ip&&t.id==='ipMarca'){ip.marcaPadrao=t.value;ip.erro=''}
  else if(ip&&t.id==='ipAtualizar'){ip.atualizar=t.checked}});
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-prod-edit],[data-prod-novo],[data-prod-mais],[data-imp-prod],[data-ip-modelo],[data-ip-colar],[data-ip-voltar],[data-ip-conferir],[data-ip-colunas],[data-ip-marcas],[data-ip-salvar],[data-ip-ver],[data-ip-outra]');if(!t)return;const d=t.dataset;
  if('prodEdit' in d){catOrigem='aba';catEdit=d.prodEdit;catFoto=null;lojaAberta=null;renderCatalogo();mostrarSheet();$('#sheet').scrollTop=0}
  else if('prodNovo' in d){catOrigem='aba';if(filtro.marca!=='todas')catMarca=filtro.marca;catEdit='novo';catFoto=null;lojaAberta=null;renderCatalogo();mostrarSheet();$('#sheet').scrollTop=0}
  else if('prodMais' in d){prodLimite+=120;gradeProdutos()}
  else if('impProd' in d)abrirImportProd();
  else if('ipModelo' in d)baixarModelo();
  else if('ipColar' in d){const txt=($('#ipTexto')||{}).value||'';if(!pareceTabelaTexto(txt)){ip.erro='Cole as linhas da planilha junto com o cabeçalho (a primeira linha com os nomes das colunas).';renderImportProd();return}prepararPlanProd([{nome:'Tabela colada',linhas:lerCsv(txt)}],'Tabela colada')}
  else if('ipVoltar' in d||'ipOutra' in d)abrirImportProd();
  else if('ipConferir' in d)conferirImportProd();
  else if('ipColunas' in d){ip.etapa='colunas';renderImportProd()}
  else if('ipMarcas' in d)cadastrarMarcasIP();
  else if('ipSalvar' in d){t.disabled=true;salvarImportProd()}
  else if('ipVer' in d){fecharLoja();irAba('produtos')}
});
try{renderProdutos()}catch(e){}
