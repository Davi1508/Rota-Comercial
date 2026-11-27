// ---------- salvar no celular (e na conta, quando o link permite) ----------
const CHAVE='rc-dados-v1';
let nuvem=null,salvarT=null,fila=Promise.resolve(),enviados={};
function serializar(){return{v:1,atualizado,marcas:MARCAS,lojas,sugestoes,regioes:REGIOES,colecoes:COLECOES,metas:METAS,agenda:AGENDA,importacoes:IMPORTS,produtos:PRODUTOS,nome:NOME,despesas:DESPESAS.map(x=>({...x,data:isoD(x.data)})),pedidos:pedidos.map(o=>({...o,data:isoD(o.data)}))}}
// Foto: link da internet ou, sem conta, uma imagem pequena guardada no próprio celular
const fotoOk=x=>{const s=String(x||'');return /^https?:\/\/\S{4,590}$/i.test(s)||(/^data:image\/(jpeg|png|webp|svg\+xml);base64,[\w+/=]+$/.test(s)&&s.length<80000)?s:''};
// unidade: só letras/números curtos; 'un' é o padrão e não é gravado
const unOkS=u=>{const s=String(u||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8);return s&&s!=='un'?s:''};
// comissão por cliente: {marca: fração entre 0 e 1}
const taxasOk=(t,mids)=>{if(!t||typeof t!=='object'||Array.isArray(t))return null;const o={};for(const[k,v]of Object.entries(t))if(mids.has(k)&&+v>0&&+v<=1)o[k]=Math.round(+v*100000)/100000;return Object.keys(o).length?o:null};
// importações: no máximo 10, só ids de produtos e os valores de antes dos que foram atualizados
function limparImports(a){return(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&idOk(String(x.id||''))).slice(-10).map(x=>({id:String(x.id).slice(0,40),tipo:x.tipo==='nota'?'nota':'planilha',titulo:String(x.titulo||'').slice(0,120),marca:String(x.marca||'').slice(0,40),data:+x.data||0,
  novos:(Array.isArray(x.novos)?x.novos:[]).filter(v=>idOk(String(v))).slice(0,5000).map(String),
  antes:Object.fromEntries(Object.entries(x.antes&&typeof x.antes==='object'?x.antes:{}).slice(0,5000).filter(([k])=>idOk(k)).map(([k,v])=>[k,{preco:+(v&&v.preco)||0,...(+(v&&v.custo)>0?{custo:+v.custo}:{}),nome:String((v&&v.nome)||'').slice(0,160),...(v&&v.un?{un:String(v.un).slice(0,8)}:{})}]))}))}
