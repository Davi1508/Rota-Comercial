// ---------- utilidades ----------
const UFS={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
const NA=['BA','PB'],NO=['AC','AP','AM','CE','DF','ES','MA','MT','MS','PA','PR','PI','RJ','RN','RS','TO'];
const emUF=uf=>(NA.includes(uf)?'na ':NO.includes(uf)?'no ':'em ')+UFS[uf];
const $=s=>document.querySelector(s);
const fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const fmt2=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const marca=id=>MARCAS.find(m=>m.id===id);
const loja=id=>lojas.find(l=>l.id===id);
const com=o=>o.valor*(o.taxa!=null?o.taxa:marca(o.marca).taxa);
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const pct=t=>(t*100).toLocaleString('pt-BR')+'%';
let filtro={periodo:'12m',marca:'todas',regiao:'todas',colecao:'todas',de:'',ate:''};
function noPeriodo(d){if(filtro.periodo==='pers'){if(!filtro.de||!filtro.ate)return true;return d>=deIso(filtro.de)&&d<=deIso(filtro.ate)}
  const age=(HOJE-d)/DAY;
  if(filtro.periodo==='12m')return age<365; if(filtro.periodo==='3m')return age<91;
  if(filtro.periodo==='mes')return d.getMonth()===HOJE.getMonth()&&d.getFullYear()===HOJE.getFullYear();
  return d.getFullYear()===HOJE.getFullYear()}
const passaMarca=o=>filtro.marca==='todas'||o.marca===filtro.marca;
const passaRegiao=o=>filtro.regiao==='todas'||(loja(o.loja)||{}).regiao===filtro.regiao;
const passaColecao=o=>filtro.colecao==='todas'||o.colecao===filtro.colecao;
const filtrados=()=>pedidos.filter(o=>!o.pendente&&noPeriodo(o.data)&&passaMarca(o)&&passaRegiao(o)&&passaColecao(o));
// pedidos com previsão (inclui os que ainda esperam o valor real)
const comPrevisao=()=>pedidos.filter(o=>o.previsto>0&&noPeriodo(o.data)&&passaMarca(o)&&passaRegiao(o)&&passaColecao(o));
const corPrev=r=>r>=.95&&r<=1.05?'ok':r>=.8&&r<=1.2?'warn':'bad';
const ativas=()=>lojas.filter(l=>!l.arquivada);
const lojasVis=()=>lojas.filter(l=>!l.arquivada&&(filtro.marca==='todas'||l.marcas.includes(filtro.marca))&&(filtro.regiao==='todas'||l.regiao===filtro.regiao));
let ultCache=null;
let ritCache=null;
// Última compra e ritmo de cada loja (mediana dos dias entre compras, com 4 compras ou mais)
function prepCache(){ultCache=new Map();ritCache=new Map();const dts=new Map();
  for(const o of pedidos){if(o.pendente)continue;const u=ultCache.get(o.loja);if(!u||o.data>u)ultCache.set(o.loja,o.data);
    if(!dts.has(o.loja))dts.set(o.loja,new Set());dts.get(o.loja).add(isoD(o.data))}
  dts.forEach((set,id)=>{const d=[...set].sort().map(deIso);if(d.length<4)return;const iv=[];for(let i=1;i<d.length;i++)iv.push((d[i]-d[i-1])/DAY);iv.sort((a,b)=>a-b);ritCache.set(id,Math.round(iv[iv.length>>1]))})}
function ultima(l){if(!ultCache)prepCache();return ultCache.get(l.id)||null}
function ritmo(l){if(!ultCache)prepCache();return ritCache.get(l.id)||0}
const dias=d=>d?Math.max(0,Math.floor((HOJE-d)/DAY)):9999;
function status(l){const u=ultima(l);if(!u)return['bad','Sem pedidos'];const n=dias(u),r=ritmo(l),ok=r?Math.max(35,Math.round(r*1.3)):35,wr=r?Math.max(75,Math.round(r*2.2)):75;return n<=ok?['ok','Comprando']:n<=wr?['warn','Esfriando']:['bad','Parada']}
function haDias(d){if(!d)return'nenhuma ainda';const n=dias(d);return n===0?'hoje':n===1?'ontem':`há ${n} dias`}
function avatar(l){const h=[...l.nome].reduce((a,c)=>a+c.charCodeAt(0),0)*47%360;
  const ini=l.nome.split(' ').filter(w=>w.length>2).slice(0,2).map(w=>w[0]).join('').toUpperCase()||l.nome.slice(0,2).toUpperCase();
  return `<span class="av" style="--h:${h}">${esc(ini)}<i style="background:${COR[status(l)[0]]}"></i></span>`}
