// ---------- salvar no celular (e na conta, quando o link permite) ----------
const CHAVE='rc-dados-v1';
let nuvem=null,salvarT=null,fila=Promise.resolve(),enviados={};
function serializar(){return{v:1,atualizado,marcas:MARCAS,lojas,sugestoes,regioes:REGIOES,colecoes:COLECOES,nome:NOME,despesas:DESPESAS.map(x=>({...x,data:isoD(x.data)})),pedidos:pedidos.map(o=>({...o,data:isoD(o.data)}))}}
const idOk=x=>x!=null&&/^[\w-]{1,40}$/.test(String(x)),dataOk=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(deIso(x));
function limpar(d){
  d=d&&typeof d==='object'?d:{};
  const txt=(x,n=80)=>String(x==null?'':x).slice(0,n).trim(),arr=x=>Array.isArray(x)?x:[];
  const marcas=arr(d.marcas).filter(m=>m&&idOk(m.id)&&txt(m.nome)).map((m,i)=>({id:String(m.id),nome:txt(m.nome),taxa:Math.min(1,Math.max(0,+m.taxa||0)),cor:/^#[0-9a-f]{3,8}$/i.test(m.cor)?m.cor:PALETA[i%PALETA.length]}));
  const mids=new Set(marcas.map(m=>m.id));
  const lojas=arr(d.lojas).filter(l=>l&&idOk(l.id)&&txt(l.nome)).map(l=>({id:String(l.id),nome:txt(l.nome),cidade:txt(l.cidade)||'Sem cidade',uf:UFS[l.uf]?l.uf:'BA',regiao:txt(l.regiao),marcas:arr(l.marcas).filter(x=>mids.has(x)),coord:Array.isArray(l.coord)&&l.coord.length===2&&l.coord.every(Number.isFinite)?l.coord:null,...(l.arquivada?{arquivada:true}:{})}));
  const lids=new Set(lojas.map(l=>l.id));
  const pedidos=arr(d.pedidos).filter(o=>o&&lids.has(String(o.loja))&&mids.has(o.marca)&&dataOk(o.data)).map((o,i)=>{const v=Math.max(0,+o.valor||0),pv=Math.max(0,+o.previsto||0),r={id:idOk(o.id)?o.id:'r'+i,loja:String(o.loja),marca:o.marca,valor:v,data:o.data,pago:!!o.pago&&v>0,taxa:o.taxa!=null&&Number.isFinite(+o.taxa)?+o.taxa:marcas.find(m=>m.id===o.marca).taxa,colecao:txt(o.colecao)};
    if(pv)r.previsto=pv;if(!v&&pv)r.pendente=true;return r}).filter(o=>o.valor>0||o.pendente);
  const despesas=arr(d.despesas).filter(x=>x&&dataOk(x.data)&&+x.valor>0).map((x,i)=>({id:idOk(x.id)?String(x.id):'d'+i,data:x.data,valor:+x.valor,categoria:txt(x.categoria),descricao:txt(x.descricao,120)}));
  const lista=x=>Array.isArray(x)?[...new Set(x.map(y=>txt(y)).filter(Boolean))]:undefined;
  return{...d,marcas,lojas,pedidos,despesas,regioes:lista(d.regioes),colecoes:lista(d.colecoes),nome:d.nome!==undefined?txt(d.nome,40):undefined,sugestoes:arr(d.sugestoes)};
}
function aplicar(d){
  d=limpar(d);ultCache=null;MARCAS=d.marcas||[];lojas=d.lojas||[];sugestoes=d.sugestoes||[];REGIOES=Array.isArray(d.regioes)?d.regioes:[];COLECOES=Array.isArray(d.colecoes)?d.colecoes:[...COLECOES_PADRAO];DESPESAS=(d.despesas||[]).map(x=>({...x,data:deIso(x.data)}));NOME=d.nome||'';
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
  docs.push(['base',{v:1,atualizado:d.atualizado,marcas:d.marcas,lojas:d.lojas,sugestoes:d.sugestoes,regioes:d.regioes,colecoes:d.colecoes,nome:d.nome,despesas:d.despesas,anos:Object.keys(anos).filter(y=>anos[y].length)}]);
  fila=fila.then(async()=>{
    try{for(const [k,b] of docs){const s=JSON.stringify(b);if(enviados[k]===s)continue;await nuvem.doc(k).set(b);enviados[k]=s}marcarStatus('nuvem')}
    catch(e){console.warn('Não salvou na conta',e);if(e&&['invalid_argument','revoked','not_granted','capability_disabled'].includes(e.code))nuvem=null;marcarStatus(e&&e.code==='quota_exceeded'?'cheio':'local')}
  });
}
async function conectarNuvem(){
  try{
    if(!window.claude||typeof claude.use!=='function')return;
    const [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);
    if(!db||!user)return;const uid=await user.id();if(!uid)return;
    const col=db.collection('data/users/'+uid);
    const snap=await Promise.race([col.doc('base').get(),new Promise(r=>setTimeout(()=>r(null),10000))]);
    if(!snap)return;
    if(snap.exists&&(snap.data().atualizado||0)>atualizado){
      const b=snap.data(),peds=[];
      for(const y of b.anos||[]){const s=await col.doc('ped-'+y).get();if(s.exists){const l=s.data().lista||[];peds.push(...l);enviados['ped-'+y]=JSON.stringify({lista:l})}}
      aplicar({...b,pedidos:peds});nuvem=col;
      try{localStorage.setItem(CHAVE,JSON.stringify(serializar()))}catch(e){}
      sairEdicoes();preencherForm();renderTudo();marcarStatus('nuvem');toast('Seus dados foram carregados');return;
    }
    nuvem=col;
    if(exemplo)marcarStatus('exemplo');else if(atualizado)enviarNuvem();else marcarStatus('nuvem');
  }catch(e){console.warn('Conta indisponível para salvar',e)}
}
const STATUS={local:['ok','Salvo no celular'],nuvem:['ok','Salvo na sua conta'],salvando:['','Salvando…'],erro:['bad','Não foi possível salvar'],cheio:['warn','Espaço da conta cheio: salvo só no celular'],exemplo:['warn','Exemplo: nada é salvo'],vazio:['','Seus dados ficam salvos neste celular']};
function marcarStatus(k){const [c,t]=STATUS[k];const el=$('#sync');el.className='sync '+c;el.textContent=t}
const textoOndeSalva=()=>(typeof conta!=='undefined'&&conta)?'Na sua conta e neste celular. Entrando com o mesmo e-mail em outro aparelho, os dados aparecem lá também.':nuvem?'Na sua conta do Claude e neste celular. Se abrir este link em outro aparelho com a mesma conta, os dados aparecem lá também.':'Neste celular, no navegador. Se você limpar os dados do navegador ou trocar de aparelho, use a cópia de segurança para recuperar tudo.';
