// ---------- catálogo de produtos, itens no pedido e cópia do pedido para o cliente ----------
// Produto: {id, marca, ref, nome, preco, foto}. Foto = link (da conta ou da internet) ou, sem conta, imagem pequena no celular.
// Item do pedido: cópia do produto no dia (p, ref, nome, preco, qtd, foto) para o histórico não mudar se o catálogo mudar.
let catMarca='todas',catBusca='',catEdit=null,catLimite=60,catFoto=null,catSalvando=false,escBusca='',escLimite=60,copiaPronta=null;
let seqProd=0,catOrigem='sheet';
const produto=id=>PRODUTOS.find(x=>x.id===id);
const prodDaMarca=mid=>PRODUTOS.filter(x=>x.marca===mid);
const novoIdProd=()=>'p'+Date.now().toString(36)+(++seqProd).toString(36)+Math.random().toString(36).slice(2,5);
const iniciais=t=>String(t||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?';
const precoBR=v=>fmt2.format(+v||0);
const pecas=it=>it.reduce((a,i)=>a+(+i.qtd||0),0);
// lucro dos itens que têm custo: {venda, custo, lucro}; null se nenhum tem custo
const lucroItens=it=>{const c=(it||[]).filter(i=>i.custo>0);if(!c.length)return null;const venda=c.reduce((a,i)=>a+(i.preco||0)*i.qtd,0),custo=c.reduce((a,i)=>a+i.custo*i.qtd,0);return{venda,custo,lucro:venda-custo}};
// Unidade de venda do produto (embalagem industrial vende por caixa, milheiro, kg...). 'un' é o padrão e não é gravado.
const UNIDADES={un:['unidade','unidades','un'],cx:['caixa','caixas','cx'],pct:['pacote','pacotes','pct'],fd:['fardo','fardos','fd'],cto:['cento','centos','cento'],mil:['milheiro','milheiros','milheiro'],kg:['kg','kg','kg'],m:['metro','metros','m'],m2:['m²','m²','m²'],rl:['rolo','rolos','rolo'],l:['litro','litros','L'],par:['par','pares','par'],dz:['dúzia','dúzias','dz']};
const SIN_UN={un:'un',und:'un',unid:'un',unidade:'un',unidades:'un',pc:'un',pca:'un',peca:'un',pecas:'un',cx:'cx',caixa:'cx',caixas:'cx',pct:'pct',pac:'pct',pacote:'pct',pacotes:'pct',fd:'fd',fardo:'fd',fardos:'fd',cto:'cto',cento:'cto',mil:'mil',milheiro:'mil',milh:'mil',mi:'mil',kg:'kg',quilo:'kg',kilo:'kg',m:'m',mt:'m',metro:'m',metros:'m',m2:'m2',rl:'rl',rolo:'rl',rolos:'rl',l:'l',lt:'l',litro:'l',litros:'l',par:'par',pares:'par',dz:'dz',duzia:'dz'};
const unOk=u=>{const s=norm(String(u||'')).replace(/[^a-z0-9]/g,'');return SIN_UN[s]||(s&&s.length<=8?s:'')};
const unCurta=u=>u&&u!=='un'?(UNIDADES[u]?UNIDADES[u][2]:u):'';
const unNome=(u,q)=>{const x=UNIDADES[u||'un'];return x?x[q===1?0:1]:u};
const qtdBR=q=>(+q||0).toLocaleString('pt-BR',{maximumFractionDigits:3});
const qtdUn=(q,u)=>`${qtdBR(q)} ${unNome(u,+q)}`;
// resumo: "1.500 unidades" quando é tudo na mesma unidade; senão "3 produtos"
const resumoItens=it=>{const us=new Set(it.map(i=>i.un||'un'));return us.size===1?qtdUn(pecas(it),[...us][0]):`${it.length} produtos`};
const lerQtd=v=>{const n=num(String(v||'').trim());return n>0?Math.min(9999999,Math.round(n*1000)/1000):0};
const totalItens=it=>Math.round(it.reduce((a,i)=>a+(+i.qtd||0)*(+i.preco||0),0)*100)/100;
const fotoDoItem=i=>{const p=produto(i.p);return(p&&p.foto)||i.foto||''};
function thumb(x,cls){const f=x&&(x.foto!==undefined?x.foto:'');
  return f?`<img class="thumb${cls?' '+cls:''}" src="${esc(f)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-ini="${esc(iniciais(x.nome))}">`:`<span class="thumb vazio${cls?' '+cls:''}" aria-hidden="true">${esc(iniciais(x&&x.nome))}</span>`}
// foto que não abre (link quebrado): vira as iniciais
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.classList.contains('thumb')){const s=document.createElement('span');s.className=t.className+' vazio';s.setAttribute('aria-hidden','true');s.textContent=t.dataset.ini||'?';t.replaceWith(s)}},true);
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.closest&&t.closest('.busca-foto'))t.closest('.busca-foto').remove()},true);
const mostrarSheet=()=>{$('#veu').style.display='block';requestAnimationFrame(()=>$('#sheet').classList.add('on'))};

