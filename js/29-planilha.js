// ---------- importar planilhas de outros apps (.xlsx, .csv, tabela colada) ----------
// Lê o arquivo no próprio aparelho (nada é enviado para fora), acha o cabeçalho, liga as colunas aos campos do app
// e entrega uma lista de lançamentos para o mesmo conferidor da importação de relatórios (17-importar.js).

// ---- leitura ----
function decodificarTexto(buf){
  const b=new Uint8Array(buf);let t;
  try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){t=new TextDecoder('windows-1252').decode(b)} // planilhas salvas no Excel do Windows
  return t.replace(/^﻿/,'');
}
function separadorCsv(txt){
  const linhas=txt.split(/\r?\n/).filter(l=>l.trim()).slice(0,8);
  let melhor=',',nota=-1;
  for(const s of [';','\t',',','|']){
    const c=linhas.map(l=>{let n=0,q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===s&&!q)n++}return n});
    const iguais=c.filter(n=>n===c[0]).length,nt=c[0]>0?c[0]*10+iguais:0;
    if(nt>nota){nota=nt;melhor=s}
  }
  return melhor;
}
function lerCsv(txt){
  const s=separadorCsv(txt),linhas=[];let campo='',linha=[],q=false;
  for(let i=0;i<txt.length;i++){
    const ch=txt[i];
    if(q){if(ch==='"'){if(txt[i+1]==='"'){campo+='"';i++}else q=false}else campo+=ch}
    else if(ch==='"'&&campo==='')q=true;
    else if(ch===s){linha.push(campo);campo=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;linha.push(campo);linhas.push(linha);linha=[];campo=''}
    else campo+=ch;
  }
  if(campo!==''||linha.length){linha.push(campo);linhas.push(linha)}
  return linhas.map(l=>l.map(c=>c.trim())).filter(l=>l.some(Boolean));
}
const pareceTabelaTexto=t=>{t=String(t||'').trim();if(!t||/^[\[{<`]/.test(t))return false;const l=t.split(/\r?\n/).filter(x=>x.trim());return l.length>=2&&/[\t;]|,.*,/.test(l[0])};

// .xlsx é um zip com XML dentro: abre com o descompactador do próprio navegador
async function lerXlsx(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf);
  let fim=-1;for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--)if(dv.getUint32(i,true)===0x06054b50){fim=i;break}
  if(fim<0)throw new Error('O arquivo não parece ser um Excel .xlsx válido');
  const total=dv.getUint16(fim+10,true);let p=dv.getUint32(fim+16,true);const arq={};
  for(let n=0;n<total;n++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const metodo=dv.getUint16(p+10,true),tam=dv.getUint32(p+20,true),ln=dv.getUint16(p+28,true),le=dv.getUint16(p+30,true),lc=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    arq[new TextDecoder().decode(u8.subarray(p+46,p+46+ln))]={metodo,tam,off};p+=46+ln+le+lc;
  }
  const abrir=async nome=>{
    const e=arq[nome]||arq[Object.keys(arq).find(k=>k.toLowerCase()===nome.toLowerCase())];if(!e)return null;
    const ini=e.off+30+dv.getUint16(e.off+26,true)+dv.getUint16(e.off+28,true),dados=u8.subarray(ini,ini+e.tam);
    if(e.metodo===0)return new TextDecoder().decode(dados);
    if(e.metodo!==8||typeof DecompressionStream==='undefined')throw new Error('Este navegador não abre .xlsx. Salve a planilha como .csv e tente de novo.');
    const st=new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(st).text();
  };
  // imagens guardadas no .xlsx (fotos dos produtos)
  const abrirBin=async nome=>{
    const e=arq[nome];if(!e)return null;
    const ini=e.off+30+dv.getUint16(e.off+26,true)+dv.getUint16(e.off+28,true),dados=u8.subarray(ini,ini+e.tam),ext=(nome.split('.').pop()||'').toLowerCase();
    const tipo={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp'}[ext]||'';
    if(e.metodo===0)return new Blob([dados],{type:tipo});
    const b=await new Response(new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();return new Blob([b],{type:tipo});
  };
  const resolver=(dir,alvo)=>{if(!alvo)return'';if(alvo.startsWith('/'))return alvo.slice(1);const o=[];for(const s of (dir+alvo).split('/')){if(s==='..')o.pop();else if(s&&s!=='.')o.push(s)}return o.join('/')};
  const relsDe=async cam=>{const dir=cam.replace(/[^/]+$/,''),t=await abrir(dir+'_rels/'+cam.slice(dir.length)+'.rels'),m={};if(t)tags(xml(t),'Relationship').forEach(r=>m[r.getAttribute('Id')]=resolver(dir,r.getAttribute('Target')));return m};
  const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships',relId=(el,n)=>el&&(el.getAttribute('r:'+n)||el.getAttributeNS(RNS,n));
  const imagemOk=c=>/\.(png|jpe?g|gif|webp|bmp)$/i.test(c||'');
  let rich=null;
  const fotoNaCelula=async vm=>{ // imagem colocada dentro da célula (Excel 365)
    if(!rich){rich={rv:[],rel:[],rels:{},vm:[],fut:[]};const rv=await abrir('xl/richData/rdrichvalue.xml');if(rv){rich.rv=tags(xml(rv),'rv');
      const rl=await abrir('xl/richData/richValueRel.xml');if(rl)rich.rel=tags(xml(rl),'rel').map(r=>relId(r,'id'));rich.rels=await relsDe('xl/richData/richValueRel.xml');
      const md=await abrir('xl/metadata.xml');if(md){const d=xml(md),vmb=tags(d,'valueMetadata')[0],fb=tags(d,'futureMetadata')[0];rich.vm=vmb?tags(vmb,'bk'):[];rich.fut=fb?tags(fb,'bk'):[]}}}
    let i=vm-1;try{const rc=tags(rich.vm[vm-1],'rc')[0],f=rich.fut[+rc.getAttribute('v')],rvb=f&&tags(f,'rvb')[0];if(rvb)i=+rvb.getAttribute('i')}catch(e){}
    const r=rich.rv[i],v=r&&tags(r,'v')[0];if(!v)return'';const cam=rich.rels[rich.rel[+v.textContent]];return imagemOk(cam)?cam:'';
  };
  const xml=s=>new DOMParser().parseFromString(s,'application/xml'),tags=(d,n)=>d?[...d.getElementsByTagNameNS('*',n)]:[];
  const wb=await abrir('xl/workbook.xml');if(!wb)throw new Error('O arquivo não parece ser um Excel .xlsx válido');
  const rels=xml(await abrir('xl/_rels/workbook.xml.rels')||'<r/>'),alvo={};
  tags(rels,'Relationship').forEach(r=>alvo[r.getAttribute('Id')]=r.getAttribute('Target'));
  const ss=await abrir('xl/sharedStrings.xml'),comp=ss?tags(xml(ss),'si').map(si=>tags(si,'t').map(t=>t.textContent).join('')):[];
  const col=ref=>{let n=0;for(const ch of ref.replace(/\d+/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
  const abas=[];
  for(const sh of tags(xml(wb),'sheet')){
    const rid=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let caminho=alvo[rid]||'';caminho=caminho.replace(/^\/?xl\//,'').replace(/^\//,'');if(!caminho)continue;
    const txt=await abrir('xl/'+caminho);if(!txt)continue;
    const linhas=[],dsh=xml(txt),fotos={},vms={};
    for(const row of tags(dsh,'row')){
      const lin=[];
      for(const c of tags(row,'c')){
        const ref=c.getAttribute('r'),i=ref?col(ref):lin.length,t=c.getAttribute('t'),v=tags(c,'v')[0];
        if(c.getAttribute('vm')&&!vms[+(row.getAttribute('r'))-1])vms[+(row.getAttribute('r'))-1]=+c.getAttribute('vm');
        let val='';
        if(t==='s')val=comp[+(v&&v.textContent)]??'';
        else if(t==='inlineStr')val=tags(c,'t').map(x=>x.textContent).join('');
        else if(t==='b')val=v&&v.textContent==='1'?'sim':'não';
        else if(v){const s=v.textContent;val=t==='str'||t==='e'||isNaN(+s)?s:+s}
        lin[i]=val;
      }
      for(let i=0;i<lin.length;i++)if(lin[i]==null)lin[i]='';
      const r=+(row.getAttribute('r'))-1;
      if(lin.some(x=>x!==''&&x!=null))linhas[Number.isFinite(r)&&r>=0?r:linhas.length]=lin;
    }
    // fotos sobre as células (desenho da aba): a foto vale para a linha onde começa
    try{const dr=tags(dsh,'drawing')[0];if(dr){const sr=await relsDe('xl/'+caminho),dcam=sr[relId(dr,'id')],dt=dcam&&await abrir(dcam);
      if(dt){const drr=await relsDe(dcam),dd=xml(dt);
        for(const a of [...tags(dd,'twoCellAnchor'),...tags(dd,'oneCellAnchor')]){const fr=tags(a,'from')[0],bl=tags(a,'blip')[0];if(!fr||!bl)continue;
          const r=+tags(fr,'row')[0].textContent,c=+tags(fr,'col')[0].textContent,cam=drr[relId(bl,'embed')];
          if(imagemOk(cam)&&(!fotos[r]||c<fotos[r].c))fotos[r]={c,cam}}}}}catch(e){console.warn('Fotos da planilha',e)}
    for(const [r,vm] of Object.entries(vms))if(!fotos[r]){try{const cam=await fotoNaCelula(vm);if(cam)fotos[r]={c:0,cam}}catch(e){}}
    let nFotos=0;for(const [r,f] of Object.entries(fotos))if(linhas[r]){linhas[r]._foto=()=>abrirBin(f.cam);nFotos++}
    abas.push({nome:sh.getAttribute('name')||'Planilha',nFotos,linhas:linhas.filter(Boolean).map(l=>{const n=l.map(x=>typeof x==='string'?x.trim():x);if(l._foto)n._foto=l._foto;return n})});
  }
  if(!abas.length)throw new Error('Não achei nenhuma aba com dados nessa planilha');
  return abas;
}
function tabelasDoHtml(t){
  const doc=new DOMParser().parseFromString(t,'text/html');
  return [...doc.querySelectorAll('table')].map((tb,i)=>({nome:'Tabela '+(i+1),linhas:[...tb.querySelectorAll('tr')].map(r=>[...r.children].map(c=>c.textContent.trim())).filter(l=>l.some(Boolean))})).filter(a=>a.linhas.length>=2);
}

// ---- campos do app e nomes de coluna que cada app costuma usar ----
const CAMPOS_PLAN=[
  {k:'loja',t:'Loja / cliente',sin:['nome fantasia','fantasia','loja','cliente','nome do cliente','cliente nome','nome cliente','razao social','razao','comprador','estabelecimento','empresa cliente','nome']},
  {k:'cidade',t:'Cidade',sin:['cidade','municipio','cidade cliente','cidade do cliente','localidade']},
  {k:'uf',t:'Estado (UF)',sin:['uf','estado','uf cliente','sigla uf','est']},
  {k:'marca',t:'Marca / representada',sin:['marca','representada','fabrica','industria','fornecedor','empresa representada','fabricante','grife']},
  {k:'data',t:'Data',sin:['data','data do pedido','data pedido','emissao','data de emissao','data emissao','dt emissao','dt pedido','data da venda','data venda','criado em','data de criacao','dt']},
  {k:'valor',t:'Valor (real)',sin:['valor total','total do pedido','valor do pedido','valor liquido','total liquido','valor','total','vlr total','vl total','valor faturado','faturado','valor final']},
  {k:'previsto',t:'Valor previsto',sin:['previsto','valor previsto','previsao','estimativa','valor estimado','meta pedido']},
  {k:'colecao',t:'Coleção',sin:['colecao','temporada','estacao','linha','campanha']},
  {k:'pago',t:'Comissão paga?',sin:['pago','comissao paga','status comissao','situacao comissao','recebido','status pagamento','pagamento']},
  {k:'status',t:'Situação do pedido',sin:['status','situacao','status do pedido','situacao do pedido','etapa']},
  {k:'comissao',t:'Comissão (%)',sin:['% comissao','comissao %','percentual comissao','perc comissao','comissao','taxa comissao','% com']},
  {k:'regiao',t:'Região',sin:['regiao','rota','zona','territorio']},
  {k:'categoria',t:'Categoria (despesa)',sin:['categoria','tipo de despesa','tipo despesa','conta','natureza']},
  {k:'descricao',t:'Descrição (despesa)',sin:['descricao','historico','observacao','obs','detalhe','item']},
  {k:'ref',t:'Referência / código',sin:['referencia','ref','codigo','cod','sku','codigo do produto','cod produto','codigo produto','ref produto','referencia do produto','modelo','artigo','cod ref','codigo referencia']},
  {k:'produto',t:'Nome do produto',sin:['produto','nome do produto','descricao do produto','descricao produto','nome produto','descricao','item','nome','titulo','title']},
  {k:'preco',t:'Preço',sin:['preco','preco unitario','preco de venda','preco venda','valor unitario','vlr unitario','vl unitario','preco tabela','preco de tabela','preco atacado','preco lojista','valor','price']},
  {k:'foto',t:'Foto (link da imagem)',sin:['imagem','foto','url imagem','link imagem','url da imagem','link da imagem','link da foto','url foto','link foto','imagem url','image','image url','image link','picture','url']},
];
const CAMPOS_PROD=['ref','produto','preco','foto','marca'],CAMPOS_GERAIS=CAMPOS_PLAN.map(f=>f.k).filter(k=>!['ref','produto','preco','foto'].includes(k));
const USADOS_POR_TIPO={produto:['ref','produto','preco','foto','marca'],pedido:['loja','cidade','uf','marca','data','valor','previsto','colecao','pago','status','comissao','regiao'],loja:['loja','cidade','uf','marca','regiao'],despesa:['data','valor','categoria','descricao']};
const OBRIG={produto:['produto'],pedido:['loja','data','valor'],loja:['loja'],despesa:['data','valor']};
const normCab=s=>norm(String(s||'')).replace(/[^a-z0-9% ]/g,' ').replace(/\s+/g,' ').trim();

function acharCabecalho(linhas){
  let melhor=0,nota=0;
  linhas.slice(0,15).forEach((l,i)=>{
    const n=l.filter(c=>{const h=normCab(c);return h&&CAMPOS_PLAN.some(f=>f.sin.includes(h))}).length;
    if(n>nota){nota=n;melhor=i}
  });
  return nota>=2?melhor:0;
}
function mapearColunas(cab,ks){
  const h=cab.map(normCab),mapa={},usadas=new Set(),CAMPOS=ks?CAMPOS_PLAN.filter(f=>ks.includes(f.k)):CAMPOS_PLAN;
  // 1º nomes exatos, na ordem de preferência de cada campo; 2º nomes que contêm a palavra
  for(const passo of ['igual','contem'])for(const f of CAMPOS){
    if(mapa[f.k]!=null)continue;
    for(const s of f.sin){
      const i=h.findIndex((x,j)=>!usadas.has(j)&&x&&(passo==='igual'?x===s:(s.length>3&&(x.includes(s)||(x.length>3&&s.includes(x))))));
      if(i>=0){mapa[f.k]=i;usadas.add(i);break}
    }
  }
  // "comissão" sozinha às vezes é o valor da comissão em R$, não o %: só usa se parecer porcentagem depois (ver taxasSugeridas)
  return mapa;
}
function adivinharTipo(m,mp){
  if(mp&&m.data==null&&m.cidade==null&&mp.produto!=null&&(mp.preco!=null||mp.foto!=null)&&(mp.ref!=null||mp.foto!=null||m.loja==null))return'produto';
  if(m.valor!=null&&m.loja!=null)return'pedido';
  if(m.valor!=null&&(m.categoria!=null||m.descricao!=null))return'despesa';
  if(m.loja!=null)return'loja';
  return'pedido';
}

// ---- leitura de valores ----
function valorPlan(v){
  if(typeof v==='number')return v;
  let s=String(v||'').replace(/[R$\s ]/g,'').replace(/^\((.*)\)$/,'-$1');if(!s)return NaN;
  const v1=s.lastIndexOf(','),p1=s.lastIndexOf('.');
  if(v1>=0&&p1>=0)s=v1>p1?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(v1>=0)s=/^-?\d{1,3}(,\d{3})+$/.test(s)&&!/,\d{1,2}$/.test(s)?s.replace(/,/g,''):s.replace(',','.');
  else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  return parseFloat(s);
}
function dataPlan(v){
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
  const s=String(v||'').trim();let m;
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  if((m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})\b/))){const a=m[3].length===2?'20'+m[3]:m[3];return `${a}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}
  if(/^\d{5}(\.\d+)?$/.test(s))return dataPlan(+s);
  return s;
}
const dataBR=v=>{const s=dataPlan(v),m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(s||'')};
const linhaDeTotal=l=>l.some(c=>/^(sub)?total( geral)?:?$/i.test(String(c).trim()));
const CANCELADO=/cancel|excluid|recusad|devolvid|orcament|rascunho|perdid/i;

// ---- estado da importação de planilha ----
let plan=null;
function abrirPlanilha(abas,nomeArq){
  const ia=abas.reduce((b,a,i)=>a.linhas.length>abas[b].linhas.length?i:b,0);
  plan={abas,nomeArq,aba:ia,marcaPadrao:'',cidadePadrao:'',ufPadrao:'BA'};
  prepararAba();impItens=null;impErro='';
  // planilha de produtos: vai para a ferramenta própria do catálogo (lê as fotos de dentro do Excel)
  if(plan.tipo==='produto'&&typeof prepararPlanProd==='function'){plan=null;prepararPlanProd(abas,nomeArq);return}
  renderAjustes();
  requestAnimationFrame(()=>{const el=$('#planBox');if(el)el.scrollIntoView({block:'start',behavior:'smooth'})});
}
function prepararAba(){
  const a=plan.abas[plan.aba];plan.cab=acharCabecalho(a.linhas);
  const cab=a.linhas[plan.cab]||[];plan.colunas=cab.map((c,i)=>String(c||'').trim()||`Coluna ${i+1}`);
  const mg=mapearColunas(cab,CAMPOS_GERAIS),mp=mapearColunas(cab,CAMPOS_PROD);plan.tipo=adivinharTipo(mg,mp);plan.mapa=plan.tipo==='produto'?mp:mg;plan.prodRes=null;
  plan.dados=a.linhas.slice(plan.cab+1).filter(l=>l.some(c=>c!==''&&c!=null));
}
const celula=(l,k)=>plan.mapa[k]!=null?l[plan.mapa[k]]:'';
// % de comissão por marca, quando a coluna parece porcentagem (entre 0,1 e 50)
function taxasSugeridas(){
  const r={};if(plan.mapa.comissao==null)return r;
  plan.dados.forEach(l=>{let p=valorPlan(celula(l,'comissao'));if(p>0&&p<1)p*=100;if(!(p>=0.1&&p<=50))return;
    const mk=norm(String(celula(l,'marca')||plan.marcaPadrao||''));if(!mk)return;(r[mk]=r[mk]||[]).push(Math.round(p*100)/100)});
  const out={};for(const [k,v] of Object.entries(r)){const c={};v.forEach(x=>c[x]=(c[x]||0)+1);out[k]=+Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]}
  return out;
}
// linhas da planilha → lista de lançamentos no formato do conferidor
function linhasParaItens(){
  const t=plan.tipo,itens=[];let ignoradas=0;
  for(const l of plan.dados){
    if(linhaDeTotal(l)){ignoradas++;continue}
    if(t==='pedido'&&CANCELADO.test(String(celula(l,'status')||''))){ignoradas++;continue}
    const loja=String(celula(l,'loja')||'').trim(),cidade=String(celula(l,'cidade')||'').trim()||plan.cidadePadrao.trim(),uf=String(celula(l,'uf')||'').trim()||plan.ufPadrao;
    if(t==='loja'){
      if(!loja){ignoradas++;continue}
      const mc=String(celula(l,'marca')||'').trim()||plan.marcaPadrao;
      itens.push({tipo:'loja',nome:loja,cidade,uf,regiao:String(celula(l,'regiao')||''),marcas:mc?mc.split(/[;,\/]/).map(s=>s.trim()).filter(Boolean):[]});continue;
    }
    const valor=valorPlan(celula(l,'valor')),data=dataPlan(celula(l,'data'));
    if(!loja&&t==='pedido'&&!(valor>0)){ignoradas++;continue} // linha vazia ou de separação
    if(t==='despesa'){itens.push({tipo:'despesa',data,valor,categoria:String(celula(l,'categoria')||''),descricao:String(celula(l,'descricao')||'')});continue}
    const pv=valorPlan(celula(l,'previsto'));
    itens.push({tipo:'pedido',data,valor,previsto:pv>0?pv:0,loja,cidade,uf,regiao:String(celula(l,'regiao')||''),marca:String(celula(l,'marca')||'').trim()||plan.marcaPadrao,colecao:String(celula(l,'colecao')||''),pago:simNao(celula(l,'pago'))});
  }
  return{itens,ignoradas};
}
function conferirPlanilha(){
  const falta=OBRIG[plan.tipo].filter(k=>plan.mapa[k]==null);
  if(falta.length){toast('Escolha a coluna de: '+falta.map(k=>CAMPOS_PLAN.find(f=>f.k===k).t).join(', '));return}
  if(plan.tipo==='pedido'&&plan.mapa.marca==null&&!plan.marcaPadrao.trim()){toast('Escolha a marca desses pedidos');return}
  const {itens,ignoradas}=linhasParaItens();
  impTaxasSug=taxasSugeridas();plan.ignoradas=ignoradas;plan.conferida=true;
  processarLista(itens,'Planilha '+plan.nomeArq);
}
function cancelarPlanilha(){plan=null;impItens=null;impMarcasNovas=new Map();renderAjustes()}

// ---- tela ----
function blocoPlanilha(){
  if(!plan)return'';
  const a=plan.abas[plan.aba],usados=USADOS_POR_TIPO[plan.tipo],ob=OBRIG[plan.tipo];
  const ex=k=>{const i=plan.mapa[k];if(i==null)return'';const v=plan.dados.map(l=>l[i]).find(x=>x!==''&&x!=null);return v==null?'':String(k==='data'?dataBR(v):v).slice(0,24)};
  const opcoes=k=>`<option value="">— não tem —</option>`+plan.colunas.map((c,i)=>`<option value="${i}"${plan.mapa[k]===i?' selected':''}>${esc(c)}</option>`).join('');
  const campos=usados.map(k=>{const f=CAMPOS_PLAN.find(x=>x.k===k);return `<div class="plan-campo"><label class="f" for="pc-${k}">${esc(f.t)}${ob.includes(k)?' *':''}</label><select id="pc-${k}" data-plan-col="${k}" data-sem-combo>${opcoes(k)}</select>${ex(k)?`<div class="s">ex.: ${esc(ex(k))}</div>`:''}</div>`}).join('');
  const semMarca=plan.tipo!=='despesa'&&plan.mapa.marca==null,semCidade=plan.tipo!=='despesa'&&plan.tipo!=='produto'&&plan.mapa.cidade==null;
  const prev=(()=>{if(plan.tipo==='produto')return plan.dados.filter(l=>!linhaDeTotal(l)).slice(0,3).map(l=>{const v=valorPlan(celula(l,'preco'));return [celula(l,'ref')&&'Ref. '+celula(l,'ref'),celula(l,'produto')||'?',v>0?fmt2.format(v):'',celula(l,'foto')?'com foto':''].filter(Boolean).join(' · ')});
    if(plan.tipo==='despesa')return plan.dados.slice(0,3).map(l=>`${dataBR(celula(l,'data'))} · ${fmt2.format(valorPlan(celula(l,'valor'))||0)} · ${celula(l,'categoria')||celula(l,'descricao')||''}`);
    return plan.dados.filter(l=>!linhaDeTotal(l)).slice(0,3).map(l=>{const v=valorPlan(celula(l,'valor'));return [celula(l,'loja')||'?',(celula(l,'cidade')||plan.cidadePadrao||'?')+'/'+(celula(l,'uf')||plan.ufPadrao),celula(l,'marca')||plan.marcaPadrao||'',plan.tipo==='pedido'?dataBR(celula(l,'data')):'',plan.tipo==='pedido'?fmt2.format(v>0?v:0):''].filter(Boolean).join(' · ')})})();
  return `<div id="planBox" class="aviso plan">
    <div class="plan-top"><div class="grow"><b>${esc(plan.nomeArq)}</b><div class="s">${plan.dados.length} ${plan.dados.length===1?'linha':'linhas'}${plan.abas.length>1?` · aba "${esc(a.nome)}"`:''}</div></div><button class="chipbtn" data-plan-cancelar>Cancelar</button></div>
    ${plan.abas.length>1?`<label class="f" for="planAba">Aba da planilha</label><select id="planAba" data-sem-combo>${plan.abas.map((x,i)=>`<option value="${i}"${i===plan.aba?' selected':''}>${esc(x.nome)} (${x.linhas.length} linhas)</option>`).join('')}</select>`:''}
    <div class="f" style="margin-top:var(--s3)">O que tem nessa planilha?</div>
    <div class="plan-tipos" role="radiogroup">${[['pedido','Pedidos'],['loja','Clientes (lojas)'],['despesa','Despesas'],['produto','Produtos (catálogo)']].map(([k,t])=>`<button type="button" class="chip${plan.tipo===k?' on':''}" role="radio" aria-checked="${plan.tipo===k}" data-plan-tipo="${k}">${t}</button>`).join('')}</div>
    <p class="s" style="margin:var(--s3) 0 var(--s1)">Confira de qual coluna vem cada informação. Já liguei as que reconheci.</p>
    <div class="plan-campos">${campos}</div>
    ${semMarca?`<label class="f" for="planMarca">Marca de ${plan.tipo==='loja'?'todas as lojas':plan.tipo==='produto'?'todos os produtos':'todos os pedidos'}${plan.tipo==='pedido'||plan.tipo==='produto'?' *':''}</label><input id="planMarca" list="planMarcas" placeholder="Ex.: ${esc((MARCAS[0]||{}).nome||'Maré Alta')}" value="${esc(plan.marcaPadrao)}" autocomplete="off"><datalist id="planMarcas">${MARCAS.map(m=>`<option value="${esc(m.nome)}">`).join('')}</datalist><div class="s">A planilha não tem coluna de marca. Comum quando o app exporta uma representada por vez.</div>`:''}
    ${semCidade?`<div class="plan-campos"><div class="plan-campo"><label class="f" for="planCidade">Cidade das lojas novas</label><input id="planCidade" value="${esc(plan.cidadePadrao)}" placeholder="Ex.: Salvador" autocomplete="off"></div><div class="plan-campo"><label class="f" for="planUF">Estado</label><select id="planUF" data-sem-combo>${Object.keys(UFS).sort().map(u=>`<option${u===plan.ufPadrao?' selected':''}>${u}</option>`).join('')}</select></div></div><div class="s">Usada só para lojas que ainda não existem no app.</div>`:''}
    ${prev.length?`<div class="f" style="margin-top:var(--s3)">Prévia</div><div class="plan-prev">${prev.map(p=>`<div>${esc(p)}</div>`).join('')}</div>`:''}
    <button class="btn" data-plan-conferir style="margin-top:var(--s3)">Conferir ${plan.dados.length} ${plan.dados.length===1?'linha':'linhas'}</button>
    ${plan.tipo==='produto'?blocoProdutosPlan():''}
    ${plan.conferida&&plan.ignoradas&&plan.tipo!=='produto'?`<p class="s" style="margin:var(--s2) 0 0">${plan.ignoradas} ${plan.ignoradas===1?'linha ignorada':'linhas ignoradas'} (totais, vazias ou pedidos cancelados).</p>`:''}
  </div>`;
}
async function lerArquivoImport(f){
  const nome=(f.name||'').toLowerCase();
  try{
    if(f.size>15*1024*1024)throw new Error('Arquivo grande demais (mais de 15 MB)');
    if(/\.xls$/.test(nome))throw new Error('Arquivo .xls antigo: abra no Excel e use "Salvar como" .xlsx ou .csv');
    if(/\.(xlsx|xlsm)$/.test(nome)){abrirPlanilha(await lerXlsx(await f.arrayBuffer()),f.name);return}
    const txt=decodificarTexto(await f.arrayBuffer());
    if(/\.(csv|tsv)$/.test(nome)||(/\.txt$/.test(nome)&&pareceTabelaTexto(txt))){abrirPlanilha([{nome:f.name,linhas:lerCsv(txt)}],f.name);return}
    plan=null;processarRelatorio(txt);
  }catch(e){plan=null;impErro=e.message||'Não consegui ler esse arquivo';impItens=null;renderAjustes()}
}
document.addEventListener('change',e=>{
  const t=e.target;if(!plan||!t)return;
  if(t.dataset&&t.dataset.planCol){const k=t.dataset.planCol;if(t.value==='')delete plan.mapa[k];else{const i=+t.value;for(const x in plan.mapa)if(plan.mapa[x]===i&&x!==k)delete plan.mapa[x];plan.mapa[k]=i}plan.conferida=false;plan.prodRes=null;impItens=null;renderAjustes()}
  else if(t.id==='planAba'){plan.aba=+t.value;prepararAba();plan.conferida=false;impItens=null;renderAjustes()}
  else if(t.id==='planUF'){plan.ufPadrao=t.value}
});
document.addEventListener('input',e=>{
  const t=e.target;if(!plan||!t)return;
  if(t.id==='planMarca'){plan.marcaPadrao=t.value;if(plan.prodRes){plan.prodRes=null;plan.conferida=false;const r=$('#prodRes');if(r)r.remove()}}else if(t.id==='planCidade')plan.cidadePadrao=t.value;
});
document.addEventListener('click',e=>{
  if(!plan)return;const t=e.target.closest('[data-plan-tipo],[data-plan-conferir],[data-plan-cancelar]');if(!t)return;
  if(t.dataset.planTipo){const era=plan.tipo;plan.tipo=t.dataset.planTipo;
    if((era==='produto')!==(plan.tipo==='produto'))plan.mapa=mapearColunas(plan.abas[plan.aba].linhas[plan.cab]||[],plan.tipo==='produto'?CAMPOS_PROD:CAMPOS_GERAIS);
    plan.conferida=false;plan.prodRes=null;impItens=null;renderAjustes()}
  else if('planConferir' in t.dataset){if(plan.tipo==='produto')conferirProdutos();else conferirPlanilha()}
  else cancelarPlanilha();
});