function limparItens(a){
  return(Array.isArray(a)?a:[]).slice(0,500).filter(x=>x&&String(x.nome||'').trim()).map(x=>({p:String(x.p||'').slice(0,40),ref:String(x.ref||'').slice(0,60).trim(),nome:String(x.nome).slice(0,160).trim(),preco:Math.max(0,Math.round((+x.preco||0)*100)/100),qtd:Math.min(9999999,Math.max(0.001,Math.round((+x.qtd||1)*1000)/1000)),foto:/^https?:/i.test(fotoOk(x.foto))?fotoOk(x.foto):'',...(unOkS(x.un)?{un:unOkS(x.un)}:{}),...(+x.custo>0?{custo:Math.min(1e7,Math.round(+x.custo*100)/100)}:{})}));
}
// Site da marca: só o endereço (ex.: lojavirtual.marca.com.br), para achar as fotos oficiais dos produtos
const siteOk=x=>{const s=String(x||'').trim().replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)&&s.length<=120?s:''};
const idOk=x=>x!=null&&/^[\w-]{1,40}$/.test(String(x)),dataOk=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(deIso(x));
function limpar(d){
  d=d&&typeof d==='object'?d:{};
  const txt=(x,n=80)=>String(x==null?'':x).slice(0,n).trim(),arr=x=>Array.isArray(x)?x:[];
  const marcas=arr(d.marcas).filter(m=>m&&idOk(m.id)&&txt(m.nome)).map((m,i)=>({id:String(m.id),nome:txt(m.nome),taxa:Math.min(1,Math.max(0,+m.taxa||0)),cor:/^#[0-9a-f]{3,8}$/i.test(m.cor)?m.cor:PALETA[i%PALETA.length],...(siteOk(m.site)?{site:siteOk(m.site)}:{})}));
  const mids=new Set(marcas.map(m=>m.id));
  const lojas=arr(d.lojas).filter(l=>l&&idOk(l.id)&&txt(l.nome)).map(l=>({id:String(l.id),nome:txt(l.nome),cidade:txt(l.cidade)||'Sem cidade',uf:UFS[l.uf]?l.uf:'BA',regiao:txt(l.regiao),marcas:arr(l.marcas).filter(x=>mids.has(x)),coord:Array.isArray(l.coord)&&l.coord.length===2&&l.coord.every(Number.isFinite)?l.coord:null,...(l.arquivada?{arquivada:true}:{}),...(/^\d{14}$/.test(String(l.cnpj||''))?{cnpj:String(l.cnpj)}:{}),...(taxasOk(l.taxas,mids)?{taxas:taxasOk(l.taxas,mids)}:{})}));
  const lids=new Set(lojas.map(l=>l.id));
  const pedidos=arr(d.pedidos).filter(o=>o&&lids.has(String(o.loja))&&mids.has(o.marca)&&dataOk(o.data)).map((o,i)=>{const v=Math.max(0,+o.valor||0),pv=Math.max(0,+o.previsto||0),r={id:idOk(o.id)?o.id:'r'+i,loja:String(o.loja),marca:o.marca,valor:v,data:o.data,pago:!!o.pago&&v>0,taxa:o.taxa!=null&&Number.isFinite(+o.taxa)?+o.taxa:marcas.find(m=>m.id===o.marca).taxa,colecao:txt(o.colecao)};
    if(pv)r.previsto=pv;if(!v&&pv)r.pendente=true;const it=limparItens(o.itens);if(it.length)r.itens=it;return r}).filter(o=>o.valor>0||o.pendente);
  const despesas=arr(d.despesas).filter(x=>x&&dataOk(x.data)&&+x.valor>0).map((x,i)=>({id:idOk(x.id)?String(x.id):'d'+i,data:x.data,valor:+x.valor,categoria:txt(x.categoria),descricao:txt(x.descricao,120)}));
  const pids=new Set(),produtos=arr(d.produtos).filter(x=>x&&idOk(x.id)&&mids.has(x.marca)&&txt(x.nome,160)&&!pids.has(String(x.id))&&pids.add(String(x.id))).map(x=>({id:String(x.id),marca:x.marca,ref:txt(x.ref,60),nome:txt(x.nome,160),preco:Math.max(0,Math.round((+x.preco||0)*100)/100),foto:fotoOk(x.foto),...(unOkS(x.un)?{un:unOkS(x.un)}:{}),...(+x.custo>0?{custo:Math.min(1e7,Math.round(+x.custo*100)/100)}:{})}));
  const metas=arr(d.metas).filter(m=>m&&idOk(m.id)&&mids.has(m.marca)&&+m.valor>0).map(m=>({id:String(m.id),marca:m.marca,colecao:txt(m.colecao),valor:Math.round(+m.valor*100)/100,desde:dataOk(m.desde)?m.desde:''}));
  const agenda=arr(d.agenda).filter(a=>a&&idOk(a.id)&&dataOk(a.data)&&txt(a.titulo,80)).slice(0,3000).map(a=>({id:String(a.id),data:a.data,hora:/^([01]\d|2[0-3]):[0-5]\d$/.test(a.hora)?a.hora:'',loja:lids.has(String(a.loja))?String(a.loja):'',titulo:txt(a.titulo,80),nota:txt(a.nota,300),feito:!!a.feito}));
  const lista=x=>Array.isArray(x)?[...new Set(x.map(y=>txt(y)).filter(Boolean))]:undefined;
  return{...d,marcas,lojas,pedidos,despesas,metas,agenda,importacoes:limparImports(d.importacoes),produtos,regioes:lista(d.regioes),colecoes:lista(d.colecoes),nome:d.nome!==undefined?txt(d.nome,40):undefined,sugestoes:arr(d.sugestoes)};
}
function aplicar(d){
  d=limpar(d);ultCache=null;MARCAS=d.marcas||[];lojas=d.lojas||[];sugestoes=d.sugestoes||[];REGIOES=Array.isArray(d.regioes)?d.regioes:[];COLECOES=Array.isArray(d.colecoes)?d.colecoes:[...COLECOES_PADRAO];DESPESAS=(d.despesas||[]).map(x=>({...x,data:deIso(x.data)}));NOME=d.nome||'';METAS=d.metas||[];AGENDA=d.agenda||[];IMPORTS=d.importacoes||[];PRODUTOS=d.produtos||[];
  pedidos=(d.pedidos||[]).map(o=>({...o,data:deIso(o.data)}));pid=pedidos.reduce((a,o)=>Math.max(a,+o.id||0),0)+1;
  exemplo=!!d.exemplo;atualizado=d.atualizado||0;filtro.marca='todas';filtro.regiao='todas';filtro.colecao='todas';estadoSel=null;cidadeSel=null;
}
function lerLocal(){try{const s=localStorage.getItem(CHAVE);return s?JSON.parse(s):null}catch(e){return null}}
function salvar(){
  ultCache=null;
  if(!exemplo&&typeof bloquearSeLeitura==='function'&&bloquearSeLeitura())return;
  if(exemplo){marcarStatus('exemplo');return}
  atualizado=Date.now();let ok=true;
  try{localStorage.setItem(CHAVE,JSON.stringify(serializar()))}catch(e){ok=false}
  if(!ok)toast('Não foi possível salvar neste aparelho. Faça uma cópia de segurança em Ajustes.');
  if(typeof carimbar==='function')carimbar();
  if(typeof agendarConta==='function'&&agendarConta()){}
  else if(nuvem){marcarStatus('salvando');clearTimeout(salvarT);salvarT=setTimeout(enviarNuvem,800)}
  else marcarStatus(ok?'local':'erro');
}
// Na conta: um documento com marcas e lojas, e um por ano com os pedidos (cada documento tem limite de tamanho)
function enviarNuvem(){
  if(!nuvem||exemplo)return;
  const d=serializar(),anos={};
  d.pedidos.forEach(o=>{const y=o.data.slice(0,4);(anos[y]=anos[y]||[]).push(o)});
  Object.keys(enviados).forEach(k=>{if(k.startsWith('ped-')&&!anos[k.slice(4)])anos[k.slice(4)]=[]});
  const docs=Object.entries(anos).map(([y,l])=>['ped-'+y,{lista:l}]);
  docs.push(['base',{v:1,atualizado:d.atualizado,marcas:d.marcas,lojas:d.lojas,sugestoes:d.sugestoes,regioes:d.regioes,colecoes:d.colecoes,metas:d.metas,agenda:d.agenda,importacoes:d.importacoes,nome:d.nome,despesas:d.despesas,anos:Object.keys(anos).filter(y=>anos[y].length)}]);
  fila=fila.then(async()=>{
    try{for(const [k,b] of docs){const s=JSON.stringify(b);if(enviados[k]===s)continue;await nuvem.doc(k).set(b);enviados[k]=s}marcarStatus('nuvem')}
    catch(e){console.warn('Não salvou na conta',e);if(e&&['invalid_argument','revoked','not_granted','capability_disabled'].includes(e.code))nuvem=null;marcarStatus(e&&e.code==='quota_exceeded'?'cheio':'local')}
  });
}
const STATUS={local:['ok','Salvo no celular'],nuvem:['ok','Salvo na sua conta'],salvando:['','Salvando…'],erro:['bad','Não foi possível salvar'],cheio:['warn','Espaço da conta cheio: salvo só no celular'],exemplo:['warn','Exemplo: nada é salvo'],vazio:['','Seus dados ficam salvos neste celular']};
function marcarStatus(k){const [c,t]=STATUS[k];const el=$('#sync');el.className='sync '+c;el.textContent=t}
const textoOndeSalva=()=>(typeof conta!=='undefined'&&conta)?'Na sua conta e neste celular. Entrando com o mesmo e-mail em outro aparelho, os dados aparecem lá também.':nuvem?'Na sua conta do Claude e neste celular. Se abrir este link em outro aparelho com a mesma conta, os dados aparecem lá também.':'Neste celular, no navegador. Se você limpar os dados do navegador ou trocar de aparelho, use a cópia de segurança para recuperar tudo.';