// ---------- fotos ----------
async function imgDe(src){return await new Promise((ok,falha)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>falha(new Error('imagem'));i.src=src})}
// Reduz e converte para JPEG (fotos de celular têm 3 a 5 MB)
async function reduzirImagem(blob,max,q){
  let fonte;try{fonte=await createImageBitmap(blob)}catch(e){const u=URL.createObjectURL(blob);try{fonte=await imgDe(u)}finally{setTimeout(()=>URL.revokeObjectURL(u),1000)}}
  const w=fonte.width,h=fonte.height,k=Math.min(1,max/Math.max(w,h)),cv=document.createElement('canvas');
  cv.width=Math.max(1,Math.round(w*k));cv.height=Math.max(1,Math.round(h*k));const c=cv.getContext('2d');
  c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);c.drawImage(fonte,0,0,cv.width,cv.height);
  return await new Promise(ok=>cv.toBlob(ok,'image/jpeg',q));
}
const blobParaDataURL=b=>new Promise((ok,falha)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=falha;r.readAsDataURL(b)});
const dataURLParaBlob=async u=>await (await fetch(u)).blob();
const naConta=()=>typeof conta!=='undefined'&&conta&&typeof sb!=='undefined'&&sb&&!exemplo;
const pastaFotos=()=>`${SB_URL}/storage/v1/object/public/fotos/${conta.id}/`;
// Guarda a foto: na conta (link permanente) ou, sem conta/sem internet, pequena no celular
async function guardarFoto(blob,id){
  if(naConta()){
    try{const jpg=await reduzirImagem(blob,800,.82),cam=`${conta.id}/${id}-${Date.now().toString(36)}.jpg`;
      const{error}=await sb.storage.from('fotos').upload(cam,jpg,{contentType:'image/jpeg',cacheControl:'31536000'});
      if(!error)return sb.storage.from('fotos').getPublicUrl(cam).data.publicUrl;console.warn('Foto não subiu',error)}catch(e){console.warn('Foto não subiu',e)}
  }
  return await blobParaDataURL(await reduzirImagem(blob,240,.6));
}
// Imagem de um link: direto (se o site deixar) ou pelo servidor do app (precisa estar na conta)
async function baixarImagem(url){
  if(/^(data:|blob:)/.test(url)||url.startsWith(SB_URL+'/storage/')){const r=await fetch(url);if(r.ok)return await r.blob();throw new Error('Não consegui abrir essa foto')}
  if(!naConta())throw new Error('Entre na sua conta para trazer fotos de links');
  const{data}=await sb.auth.getSession(),tk=data&&data.session&&data.session.access_token;if(!tk)throw new Error('Entre na sua conta de novo');
  const r=await fetch(SB_URL+'/functions/v1/foto-da-web',{method:'POST',headers:{Authorization:'Bearer '+tk,apikey:SB_CHAVE,'Content-Type':'application/json'},body:JSON.stringify({url})});
  if(!r.ok){let m='Não consegui abrir esse link';try{m=(await r.json()).erro||m}catch(e){}throw new Error(m.charAt(0).toUpperCase()+m.slice(1))}
  return await r.blob();
}
const fotoDaConta=u=>naConta()&&String(u||'').startsWith(pastaFotos());
// Apaga do servidor a foto que ninguém mais usa (nem o catálogo, nem pedidos antigos)
function apagarFotoSemUso(u){
  if(!fotoDaConta(u))return;
  if(PRODUTOS.some(x=>x.foto===u)||pedidos.some(o=>o.itens&&o.itens.some(i=>i.foto===u)))return;
  sb.storage.from('fotos').remove([u.slice(u.indexOf('/fotos/')+7)]).catch(()=>{});
}
// Fotos tiradas sem conta (ou sem internet) sobem para a conta quando der
let subindoFotos=false;
async function subirFotosLocais(){
  if(subindoFotos||!naConta())return;const pend=PRODUTOS.filter(x=>/^data:image\/(jpeg|png|webp)/.test(x.foto||''));if(!pend.length)return;
  subindoFotos=true;let n=0;
  try{for(const x of pend){const u=await guardarFoto(await dataURLParaBlob(x.foto),x.id);if(/^https?:/.test(u)&&produto(x.id)){x.foto=u;n++}else break}}catch(e){}
  subindoFotos=false;if(n)salvar();
}

// ---------- catálogo (tela) ----------
function abrirCatalogo(mid){catOrigem='sheet';if(mid)catMarca=mid;if(catMarca!=='todas'&&!marca(catMarca))catMarca='todas';catEdit=null;catBusca='';catLimite=60;catFoto=null;lojaAberta=null;renderCatalogo();mostrarSheet()}
function topoSheet(t,s,extra){return `<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>${t}</h3><div class="s">${s}</div></div><button class="x" data-close aria-label="Fechar">×</button></div>${extra||''}</div>`}
function renderCatalogo(){
  const sh=$('#sheet');sh.dataset.tipo='catalogo';sh.setAttribute('aria-label','Catálogo de produtos');
  if(catEdit){sh.innerHTML=topoSheet(catEdit==='novo'?'Novo produto':'Editar produto','Catálogo')+`<div class="sh-body" style="padding-top:var(--s3)">${formProduto()}</div>`;ligarFormProduto();return}
  const nm=new Set(PRODUTOS.map(x=>x.marca)).size;
  const chips=MARCAS.length>1?`<div class="mchips" role="tablist">${[['todas','Todas'],...MARCAS.map(m=>[m.id,m.nome])].map(([k,t])=>`<button type="button" class="mchip${catMarca===k?' on':''}" data-cat-marca="${esc(k)}">${esc(t)}<small class="s" style="margin-left:var(--s1)">${k==='todas'?PRODUTOS.length:prodDaMarca(k).length}</small></button>`).join('')}</div>`:'';
  sh.innerHTML=topoSheet('Catálogo de produtos',PRODUTOS.length?`${PRODUTOS.length} ${PRODUTOS.length===1?'produto':'produtos'}${nm>1?` em ${nm} marcas`:''}`:'Fotos e preços para montar pedidos',chips)+`<div class="sh-body" style="padding-top:var(--s3)">
    ${MARCAS.length?`<input class="search" id="catBusca" type="search" placeholder="Buscar por nome ou referência" autocomplete="off" aria-label="Buscar produto" value="${esc(catBusca)}">
    <div class="cat-acoes"><button class="btn" data-cat-novo>Adicionar produto</button><button class="btn ghost" data-cat-importar>Importar planilha</button></div>
    <div id="catLista"></div>`:`<p class="empty">Cadastre uma marca primeiro. Cada produto pertence a uma marca.</p><button class="btn" data-ajustes="marcas">Cadastrar marcas</button>`}</div>`;
  listaCatalogo();
}
function listaCatalogo(){
  const el=$('#catLista');if(!el)return;const q=norm(catBusca.trim());
  const ls=PRODUTOS.filter(x=>(catMarca==='todas'||x.marca===catMarca)&&(!q||norm(x.ref+' '+x.nome).includes(q))).sort((a,b)=>a.marca===b.marca?a.nome.localeCompare(b.nome):(marca(a.marca)||{nome:''}).nome.localeCompare((marca(b.marca)||{nome:''}).nome));
  if(!ls.length){el.innerHTML=`<p class="empty">${PRODUTOS.length?'Nenhum produto encontrado.':'Nenhum produto ainda. Adicione um por um, com foto, ou importe a planilha da marca (Excel ou .csv com referência, nome, preço e link da foto).'}</p>`;return}
  el.innerHTML=`<div class="list">${ls.slice(0,catLimite).map(x=>{const m=marca(x.marca);const mg=x.custo>0?(x.preco>0?`Custo ${precoBR(x.custo)} · margem ${Math.round((x.preco-x.custo)/x.preco*100)}%`:`Custo ${precoBR(x.custo)} · sem preço de venda`):'';
      return `<button class="row cat-row" data-cat-edit="${esc(x.id)}">${thumb(x)}<div class="grow"><div class="t">${esc(x.nome)}</div><div class="s cat-ref">${[x.ref&&'Ref. '+esc(x.ref),catMarca==='todas'&&m&&esc(m.nome)].filter(Boolean).join(' · ')}</div><b class="num cat-preco">${x.preco?precoBR(x.preco)+(unCurta(x.un)?`<small class="s"> / ${unCurta(x.un)}</small>`:''):'<span class="s">sem preço</span>'}</b>${mg?`<div class="s cat-margem">${mg}</div>`:''}</div></button>`}).join('')}</div>
    ${ls.length>catLimite?`<button class="btn ghost" data-cat-mais>Mostrar mais (${ls.length-catLimite})</button>`:''}`;
}
function formProduto(){
  const x=catEdit==='novo'?null:produto(catEdit),mid=x?x.marca:(catMarca!=='todas'?catMarca:(marcaForm&&marcaForm())||(MARCAS[0]||{}).id);
  const fotoAtual=catFoto?(catFoto.tipo==='remover'?'':catFoto.ver):(x&&x.foto)||'';
  return `<form class="form" id="formProd" novalidate style="max-width:none">
    <div class="foto-box"><div class="foto-prev" id="prFotoPrev">${fotoAtual?`<img src="${esc(fotoAtual)}" alt="Foto do produto" referrerpolicy="no-referrer">`:'<span class="s">Sem foto</span>'}</div>
      <div class="foto-acoes"><label class="btn ghost" style="cursor:pointer">Tirar ou escolher foto<input type="file" id="prFotoArq" accept="image/*" hidden></label>
        <button type="button" class="btn ghost" data-pr-colar>Colar imagem copiada</button>
        <button type="button" class="btn ghost" data-pr-buscar>Buscar foto</button>
        ${fotoAtual?'<button type="button" class="chipbtn" data-pr-sem-foto style="margin:0">Tirar a foto</button>':''}</div></div>
    <div id="prBusca"></div>
    <label class="f" for="prLink">Ou cole o link da imagem <small class="opc">da internet</small></label><input id="prLink" type="url" inputmode="url" placeholder="https://…" autocomplete="off" value="${catFoto&&catFoto.tipo==='link'?esc(catFoto.url):''}" maxlength="600">
    <label class="f" for="prMarca">Marca</label><select id="prMarca" data-sem-combo>${MARCAS.map(m=>`<option value="${esc(m.id)}"${m.id===mid?' selected':''}>${esc(m.nome)}</option>`).join('')}</select>
    <label class="f" for="prRef">Referência <small class="opc">código do produto</small></label><input id="prRef" type="text" maxlength="60" autocomplete="off" value="${x?esc(x.ref):''}">
    <label class="f" for="prNome">Nome</label><input id="prNome" type="text" maxlength="160" autocomplete="off" placeholder="Ex.: Café torrado 500 g" value="${x?esc(x.nome):''}">
    <label class="f" for="prUn">Vendido por <small class="opc">unidade do preço</small></label><select id="prUn" data-sem-combo>${Object.entries(UNIDADES).map(([k,v])=>`<option value="${k}"${(x&&x.un||'un')===k?' selected':''}>${v[0][0].toUpperCase()+v[0].slice(1)}</option>`).join('')}${x&&x.un&&!UNIDADES[x.un]?`<option value="${esc(x.un)}" selected>${esc(x.un)}</option>`:''}</select>
    <label class="f" for="prPreco">Preço</label><div class="valor"><span>R$</span><input id="prPreco" class="num" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${x&&x.preco?String(x.preco.toFixed(2)).replace('.',','):''}" maxlength="14"></div>
    <label class="f" for="prCusto">Custo <small class="opc">opcional, quanto você paga · não aparece para o cliente</small></label><div class="valor"><span>R$</span><input id="prCusto" class="num" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${x&&x.custo?String(x.custo.toFixed(2)).replace('.',','):''}" maxlength="14"></div>
    ${x&&x.custo&&x.preco?`<p class="s">Margem: ${Math.round((x.preco-x.custo)/x.preco*100)}% · lucro de ${precoBR(x.preco-x.custo)} por ${unNome(x.un,1)}</p>`:''}
    <div class="erro" id="prErro" hidden></div>
    <button class="btn" type="submit" id="prSalvar">${x?'Salvar produto':'Adicionar ao catálogo'}</button>
    ${x?`<button class="btn danger" type="button" data-pr-excluir>Excluir produto</button>`:''}
    <button class="btn ghost" type="button" data-pr-voltar>${catOrigem==='aba'?'Cancelar':catOrigem==='escolha'?'Voltar aos produtos do pedido':'Voltar ao catálogo'}</button></form>`;
}
function erroProd(t){const e=$('#prErro');if(e){e.textContent=t;e.hidden=!t}}
function verFoto(src){const el=$('#prFotoPrev');if(el)el.innerHTML=src?`<img src="${esc(src)}" alt="Foto do produto" referrerpolicy="no-referrer">`:'<span class="s">Sem foto</span>'}
function fotoDeArquivo(b){if(!b||!/^image\//.test(b.type||'image/'))return toast('Esse arquivo não é uma imagem');if(catFoto&&catFoto.ver&&catFoto.tipo==='blob')URL.revokeObjectURL(catFoto.ver);catFoto={tipo:'blob',blob:b,ver:URL.createObjectURL(b)};const l=$('#prLink');if(l)l.value='';verFoto(catFoto.ver);erroProd('')}
function fotoDeLink(u){u=String(u||'').trim();if(!u){catFoto=null;verFoto((produto(catEdit)||{}).foto||'');return}
  if(!/^https?:\/\/\S+$/i.test(u)||u.length>590)return erroProd('Esse link não parece de uma imagem. Ele começa com https://');
  catFoto={tipo:'link',url:u,ver:u};verFoto(u);erroProd('')}
function ligarFormProduto(){
  const f=$('#formProd');if(!f)return;f.onsubmit=salvarProduto;
  $('#prFotoArq').onchange=e=>{const b=e.target.files[0];e.target.value='';if(b)fotoDeArquivo(b)};
  const l=$('#prLink');l.onchange=()=>fotoDeLink(l.value);
  l.addEventListener('paste',e=>{const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(i=>i.kind==='file'&&/^image\//.test(i.type));if(it){e.preventDefault();fotoDeArquivo(it.getAsFile())}else setTimeout(()=>fotoDeLink(l.value),0)});
  if(catEdit==='novo')setTimeout(()=>{const n=$('#prRef');if(n&&matchMedia('(pointer:fine)').matches)n.focus()},250);
}
async function colarImagem(){
  try{
    if(navigator.clipboard&&navigator.clipboard.read){for(const it of await navigator.clipboard.read()){
      const tipo=it.types.find(t=>/^image\//.test(t));if(tipo){fotoDeArquivo(await it.getType(tipo));return}
      if(it.types.includes('text/plain')){const t=await (await it.getType('text/plain')).text();if(/^https?:\/\//i.test(t.trim())){$('#prLink').value=t.trim();fotoDeLink(t);return}}}}
    else if(navigator.clipboard&&navigator.clipboard.readText){const t=await navigator.clipboard.readText();if(/^https?:\/\//i.test(t.trim())){$('#prLink').value=t.trim();fotoDeLink(t);return}}
    toast('Não achei imagem copiada. No Google, segure a foto e toque em Copiar.');
  }catch(e){toast('Este aparelho não deixou colar daqui. Segure no campo do link e toque em Colar.')}
}
// Busca fotos sem sair do app (Brave, pelo servidor do app). Sem conta, abre o Google.
let buscaFotos=null;
async function buscarFotos(){
  const nome=$('#prNome').value.trim(),m=marca($('#prMarca').value);
  if(!nome)return erroProd('Digite o nome do produto antes de buscar a foto.');
  if(!naConta()){buscarNoGoogle();return}
  const box=$('#prBusca'),q=[m&&m.nome,nome].filter(Boolean).join(' ');
  box.innerHTML='<div class="busca-fotos"><p class="s" style="margin:0">Buscando fotos…</p></div>';erroProd('');
  try{
    const{data}=await sb.auth.getSession(),tk=data&&data.session&&data.session.access_token;if(!tk)throw new Error('Entre na sua conta de novo');
    const r=await fetch(SB_URL+'/functions/v1/busca-fotos',{method:'POST',headers:{Authorization:'Bearer '+tk,apikey:SB_CHAVE,'Content-Type':'application/json'},body:JSON.stringify({q,site:(m&&m.site)||''})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.erro||'Não deu para buscar agora');
    buscaFotos=d.fotos||[];
    if(!$('#prBusca'))return;
    box.innerHTML=`<div class="busca-fotos"><div class="busca-top"><b>Toque na foto certa</b>${d.limite?`<span class="s num">${d.usadas} de ${d.limite} buscas no mês</span>`:''}</div>
      ${buscaFotos.length?`<div class="busca-grade">${buscaFotos.map((f,i)=>`<button type="button" class="busca-foto" data-pr-escolher="${i}" title="${esc(f.titulo)}"><span class="bf-img"><img src="${esc(f.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span><span class="bf-fonte">${esc(f.fonte.replace(/^(www|blog|loja|lojavirtual|shop|m)\./,''))}</span></button>`).join('')}</div>`:'<p class="s" style="margin:0">Não achei fotos. Tente mudar o nome do produto.</p>'}
      <button type="button" class="chipbtn" data-pr-google style="margin:var(--s2) 0 0">Abrir no Google</button></div>`;
  }catch(e){if($('#prBusca'))box.innerHTML=`<div class="busca-fotos"><p class="s" style="margin:0;color:var(--bad)">${esc(e.message||'Não deu para buscar agora')}</p><button type="button" class="chipbtn" data-pr-google style="margin:var(--s2) 0 0">Abrir no Google</button></div>`}
}
function escolherFotoBusca(i){
  const f=buscaFotos&&buscaFotos[i];if(!f)return;
  catFoto={tipo:'web',url:f.img,thumb:f.thumb,ver:f.thumb};const l=$('#prLink');if(l)l.value='';verFoto(f.thumb);erroProd('');
  document.querySelectorAll('[data-pr-escolher]').forEach(b=>b.classList.toggle('on',+b.dataset.prEscolher===i));
}
function buscarNoGoogle(){
  const m=marca($('#prMarca').value),q=[m&&m.nome,$('#prRef').value.trim(),$('#prNome').value.trim()].filter(Boolean).join(' ');
  if(!$('#prRef').value.trim()&&!$('#prNome').value.trim())return erroProd('Digite a referência ou o nome antes de buscar a foto.');
  window.open('https://www.google.com/search?tbm=isch&q='+encodeURIComponent(q),'_blank','noopener');
  toast('Segure a foto que quiser, toque em Copiar e volte aqui para colar');
}
async function salvarProduto(e){
  e.preventDefault();if(catSalvando)return;
  const nome=$('#prNome').value.trim(),ref=$('#prRef').value.trim(),mid=$('#prMarca').value,pv=$('#prPreco').value.trim(),preco=pv?num(pv):0;
  if(!nome)return erroProd('Digite o nome do produto.');
  if(!marca(mid))return erroProd('Escolha a marca.');
  if(pv&&!(preco>=0))return erroProd('Preço inválido. Use só números, como 89,90.');
  const x=catEdit==='novo'?null:produto(catEdit);
  if(ref&&PRODUTOS.some(y=>y!==x&&y.marca===mid&&norm(y.ref)===norm(ref)))return erroProd(`Já existe um produto com a referência ${ref} nessa marca.`);
  const b=$('#prSalvar');catSalvando=true;b.disabled=true;b.textContent='Salvando…';
  const id=x?x.id:novoIdProd(),antiga=x?x.foto:'';let foto=antiga,aviso='';
  try{
    if(catFoto&&catFoto.tipo==='remover')foto='';
    else if(catFoto&&catFoto.tipo==='blob')foto=await guardarFoto(catFoto.blob,id);
    else if(catFoto&&catFoto.tipo==='web'){ // foto escolhida na busca: traz a original; se o site não deixar, a miniatura
      let b=null;try{b=await baixarImagem(catFoto.url)}catch(err){try{b=await baixarImagem(catFoto.thumb)}catch(err2){}}
      if(b)foto=await guardarFoto(b,id);else{foto=catFoto.url;aviso=' (a foto ficou como link do site)'}}
    else if(catFoto&&catFoto.tipo==='link'){foto=catFoto.url;
      // traz uma cópia para a conta: o link original pode sumir do site da marca
      if(naConta())try{foto=await guardarFoto(await baixarImagem(catFoto.url),id)}catch(err){foto=catFoto.url;aviso=' (a foto ficou como link do site)'}}
  }catch(err){foto=antiga;aviso=' (a foto não foi salva)'}
  const un=unOk(($('#prUn')||{}).value),cv=num(($('#prCusto')||{}).value||''),custo=cv>0?Math.round(cv*100)/100:0,novo={id,marca:mid,ref:ref.slice(0,60),nome:nome.slice(0,160),preco:Math.round((preco||0)*100)/100,foto:fotoOk(foto),...(un&&un!=='un'?{un}:{}),...(custo?{custo}:{})};
  if(x){Object.assign(x,novo);if(!novo.un)delete x.un;if(!novo.custo)delete x.custo}else PRODUTOS.push(novo);
  if(antiga&&antiga!==novo.foto)apagarFotoSemUso(antiga);
  catSalvando=false;catEdit=null;catFoto=null;catMarca=mid;salvar();const naEscolha=catOrigem==='escolha';depoisDeEditar(x?null:novo);renderItensForm();
  if(!naEscolha||x||aviso)toast((x?'Produto atualizado':'Produto adicionado ao catálogo')+aviso);
}
// volta para onde a pessoa estava: o catálogo (folha) ou a aba Produtos
function depoisDeEditar(novo){if(typeof renderProdutos==='function')renderProdutos();
  if(catOrigem==='escolha'){catOrigem='sheet';if(novo&&novo.marca===marcaForm()){mudarQtd(novo.id,1);escBusca='';toast('Produto criado e colocado no pedido')}else if(novo)toast('Produto criado em outra marca: não entrou neste pedido');renderEscolha();$('#sheet').scrollTop=0;return true}
  if(catOrigem==='aba'){catOrigem='sheet';fecharLoja()}else renderCatalogo()}
function excluirProduto(btn){
  const x=produto(catEdit);if(!x)return;
  if(!btn.dataset.ok){btn.dataset.ok='1';btn.textContent='Toque de novo para excluir';return}
  PRODUTOS=PRODUTOS.filter(y=>y!==x);apagarFotoSemUso(x.foto);catEdit=null;catFoto=null;salvar();depoisDeEditar();renderItensForm();toast('Produto excluído. Pedidos antigos continuam com ele.');
}

// ---------- itens no formulário do pedido ----------
function renderItensForm(){
  const box=$('#pItensBox');if(!box)return;copiaPronta=null;
  const mid=typeof marcaForm==='function'?marcaForm():null,n=mid?prodDaMarca(mid).length:0;
  if(!itensForm.length){box.innerHTML=mid?`<button type="button" class="btn ghost" data-esc-abrir>${n?`Escolher produtos do catálogo (${n})`:'Montar pedido com produtos e fotos'}</button>`:'';return}
  box.innerHTML=`<span class="f">Itens <small class="opc">${resumoItens(itensForm)}</small></span>
    <div class="list itens">${itensForm.map((i,k)=>`<div class="ped com-passo">${thumb({nome:i.nome,foto:fotoDoItem(i)},'p48')}<div class="grow"><div class="t">${esc(i.nome)}</div><div class="s">${i.ref?'Ref. '+esc(i.ref)+' · ':''}${precoBR(i.preco)} ${unCurta(i.un)?'por '+unNome(i.un,1):'cada'}</div></div>${passo(i.qtd,`data-it-menos="${k}"`,`data-it-mais="${k}"`,`data-it-qtd="${k}"`)}</div>`).join('')}
      <div class="itens-total"><span>Total dos itens</span><b class="num">${precoBR(totalItens(itensForm))}</b></div>${lucroItens(itensForm)?`<div class="itens-total lucro"><span>Lucro dos produtos <small class="opc">venda menos custo · só você vê</small></span><b class="num">${precoBR(lucroItens(itensForm).lucro)}</b></div>`:''}</div>
    <p class="s" style="margin:var(--s2) 0 0">O valor real do pedido é a soma dos itens. Se der desconto, é só mudar o valor.</p>
    <div class="itens-acoes"><button type="button" class="btn ghost" data-esc-abrir>Mais produtos</button><button type="button" class="btn ghost" data-copia-cliente>Enviar ao cliente</button></div>
    <div id="copiaBox"></div>`;
}
const passo=(q,menos,mais,campo)=>`<div class="passo"><button type="button" ${menos} aria-label="Menos uma">−</button>${campo?`<input class="num qtd" type="text" inputmode="decimal" ${campo} value="${qtdBR(q)}" aria-label="Quantidade" maxlength="11" autocomplete="off" enterkeyhint="done">`:`<b class="num" aria-label="Quantidade">${qtdBR(q)}</b>`}<button type="button" ${mais} aria-label="Mais uma">+</button></div>`;
function itensMudaram(){
  const t=totalItens(itensForm);if(t>0){$('#pValor').value=t.toFixed(2).replace('.',',')}
  renderItensForm();preview();
}
function definirQtd(pid,q){const i=itensForm.find(x=>x.p===pid);if(i){i.qtd=0;mudarQtd(pid,q)}else if(q>0)mudarQtd(pid,q);else itensMudaram()}
function mudarQtd(pid,delta){
  let i=itensForm.find(x=>x.p===pid);const x=produto(pid);
  if(!i){if(delta<=0||!x)return;i={p:x.id,ref:x.ref,nome:x.nome,preco:x.preco,qtd:0,foto:/^https?:/i.test(x.foto||'')?x.foto:'',...(x.un&&x.un!=='un'?{un:x.un}:{}),...(x.custo>0?{custo:x.custo}:{})};itensForm.push(i)}
  i.qtd=Math.max(0,Math.min(9999999,Math.round(((+i.qtd||0)+delta)*1000)/1000));if(!i.qtd)itensForm=itensForm.filter(y=>y!==i);
  itensMudaram();
}
// Quantidade digitada (pedidos de milhares de peças): vale ao sair do campo ou tocar em OK
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains('qtd'))return;const q=lerQtd(t.value);
  if('itQtd' in t.dataset){const i=itensForm[+t.dataset.itQtd];if(!i)return;if(q>0){i.qtd=q;itensMudaram()}else{itensForm.splice(+t.dataset.itQtd,1);itensMudaram()}}
  else if('escQtd' in t.dataset){definirQtd(t.dataset.escQtd,q);listaEscolha();rodapeEscolha()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.classList&&e.target.classList.contains('qtd')){e.preventDefault();e.target.blur()}});
document.addEventListener('focusin',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('qtd')){t.select();t.dataset.ini=t.value}});
// Trocou de marca no pedido: os itens eram da outra marca
document.addEventListener('change',e=>{if(e.target&&e.target.name==='marca'&&e.target.closest('#pMarca')){if(itensForm.length){itensForm=[];toast('Os itens eram da outra marca e foram tirados')}renderItensForm()}});

// ---------- escolher produtos (tela por cima do pedido) ----------
function abrirEscolha(){const mid=marcaForm();if(!mid)return toast('Escolha a marca primeiro');escBusca='';escLimite=60;lojaAberta=null;renderEscolha();mostrarSheet()}
function renderEscolha(){
  const sh=$('#sheet'),mid=marcaForm(),m=marca(mid),ps=prodDaMarca(mid);sh.dataset.tipo='escolher';sh.setAttribute('aria-label','Escolher produtos');
  sh.innerHTML=topoSheet(`Produtos da ${esc(m?m.nome:'marca')}`,ps.length?`${ps.length} no catálogo · toque em + para pôr no pedido`:'Catálogo vazio')+`<div class="sh-body" style="padding-top:var(--s3);padding-bottom:0">
    ${ps.length?`<div class="cat-ferr"><input class="search" id="escBusca" type="search" placeholder="Buscar produto" autocomplete="off" aria-label="Buscar produto"><button type="button" class="chipbtn esc-novo" data-esc-novo>+ Novo produto</button></div><div id="escLista"></div>`
      :`<p class="empty">Ainda não tem produtos da ${esc(m?m.nome:'marca')}. Cadastre com foto e preço, ou importe a planilha da marca.</p><button class="btn" data-esc-novo>Cadastrar produto</button><button class="btn ghost" data-cat-importar>Importar planilha</button>`}
    <div class="esc-rodape" id="escRodape"></div></div>`;
  listaEscolha();rodapeEscolha();
}
function listaEscolha(){
  const el=$('#escLista');if(!el)return;const q=norm(escBusca.trim()),qt=new Map(itensForm.map(i=>[i.p,i.qtd]));
  const ls=prodDaMarca(marcaForm()).filter(x=>!q||norm(x.ref+' '+x.nome).includes(q)).sort((a,b)=>a.nome.localeCompare(b.nome));
  el.innerHTML=ls.length?`<div class="list">${ls.slice(0,escLimite).map(x=>`<div class="ped${qt.get(x.id)?' com-passo':''}">${thumb(x)}<div class="grow"><div class="t">${esc(x.nome)}</div><div class="s">${[x.ref&&'Ref. '+esc(x.ref),x.preco?precoBR(x.preco)+(unCurta(x.un)?' / '+unCurta(x.un):''):'sem preço'].filter(Boolean).join(' · ')}</div></div>${qt.get(x.id)?passo(qt.get(x.id),`data-esc-menos="${esc(x.id)}"`,`data-esc-mais="${esc(x.id)}"`,`data-esc-qtd="${esc(x.id)}"`):`<button type="button" class="chipbtn" data-esc-mais="${esc(x.id)}" aria-label="Pôr ${esc(x.nome)} no pedido">+ Pôr</button>`}</div>`).join('')}</div>${ls.length>escLimite?`<button class="btn ghost" data-esc-maislista>Mostrar mais (${ls.length-escLimite})</button>`:''}`
    :'<p class="empty">Nenhum produto encontrado.</p>';
}
function rodapeEscolha(){const r=$('#escRodape');if(!r)return;
  r.innerHTML=`<div class="grow"><div class="t">${itensForm.length?resumoItens(itensForm):'Nada escolhido'}</div><div class="s num">${precoBR(totalItens(itensForm))}</div></div><button type="button" class="btn" data-esc-pronto style="width:auto;margin:0;padding:0 var(--s4)">Pronto</button>`}

// ---------- cópia do pedido para o cliente (imagens para o WhatsApp) ----------
const cacheFoto=new Map();
// Foto pronta para desenhar (sem bloqueio de CORS). Se veio de um link de fora, guarda uma cópia na conta.
function fotoParaDesenho(i){
  const u=fotoDoItem(i);if(!u)return Promise.resolve(null);
  if(!cacheFoto.has(u))cacheFoto.set(u,(async()=>{
    try{
      if(u.startsWith('data:'))return await imgDe(u);
      const b=await baixarImagem(u),o=URL.createObjectURL(b),img=await imgDe(o);
      const p=produto(i.p);if(p&&p.foto===u&&!fotoDaConta(u)&&naConta())guardarFoto(b,p.id).then(n=>{if(/^https?:/.test(n)&&p.foto===u){p.foto=n;salvar()}}).catch(()=>{});
      return img;
    }catch(e){return null}
  })());
  return cacheFoto.get(u);
}
function linhasTexto(c,t,max,lin){const ws=String(t).split(/\s+/),out=[];let cur='';
  for(const w of ws){const tt=cur?cur+' '+w:w;if(c.measureText(tt).width<=max)cur=tt;else{if(cur)out.push(cur);cur=w}if(out.length===lin)break}
  if(out.length<lin&&cur)out.push(cur);
  if(out.length===lin&&ws.join(' ')!==out.join(' ')){let l=out[lin-1];while(l&&c.measureText(l+'…').width>max)l=l.slice(0,-1);out[lin-1]=l+'…'}
  return out.slice(0,lin)}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
async function desenharPaginas(d){
  const POR=8,W=1080,P=64,LH=208,FT='"Schibsted Grotesk",system-ui,-apple-system,sans-serif',pags=[];
  try{await document.fonts.load('700 32px "Schibsted Grotesk"')}catch(e){}
  const fotos=await Promise.all(d.itens.map(fotoParaDesenho));
  const total=Math.max(1,Math.ceil(d.itens.length/POR));
  for(let pg=0;pg<total;pg++){
    const its=d.itens.slice(pg*POR,pg*POR+POR),ult=pg===total-1,topo=P+232,H=topo+its.length*LH+(ult?200:120)+P;
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
    c.fillStyle='#fff';c.fillRect(0,0,W,H);c.textBaseline='alphabetic';
    c.fillStyle=d.cor;rr(c,P,P,16,16,8);c.fill();
    c.fillStyle='#646A8A';c.font=`600 28px ${FT}`;c.fillText(`PEDIDO · ${d.marca.toUpperCase()}`.slice(0,48),P+32,P+16);
    c.textAlign='right';c.fillText(d.data+(total>1?`  ·  ${pg+1}/${total}`:''),W-P,P+16);c.textAlign='left';
    c.fillStyle='#141833';c.font=`800 52px ${FT}`;linhasTexto(c,d.loja,W-2*P,1).forEach((l,k)=>c.fillText(l,P,P+88+k*60));
    c.fillStyle='#646A8A';c.font=`500 30px ${FT}`;c.fillText([d.cidade,d.rep&&'Representante: '+d.rep].filter(Boolean).join('  ·  ').slice(0,70),P,P+136);
    c.fillStyle='#E2E4EE';c.fillRect(P,topo-40,W-2*P,2);
    its.forEach((i,k)=>{const y=topo+k*LH,img=fotos[pg*POR+k],S=176;
      c.save();rr(c,P,y,S,S,20);c.clip();c.fillStyle='#F2F3F7';c.fillRect(P,y,S,S);
      if(img){const s=Math.min(S/img.width,S/img.height),w=img.width*s,h=img.height*s;c.drawImage(img,P+(S-w)/2,y+(S-h)/2,w,h)}
      else{c.fillStyle='#9AA0BC';c.font=`700 48px ${FT}`;c.textAlign='center';c.fillText(iniciais(i.nome),P+S/2,y+S/2+16);c.textAlign='left'}
      c.restore();
      const tx=P+S+32,tw=W-P-tx;
      c.fillStyle='#141833';c.font=`700 34px ${FT}`;const ln=linhasTexto(c,i.nome,tw,2);ln.forEach((l,j)=>c.fillText(l,tx,y+40+j*42));
      let yy=y+40+ln.length*42;c.fillStyle='#646A8A';c.font=`500 28px ${FT}`;if(i.ref){c.fillText(('Ref. '+i.ref).slice(0,40),tx,yy);yy+=40}
      c.fillStyle='#141833';c.font=`600 30px ${FT}`;c.fillText(`${qtdBR(i.qtd)}${unCurta(i.un)?' '+unCurta(i.un):''} × ${precoBR(i.preco)}`,tx,y+S-8);
      c.font=`800 32px ${FT}`;c.textAlign='right';c.fillText(precoBR(i.qtd*i.preco),W-P,y+S-8);c.textAlign='left';
      if(k<its.length-1){c.fillStyle='#E2E4EE';c.fillRect(tx,y+LH-16,W-P-tx,2)}});
    const yf=topo+its.length*LH;
    c.fillStyle='#E2E4EE';c.fillRect(P,yf,W-2*P,2);
    if(ult){c.fillStyle='#646A8A';c.font=`600 30px ${FT}`;c.fillText(`${resumoItens(d.itens)}${new Set(d.itens.map(i=>i.un||'un')).size===1?` · ${d.itens.length} ${d.itens.length===1?'produto':'produtos'}`:''}`,P,yf+72);
      c.fillStyle='#141833';c.font=`800 56px ${FT}`;c.textAlign='right';c.fillText(precoBR(d.total),W-P,yf+80);c.textAlign='left';
      c.fillStyle='#646A8A';c.font=`500 26px ${FT}`;c.fillText('Total do pedido',P,yf+120)}
    else{c.fillStyle='#646A8A';c.font=`500 28px ${FT}`;c.fillText('continua na próxima imagem…',P,yf+64)}
    c.fillStyle='#9AA0BC';c.font=`500 22px ${FT}`;c.textAlign='right';c.fillText('Feito com Rota Comercial',W-P,H-P/2);c.textAlign='left';
    pags.push(await new Promise(ok=>cv.toBlob(ok,'image/jpeg',.9)));
  }
  return pags;
}
function dadosCopia(){
  const l=loja($('#pLoja').value),m=marca(marcaForm()),ds=$('#pData').value||isoD(HOJE);
  const itens=itensForm.map(i=>({...i})),d={loja:l?l.nome:'Cliente',cidade:l?`${l.cidade}/${l.uf}`:'',marca:m?m.nome:'',cor:m?m.cor:'#3346D3',data:deIso(ds).toLocaleDateString('pt-BR'),rep:NOME||'',itens,pecas:pecas(itens),total:totalItens(itens)};
  d.texto=`*Pedido ${d.marca}* · ${d.loja}\n${d.data}\n\n`+itens.map(i=>`${qtdBR(i.qtd)}${unCurta(i.un)?' '+unCurta(i.un):''} × ${i.nome}${i.ref?` (ref. ${i.ref})`:''} · ${precoBR(i.preco)} = ${precoBR(i.qtd*i.preco)}`).join('\n')+`\n\n*Total: ${precoBR(d.total)}* (${resumoItens(itens)})`;
  return d;
}
const nomeArq=t=>norm(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'pedido';
async function prepararCopia(btn){
  if(!itensForm.length)return;btn.disabled=true;btn.textContent='Preparando as imagens…';
  try{
    const d=dadosCopia(),pags=await desenharPaginas(d);
    const files=pags.map((b,i)=>new File([b],`pedido-${nomeArq(d.loja)}${pags.length>1?'-'+(i+1):''}.jpg`,{type:'image/jpeg'}));
    copiaPronta={files,texto:d.texto,urls:pags.map(b=>URL.createObjectURL(b))};
    const semFoto=d.itens.filter(i=>!fotoDoItem(i)).length;
    $('#copiaBox').innerHTML=`<div class="copia"><div class="copia-prev">${copiaPronta.urls.map((u,i)=>`<img src="${u}" alt="Imagem ${i+1} do pedido">`).join('')}</div>
      ${semFoto?`<p class="s" style="margin:var(--s2) 0 0">${semFoto} ${semFoto===1?'produto está':'produtos estão'} sem foto no catálogo.</p>`:''}
      <button type="button" class="btn" data-copia-enviar>${navigator.canShare&&navigator.canShare({files})?'Enviar no WhatsApp ou outro app':'Baixar as imagens'}</button>
      <button type="button" class="btn ghost" data-copia-texto>Copiar o pedido em texto</button></div>`;
    $('#copiaBox').scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(e){console.warn(e);toast('Não consegui montar as imagens. Tente de novo.')}
  btn.disabled=false;btn.textContent='Enviar ao cliente';
}
async function enviarCopia(){
  const c=copiaPronta;if(!c)return;
  if(navigator.canShare&&navigator.canShare({files:c.files})){
    try{await navigator.share({files:c.files,title:'Pedido',text:c.texto})}
    catch(e){if(e&&e.name==='AbortError')return;try{await navigator.share({files:c.files})}catch(e2){if(!e2||e2.name!=='AbortError')toast('Não deu para compartilhar. Tente baixar as imagens.')}}
    return;
  }
  c.files.forEach((f,i)=>setTimeout(()=>{const a=document.createElement('a');a.href=c.urls[i];a.download=f.name;document.body.appendChild(a);a.click();a.remove()},i*400));
  try{await navigator.clipboard.writeText(c.texto);toast('Imagens baixadas. O pedido em texto também foi copiado.')}catch(e){toast('Imagens baixadas')}
}

// ---------- importar catálogo por planilha (usa a tela de importação) ----------
function conferirProdutos(){
  if(plan.mapa.produto==null)return toast('Escolha a coluna do nome do produto');
  const padrao=plan.marcaPadrao.trim();
  if(plan.mapa.marca==null&&!padrao)return toast('Escolha a marca desses produtos');
  const porNome=new Map(MARCAS.map(m=>[norm(m.nome),m])),chave=(mid,ref,nome)=>mid+'|'+(norm(ref)||'#'+norm(nome));
  const exist=new Map(PRODUTOS.map(x=>[chave(x.marca,x.ref,x.nome),x])),vistos=new Set();
  const r={novos:[],atual:[],iguais:0,semMarca:new Map(),ignoradas:0,comFoto:0};
  for(const l of plan.dados){
    if(linhaDeTotal(l)){r.ignoradas++;continue}
    const nome=String(celula(l,'produto')??'').trim();if(!nome){r.ignoradas++;continue}
    const mn=String(celula(l,'marca')??'').trim()||padrao,m=porNome.get(norm(mn));
    if(!m){r.semMarca.set(mn||'(sem marca)',(r.semMarca.get(mn||'(sem marca)')||0)+1);continue}
    const ref=String(celula(l,'ref')??'').trim().slice(0,60),p=valorPlan(celula(l,'preco')),f=String(celula(l,'foto')??'').trim().split(/[\s,;|]+/)[0];
    const k=chave(m.id,ref,nome);if(vistos.has(k)){r.ignoradas++;continue}vistos.add(k);
    const un=unOk(celula(l,'unidade')),x={marca:m.id,ref,nome:nome.slice(0,160),preco:p>0?Math.round(p*100)/100:0,foto:/^https?:\/\/\S{4,}$/i.test(f)&&f.length<=590?f:'',...(un&&un!=='un'?{un}:{})};if(x.foto)r.comFoto++;
    const e=exist.get(k);
    if(e){const mud={};if(x.preco&&x.preco!==e.preco)mud.preco=x.preco;if(x.foto&&x.foto!==e.foto&&!fotoDaConta(e.foto))mud.foto=x.foto;if(x.nome!==e.nome)mud.nome=x.nome;if(x.un&&x.un!==e.un)mud.un=x.un;Object.keys(mud).length?r.atual.push([e,mud]):r.iguais++}
    else r.novos.push(x);
  }
  plan.prodRes=r;plan.conferida=true;renderAjustes();
  requestAnimationFrame(()=>{const el=$('#prodRes');if(el)el.scrollIntoView({block:'nearest',behavior:'smooth'})});
}
function blocoProdutosPlan(){
  const r=plan&&plan.prodRes;if(!r||!plan.conferida)return'';const n=r.novos.length+r.atual.length;
  return `<div id="prodRes"><div class="imp-resumo"><div><b>${r.novos.length}</b><span>novos</span></div><div><b>${r.atual.length}</b><span>com preço ou foto novos</span></div><div><b>${r.iguais}</b><span>já estavam iguais</span></div></div>
    ${r.semMarca.size?`<p class="s" style="color:var(--warn);margin:var(--s2) 0 0">${[...r.semMarca].map(([k,v])=>`${v} de "${esc(k)}"`).join(', ')} ficaram de fora: essa marca não está cadastrada. Cadastre em Marcas e confira de novo.</p>`:''}
    ${r.comFoto?`<p class="s" style="margin:var(--s2) 0 0">${r.comFoto} com link de foto. As fotos aparecem direto do site da marca.</p>`:''}
    ${n?`<button class="btn" data-plan-salvar-prod>Salvar ${n} no catálogo</button>`:'<p class="s" style="margin:var(--s2) 0 0">Nada novo para salvar.</p>'}</div>`;
}
function salvarProdutosPlan(){
  const r=plan&&plan.prodRes;if(!r)return;
  r.novos.forEach(x=>PRODUTOS.push({id:novoIdProd(),...x}));r.atual.forEach(([e,m])=>Object.assign(e,m));
  const n=r.novos.length+r.atual.length,mid=r.novos[0]&&r.novos[0].marca;plan=null;salvar();renderItensForm();
  if(typeof renderProdutos==='function')renderProdutos();abrirCatalogo(mid);toast(`${n} ${n===1?'produto salvo':'produtos salvos'} no catálogo`);
}

// ---------- exemplo: alguns produtos com desenho no lugar da foto ----------
function produtosExemplo(){
  const svg=(cor,forma)=>'data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#F2F3F7"/><path d="${forma}" fill="${cor}"/></svg>`);
  const VEST='M96 40h48l8 28 36 112c2 8-4 16-12 16H64c-8 0-14-8-12-16l36-112z',BLUSA='M80 52l24-12h32l24 12 40 28-16 28-20-10v104H76V98l-20 10-16-28z',
    FRASCO='M100 36h40v28l16 16v124c0 8-6 12-12 12H96c-6 0-12-4-12-12V80l16-16z',POTE='M64 72h112v8l-8 116c0 8-6 12-12 12H84c-6 0-12-4-12-12L64 80z M72 52h96v20H72z',
    CAIXA='M48 84l72-36 72 36v88l-72 36-72-36z',FURADEIRA='M40 80h112l32 16v24l-32 16H120l-12 64H76l12-64H40z',CHAVE='M60 176l84-84a32 32 0 1 1 20 20l-84 84z';
  return[['mare','MA-1021','Vestido longo de linho',189.9,'#14A0A8',VEST],['mare','MA-1102','Blusa de alcinha',79.9,'#F5A524',BLUSA],
    ['urb','UF-550','Furadeira de impacto 650 W',289.9,'#2F6FED',FURADEIRA],['urb','UF-561','Jogo de chaves combinadas',129.9,'#24479E',CHAVE],['urb','UF-610','Caixa organizadora',59.9,'#7FA6F5',CAIXA],
    ['flor','FL-301','Shampoo hidratante 300 ml',32.9,'#DB2777',FRASCO],['flor','FL-322','Creme para as mãos',24.9,'#8B5CF6',POTE],
    ['kids','SA-12','Café torrado 500 g',18.9,'#B45309',CAIXA],['kids','SA-40','Doce de leite 400 g',12.5,'#16A34A',POTE]]
    .map(([marca,ref,nome,preco,cor,f],i)=>({id:'pe'+i,marca,ref,nome,preco,foto:svg(cor,f)}));
}

// ---------- cliques ----------
document.addEventListener('input',e=>{const t=e.target;if(!t)return;
  if(t.id==='catBusca'){catBusca=t.value;catLimite=60;listaCatalogo()}
  else if(t.id==='escBusca'){escBusca=t.value;escLimite=60;listaEscolha()}});
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-cat-abrir],[data-cat-marca],[data-cat-novo],[data-cat-edit],[data-cat-mais],[data-cat-importar],[data-pr-colar],[data-pr-google],[data-pr-buscar],[data-pr-escolher],[data-pr-sem-foto],[data-pr-excluir],[data-pr-voltar],[data-esc-abrir],[data-esc-novo],[data-esc-mais],[data-esc-menos],[data-esc-maislista],[data-esc-pronto],[data-it-mais],[data-it-menos],[data-copia-cliente],[data-copia-enviar],[data-copia-texto],[data-plan-salvar-prod]');
  if(!t)return;const d=t.dataset;
  if('catAbrir' in d)abrirCatalogo(d.catAbrir||null);
  else if('catMarca' in d){catMarca=d.catMarca;catLimite=60;renderCatalogo()}
  else if('catNovo' in d){if(d.catNovo)catMarca=d.catNovo;catEdit='novo';catFoto=null;renderCatalogo();if(!$('#sheet').classList.contains('on'))mostrarSheet();$('#sheet').scrollTop=0}
  else if('catEdit' in d){catEdit=d.catEdit;catFoto=null;renderCatalogo();$('#sheet').scrollTop=0}
  else if('catMais' in d){catLimite+=120;listaCatalogo()}
  else if('catImportar' in d)abrirImportProd();
  else if('prColar' in d)colarImagem();
  else if('prGoogle' in d)buscarNoGoogle();
  else if('prBuscar' in d)buscarFotos();
  else if('prEscolher' in d)escolherFotoBusca(+d.prEscolher);
  else if('prSemFoto' in d){catFoto={tipo:'remover'};$('#prLink').value='';verFoto('');t.remove()}
  else if('prExcluir' in d)excluirProduto(t);
  else if('prVoltar' in d){catEdit=null;catFoto=null;depoisDeEditar()}
  else if('escAbrir' in d)abrirEscolha();
  else if('escNovo' in d){catOrigem='escolha';catMarca=marcaForm()||catMarca;catEdit='novo';catFoto=null;renderCatalogo();$('#sheet').scrollTop=0}
  else if('escMais' in d){mudarQtd(d.escMais,1);listaEscolha();rodapeEscolha()}
  else if('escMenos' in d){mudarQtd(d.escMenos,-1);listaEscolha();rodapeEscolha()}
  else if('escMaislista' in d){escLimite+=120;listaEscolha()}
  else if('escPronto' in d){fecharLoja();const b=$('#pItensBox');if(b&&itensForm.length)b.scrollIntoView({block:'nearest',behavior:'smooth'})}
  else if('itMais' in d){const i=itensForm[+d.itMais];if(i){i.qtd=Math.min(99999,i.qtd+1);itensMudaram()}}
  else if('itMenos' in d){const i=itensForm[+d.itMenos];if(i){i.qtd--;if(i.qtd<1)itensForm.splice(+d.itMenos,1);itensMudaram()}}
  else if('copiaCliente' in d)prepararCopia(t);
  else if('copiaEnviar' in d)enviarCopia();
  else if('copiaTexto' in d){if(copiaPronta)copiar(copiaPronta.texto,'Pedido copiado. Cole no WhatsApp do cliente.')}
  else if('planSalvarProd' in d)salvarProdutosPlan();
});
