// ---------- mapa nacional ----------
// Contornos: pacote aberto @svg-maps/brazil (MapSVG, CC BY 4.0), carregado da CDN jsDelivr.
// Cores, bolhas e pinos vêm dos arrays "lojas" e "pedidos": nada é fixo.
const MAPA_FONTES=['https://cdn.jsdelivr.net/npm/@svg-maps/brazil/+esm','https://cdn.jsdelivr.net/npm/@svg-country-maps/brazil/+esm'];
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const UF_POR_NOME=Object.fromEntries(Object.entries(UFS).map(([k,v])=>[norm(v),k]));
// Coordenadas de referência (longitude, latitude): capitais, cidades grandes e cidades baianas.
// Cidade fora desta lista: o usuário marca o local tocando no mapa.
const CIDADES_BR={
 AC:{'Rio Branco':[-67.81,-9.97]},AL:{'Maceió':[-35.73,-9.67],'Arapiraca':[-36.66,-9.75]},AP:{'Macapá':[-51.07,.03]},
 AM:{'Manaus':[-60.02,-3.12],'Parintins':[-56.74,-2.63]},
 BA:{'Lauro de Freitas':[-38.33,-12.9],'Simões Filho':[-38.4,-12.79],'Santo Amaro':[-38.71,-12.55],'Cruz das Almas':[-39.1,-12.67],'Brumado':[-41.67,-14.2],'Itapetinga':[-40.25,-15.25],'Serrinha':[-39.01,-11.66],'Lençóis':[-41.39,-12.56],'Itaberaba':[-40.31,-12.53],'Euclides da Cunha':[-39.01,-10.51],'Ribeira do Pombal':[-38.54,-10.83],'Livramento de Nossa Senhora':[-41.84,-13.64],'Caetité':[-42.48,-14.07],'Santa Maria da Vitória':[-44.2,-13.39],'Xique-Xique':[-42.73,-10.82],'Remanso':[-42.08,-9.62],'Casa Nova':[-40.97,-9.16],'Mucuri':[-39.55,-18.09],'Prado':[-39.22,-17.34],'Canavieiras':[-38.95,-15.68],'Itacaré':[-38.99,-14.28],'Ipiaú':[-39.73,-14.14],'Gandu':[-39.49,-13.74],'Amargosa':[-39.6,-13.03],'Conceição do Coité':[-39.28,-11.56]},
 CE:{'Fortaleza':[-38.54,-3.72],'Juazeiro do Norte':[-39.31,-7.21],'Sobral':[-40.35,-3.69],'Caucaia':[-38.65,-3.74]},
 DF:{'Brasília':[-47.88,-15.79]},ES:{'Vitória':[-40.31,-20.32],'Vila Velha':[-40.29,-20.33],'Serra':[-40.31,-20.13],'Cachoeiro de Itapemirim':[-41.11,-20.85],'Linhares':[-40.07,-19.39]},
 GO:{'Goiânia':[-49.25,-16.68],'Anápolis':[-48.95,-16.33],'Aparecida de Goiânia':[-49.24,-16.82]},MA:{'São Luís':[-44.3,-2.53],'Imperatriz':[-47.49,-5.53]},
 MT:{'Cuiabá':[-56.1,-15.6],'Várzea Grande':[-56.13,-15.65],'Rondonópolis':[-54.64,-16.47],'Sinop':[-55.5,-11.86]},MS:{'Campo Grande':[-54.62,-20.47],'Dourados':[-54.81,-22.22],'Três Lagoas':[-51.68,-20.75]},
 MG:{'Belo Horizonte':[-43.94,-19.92],'Uberlândia':[-48.28,-18.92],'Juiz de Fora':[-43.35,-21.76],'Montes Claros':[-43.86,-16.73],'Contagem':[-44.05,-19.93],'Governador Valadares':[-41.95,-18.85],'Uberaba':[-47.93,-19.75]},
 PA:{'Belém':[-48.5,-1.46],'Santarém':[-54.71,-2.44],'Marabá':[-49.12,-5.37]},PB:{'João Pessoa':[-34.86,-7.12],'Campina Grande':[-35.88,-7.23]},
 PR:{'Curitiba':[-49.27,-25.43],'Londrina':[-51.16,-23.31],'Maringá':[-51.94,-23.42],'Ponta Grossa':[-50.16,-25.09],'Cascavel':[-53.46,-24.96],'Foz do Iguaçu':[-54.59,-25.55]},
 PE:{'Recife':[-34.88,-8.05],'Jaboatão dos Guararapes':[-35.01,-8.11],'Olinda':[-34.86,-8.01],'Caruaru':[-35.98,-8.28],'Petrolina':[-40.5,-9.39]},PI:{'Teresina':[-42.8,-5.09],'Parnaíba':[-41.78,-2.9]},
 RJ:{'Rio de Janeiro':[-43.17,-22.91],'Niterói':[-43.1,-22.88],'Petrópolis':[-43.18,-22.51],'Campos dos Goytacazes':[-41.32,-21.75],'Volta Redonda':[-44.1,-22.52]},RN:{'Natal':[-35.21,-5.79],'Mossoró':[-37.34,-5.19]},
 RS:{'Porto Alegre':[-51.23,-30.03],'Caxias do Sul':[-51.18,-29.17],'Pelotas':[-52.34,-31.77],'Santa Maria':[-53.81,-29.69],'Passo Fundo':[-52.41,-28.26]},
 RO:{'Porto Velho':[-63.9,-8.76],'Ji-Paraná':[-61.95,-10.88]},RR:{'Boa Vista':[-60.67,2.82]},
 SC:{'Florianópolis':[-48.55,-27.6],'Joinville':[-48.85,-26.3],'Blumenau':[-49.07,-26.92],'Chapecó':[-52.62,-27.1],'Itajaí':[-48.66,-26.91],'Balneário Camboriú':[-48.63,-26.99]},
 SP:{'São Paulo':[-46.63,-23.55],'Campinas':[-47.06,-22.91],'Santos':[-46.33,-23.96],'Ribeirão Preto':[-47.81,-21.18],'Sorocaba':[-47.46,-23.5],'São José dos Campos':[-45.89,-23.18],'Guarulhos':[-46.53,-23.46],'Bauru':[-49.06,-22.32],'São José do Rio Preto':[-49.38,-20.82]},
 SE:{'Aracaju':[-37.07,-10.91],'Lagarto':[-37.65,-10.92],'Itabaiana':[-37.43,-10.69]},TO:{'Palmas':[-48.33,-10.18],'Araguaína':[-48.21,-7.19]}
};
const COORDS={},NOMES={};
Object.entries(CIDADES).forEach(([c,v])=>{COORDS[norm(c)+'|BA']=v;NOMES[norm(c)+'|BA']=c});
Object.entries(CIDADES_BR).forEach(([uf,cs])=>Object.entries(cs).forEach(([c,v])=>{COORDS[norm(c)+'|'+uf]=v;NOMES[norm(c)+'|'+uf]=c}));
const MIN=['de','da','do','das','dos','e'];
const nomeCidade=(c,uf)=>NOMES[norm(c)+'|'+uf]||c.trim().toLowerCase().split(/\s+/).map((w,i)=>i&&MIN.includes(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
const coordCidade=(c,uf)=>COORDS[norm(c)+'|'+uf]||null;
const BA_GEO={lon0:-46.62,lon1:-37.34,lat0:-8.53,lat1:-18.35};
let mapaPronto=false,estadoSel=null,cidadeSel=null,vbBase={x:0,y:0,w:100,h:100},view={...vbBase},proj=null,bboxUF={},nivelAnt='',colocando=null,infoKey='';
const semMov=matchMedia('(prefers-reduced-motion: reduce)').matches,temHover=matchMedia('(hover: hover)').matches;

async function carregarMapa(){
  let cache=null;try{cache=JSON.parse(localStorage.getItem('rc-mapa-v1')||'null')}catch(e){}
  if(cache&&cache.viewBox&&Array.isArray(cache.locations)&&cache.locations.length>=27){montarMapa(cache);return}
  $('#mapaMsg').textContent='Carregando o mapa do Brasil…';
  for(const url of MAPA_FONTES){
    try{const mod=await import(url),d=mod.default||mod;
      if(d&&d.viewBox&&Array.isArray(d.locations)&&d.locations.length>=27){montarMapa(d);try{localStorage.setItem('rc-mapa-v1',JSON.stringify({viewBox:d.viewBox,locations:d.locations.map(l=>({id:l.id,name:l.name,path:l.path}))}))}catch(e){}return}}catch(e){console.warn('Mapa indisponível em',url,e)}
  }
  $('#mapaMsg').innerHTML='Não foi possível carregar o mapa do Brasil. Verifique a conexão.<br><button class="chipbtn" data-retry style="margin-top:16px">Tentar de novo</button>';
}
function montarMapa(d){
  const [x,y,w,h]=String(d.viewBox).split(/[\s,]+/).map(Number);vbBase={x,y,w,h};view={...vbBase};
  let g=`<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${w/130}" flood-opacity=".75"/></filter></defs><g id="ufs">`;
  const achados=new Set();
  d.locations.forEach(loc=>{
    const id=String(loc.id||'').toUpperCase(),uf=UFS[id]?id:UF_POR_NOME[norm(loc.name||'')];
    if(!uf||!loc.path)return;achados.add(uf);
    g+=`<path class="uf" d="${loc.path}" data-uf="${uf}" tabindex="0" role="button" vector-effect="non-scaling-stroke"/>`;
  });
  $('#mapa').innerHTML=g+'</g><g id="pts"></g>';setView();
  const falta=Object.keys(UFS).filter(u=>!achados.has(u));
  if(falta.length)console.warn('Estados sem contorno no arquivo do mapa:',falta.join(', '));
  mapaPronto=true;$('#mapaMsg').textContent='';atualizarMapa();
}
// Alinha longitude/latitude ao desenho. Bahia: pelos extremos da própria Bahia (mais preciso onde há mais lojas).
// Outros estados: pelos extremos do Brasil (Acre a oeste, Paraíba a leste, Roraima ao norte, Rio Grande do Sul ao sul),
// testando projeção linear e de Mercator e ficando com a que melhor acerta a posição da Bahia.
function medirMapa(){
  if(proj)return true;
  document.querySelectorAll('#mapa .uf').forEach(p=>{const b=p.getBBox();if(b.width)bboxUF[p.dataset.uf]=b});
  const ba=bboxUF.BA;if(!ba)return false;
  const linear=(x0,lon0,ax,y0,lat0,ay)=>({x:lon=>x0+(lon-lon0)*ax,y:lat=>y0+(lat-lat0)*ay,lon:x=>lon0+(x-x0)/ax,lat:y=>lat0+(y-y0)/ay});
  proj={ba:linear(ba.x,BA_GEO.lon0,ba.width/(BA_GEO.lon1-BA_GEO.lon0),ba.y,BA_GEO.lat0,ba.height/(BA_GEO.lat1-BA_GEO.lat0)),br:null};
  const {AC:ac,PB:pb,RR:rr,RS:rs}=bboxUF;
  if(ac&&pb&&rr&&rs){
    const xW=ac.x,ax=(pb.x+pb.width-xW)/(-34.79+73.99),yN=rr.y,yS=rs.y+rs.height;
    const merc=l=>Math.log(Math.tan(Math.PI/4+l*Math.PI/360)),imerc=m=>(2*Math.atan(Math.exp(m))-Math.PI/2)*180/Math.PI;
    const op=[[l=>l,m=>m],[merc,imerc]].map(([g,ig])=>{const a=(yS-yN)/(g(-33.75)-g(5.27)),f=lat=>yN+(g(lat)-g(5.27))*a;
      return{f,inv:y=>ig((y-yN)/a+g(5.27)),err:Math.abs(f(BA_GEO.lat0)-ba.y)+Math.abs(f(BA_GEO.lat1)-ba.y-ba.height)}});
    const m=op[0].err<=op[1].err?op[0]:op[1],fx=lon=>xW+(lon+73.99)*ax;
    const errX=Math.abs(fx(BA_GEO.lon0)-ba.x)+Math.abs(fx(BA_GEO.lon1)-ba.x-ba.width);
    if(errX<ba.width*.12&&m.err<ba.height*.12)proj.br={x:fx,y:m.f,lon:x=>(x-xW)/ax-73.99,lat:m.inv};
  }
  return true;
}
const P=uf=>(uf!=='BA'&&proj.br)||proj.ba;
function posLoja(l){
  const c=l.coord||coordCidade(l.cidade,l.uf);
  if(c&&proj){const p=P(l.uf);return{x:p.x(c[0]),y:p.y(c[1]),aprox:false}}
  const b=bboxUF[l.uf];return b?{x:b.x+b.width/2,y:b.y+b.height/2,aprox:true}:null;
}
let rectMapa=null;
function pxUnit(v){if(!rectMapa){const r=$('#mapa').getBoundingClientRect();rectMapa={w:r.width,h:r.height}}return rectMapa.w?Math.max(v.w/rectMapa.w,v.h/rectMapa.h):v.w/360}
const nivel=()=>cidadeSel?'cidade':estadoSel?'estado':'brasil';
function resumoUF(){
  const r={};
  lojasVis().forEach(l=>{(r[l.uf]=r[l.uf]||{lojas:0,vendas:0,comissao:0,pedidos:0}).lojas++});
  filtrados().forEach(o=>{const l=loja(o.loja),e=l&&r[l.uf];if(!e)return;e.vendas+=o.valor;e.comissao+=com(o);e.pedidos++});
  return r;
}
function atualizarMapa(alvo){
  const r=resumoUF();renderInfoUF(r);renderCrumbs();
  if(!mapaPronto)return;
  $('#mapa').classList.toggle('foco',!!estadoSel);
  document.querySelectorAll('#mapa .uf').forEach(p=>{
    const uf=p.dataset.uf,e=r[uf];
    p.classList.toggle('op',!!e);p.classList.toggle('sel',uf===estadoSel);
    p.setAttribute('aria-label',`${UFS[uf]}: ${e?e.lojas+' loja'+(e.lojas>1?'s':''):'sem operação'}`);
  });
  const s=document.querySelector('#mapa .uf.sel');if(s)s.parentNode.appendChild(s);
  renderPontos(alvo||view);
}
// --- desenho dos marcadores (em pixels de tela, escalados pelo zoom) ---
const PIN='M0 0C-1.6-4.6-9.5-8.6-9.5-17A9.5 9.5 0 1 1 9.5-17C9.5-8.6 1.6-4.6 0 0Z';
function pinSVG(l,st,aprox,i,lbl,esq){
  return `<g class="pin${aprox?' aprox':''}" data-pt="${l.id}" aria-label="${esc(l.nome)}"><ellipse class="sombra" rx="5" ry="2"/><g class="in drop" style="--d:${i*45}ms"><circle class="hit" cy="-15" r="15"/><path class="pin-c pt-${st}" d="${PIN}"/><circle class="pin-o" cy="-17" r="3.8"/></g>${lbl?`<text class="lbl" x="${esq?-13:13}" y="-13" text-anchor="${esq?'end':'start'}">${esc(lbl)}</text>`:''}</g>`;
}
function donutSVG(ls,alvo,i,lbl,esq){
  const n=ls.length,r=13+Math.min(7,n),C=2*Math.PI*r,cont={ok:0,warn:0,bad:0};ls.forEach(l=>cont[status(l)[0]]++);
  let off=0,arcs='';['ok','warn','bad'].forEach(s=>{if(!cont[s])return;const len=C*cont[s]/n;arcs+=`<circle class="arc st-${s}" r="${r}" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90)"/>`;off+=len});
  return `<g class="clu" ${alvo}><g class="in pop" style="--d:${i*45}ms"><circle class="hit" r="${r+8}"/><circle class="clu-b" r="${r}"/>${arcs}<text class="clu-t" dy="4.5">${n}</text></g>${lbl?`<text class="lbl" x="${esq?-(r+6):r+6}" y="4" text-anchor="${esq?'end':'start'}">${esc(lbl)}</text>`:''}</g>`;
}
function renderPontos(alvo){
  if(!mapaPronto||!medirMapa())return;
  const nv=nivel(),uT=pxUnit(alvo),vis=lojasVis(),vendas={},pos=new Map();
  filtrados().forEach(o=>vendas[o.loja]=(vendas[o.loja]||0)+o.valor);
  vis.forEach(l=>{const p=posLoja(l);if(p)pos.set(l.id,p)});
  const avg=ps=>({x:sum(ps,p=>p.x)/ps.length,y:sum(ps,p=>p.y)/ps.length});
  let h='',i=0;
  // bolhas por estado (no Brasil inteiro, e nos estados vizinhos quando um estado está aberto)
  const porUF={};vis.forEach(l=>{const p=pos.get(l.id);if(p)(porUF[l.uf]=porUF[l.uf]||[]).push(p)});
  Object.entries(porUF).forEach(([uf,ps])=>{
    if(nv!=='brasil'&&uf===estadoSel)return;
    const c=avg(ps),n=ps.length,r=15+Math.min(9,Math.sqrt(n)*2.4);
    h+=`<g class="mk bub-g${nv!=='brasil'?' longe':''}" data-x="${c.x}" data-y="${c.y}" data-uf="${uf}" aria-label="${UFS[uf]}: ${n} lojas"><g class="in pop" style="--d:${i++*60}ms"><circle class="halo" r="${r}"/><circle class="hit" r="${r+6}"/><circle class="bub" r="${r}"/><text class="bub-t" dy="4.8">${n}</text></g></g>`;
  });
  if(nv!=='brasil'){
    // agrupamento por distância na tela: pontos a menos de ~34px viram uma bolha só
    const thr=34*uT,spider=nv==='cidade'?cidadeSel:null,clus=[];
    vis.filter(l=>l.uf===estadoSel&&pos.get(l.id)).sort((a,b)=>(vendas[b.id]||0)-(vendas[a.id]||0)).forEach(l=>{
      if(spider&&l.cidade+'|'+l.uf===spider)return;
      const p=pos.get(l.id);let c=clus.find(c=>Math.hypot(c.x0-p.x,c.y0-p.y)<thr);
      if(!c){c={x0:p.x,y0:p.y,ls:[],ps:[],v:0};clus.push(c)}c.ls.push(l);c.ps.push(p);c.v+=vendas[l.id]||0;
    });
    clus.forEach(c=>{Object.assign(c,avg(c.ps));c.sx=c.x/uT;c.sy=c.y/uT;c.r=c.ls.length>1?13+Math.min(7,c.ls.length):10;c.cy=c.ls.length>1?0:-14});
    // nomes: só os que cabem sem cobrir outro marcador, outro nome ou a borda do mapa
    const caixas=[],dir=(alvo.x+alvo.w)/uT,esqLim=alvo.x/uT,MAXL=innerWidth<600?5:8;
    const bate=(b)=>caixas.some(o=>b.x0<o.x1&&b.x1>o.x0&&b.y0<o.y1&&b.y1>o.y0)||clus.some(o=>o.sx+o.r>b.x0&&o.sx-o.r<b.x1&&o.sy+o.cy+o.r>b.y0&&o.sy+o.cy-o.r<b.y1);
    clus.forEach(c=>{
      const cids=[...new Set(c.ls.map(l=>l.cidade))],aprox=c.ps.every(p=>p.aprox);
      let lbl='',esq=false;
      if(nv!=='cidade'&&!aprox&&caixas.length<MAXL){
        const w=cids[0].length*6.7+4,y0=c.sy+c.cy-9,y1=c.sy+c.cy+9;
        const B=[{x0:c.sx+c.r+4,x1:c.sx+c.r+4+w,y0,y1,e:false},{x0:c.sx-c.r-4-w,x1:c.sx-c.r-4,y0,y1,e:true}];
        const ok=B.find(b=>b.x1<dir-4&&b.x0>esqLim+4&&!bate(b));
        if(ok){caixas.push(ok);lbl=cids[0];esq=ok.e}
      }
      const alvoA=cids.length===1?`data-cid="${esc(cids[0]+'|'+estadoSel)}"`:`data-area="${c.ls.map(l=>l.id).join(',')}"`;
      h+=`<g class="mk${nv==='cidade'?' longe':''}" data-x="${c.x}" data-y="${c.y}">${c.ls.length>1?donutSVG(c.ls,alvoA,i++,lbl,esq):pinSVG(c.ls[0],status(c.ls[0])[0],aprox,i++,lbl,esq)}</g>`;
    });
    // cidade aberta: lojas abertas em leque, com o nome de cada uma
    if(spider){
      const ls=vis.filter(l=>l.cidade+'|'+l.uf===spider&&pos.get(l.id));
      if(ls.length){
        const c=avg(ls.map(l=>pos.get(l.id))),n=ls.length,R=n>1?40+n*4:0,aprox=pos.get(ls[0].id).aprox;
        let leque=n>1?`<circle class="leque-c" r="${Math.max(6,R*.18)}"/>`:'';
        ls.forEach((l,j)=>{const a=n>1?j/n*2*Math.PI-Math.PI/2:0,dx=Math.cos(a)*R,dy=Math.sin(a)*R+(n>1?17:0);
          leque+=`${n>1?`<line class="leque-l" x2="${dx}" y2="${dy-12}"/>`:''}<g transform="translate(${dx} ${dy})">${pinSVG(l,status(l)[0],aprox,j,l.nome,dx<-1)}</g>`});
        h+=`<g class="mk leque" data-x="${c.x}" data-y="${c.y}">${leque}</g>`;
      }
    }
  }
  const pts=$('#pts');pts.innerHTML=h;
  if(nv!==nivelAnt&&!semMov){pts.classList.remove('enter');void pts.getBBox();pts.classList.add('enter');clearTimeout(pts.t);pts.t=setTimeout(()=>pts.classList.remove('enter'),1400)}
  nivelAnt=nv;escalarPontos();
}
function escalarPontos(){
  const u=pxUnit(view);
  document.querySelectorAll('#pts .mk').forEach(g=>g.setAttribute('transform',`translate(${g.dataset.x} ${g.dataset.y}) scale(${u})`));
}
function renderCrumbs(){
  const c=$('#crumbs');
  if(!estadoSel){c.innerHTML='';c.hidden=true;return}
  c.hidden=false;
  c.innerHTML=`<button data-crumb="brasil">Brasil</button><span>›</span><button data-crumb="uf"${cidadeSel?'':' class="cur"'}>${UFS[estadoSel]}</button>${cidadeSel?`<span>›</span><button class="cur" data-crumb="cid">${esc(cidadeSel.split('|')[0])}</button>`:''}`;
}
// números do resumo contam até o valor quando o estado muda
function contar(box){
  if(semMov)return;
  box.querySelectorAll('[data-v]').forEach(el=>{const alvo=+el.dataset.v,din=el.dataset.m==='1',t0=performance.now();
    (function passo(t){const k=Math.min(1,(t-t0)/650),e=1-Math.pow(1-k,3),v=alvo*e;el.textContent=din?fmt.format(v):Math.round(v);if(k<1)requestAnimationFrame(passo)})(t0)});
}
function renderInfoUF(r){
  const box=$('#ufInfo'),ops=Object.keys(r).sort((a,b)=>r[b].vendas-r[a].vendas);
  const grade=e=>`<div class="ufstats"><div><span>Lojas</span><b class="num" data-v="${e.lojas}">${e.lojas}</b></div><div><span>Pedidos</span><b class="num" data-v="${e.pedidos}">${e.pedidos}</b></div><div><span>Vendas no período</span><b class="num" data-v="${e.vendas}" data-m="1">${fmt.format(e.vendas)}</b></div><div><span>Comissões</span><b class="num" data-v="${e.comissao}" data-m="1">${fmt.format(e.comissao)}</b></div></div>`;
  const chave=estadoSel+'|'+filtro.periodo+'|'+filtro.marca,mudou=chave!==infoKey;infoKey=chave;
  if(estadoSel){
    const e=r[estadoSel];
    box.innerHTML=e?`<div class="ufh"><h3>${UFS[estadoSel]}</h3><span class="tag">Com operação</span></div>${grade(e)}<div class="ufchips"><button class="chipbtn pri" data-ver-lojas>Ver as ${e.lojas} loja${e.lojas>1?'s':''}</button></div>`
      :`<div class="ufh"><h3>${UFS[estadoSel]}</h3><span class="tag off">Sem operação</span></div><p class="ufmsg">Ainda não existem lojas cadastradas ${emUF(estadoSel)}.</p><div class="ufchips"><button class="chipbtn pri" data-nova-uf="${estadoSel}">Cadastrar loja ${emUF(estadoSel)}</button></div>`;
  }else{
    const tot=Object.values(r).reduce((a,e)=>({lojas:a.lojas+e.lojas,vendas:a.vendas+e.vendas,comissao:a.comissao+e.comissao,pedidos:a.pedidos+e.pedidos}),{lojas:0,vendas:0,comissao:0,pedidos:0});
    box.innerHTML=`<div class="ufh"><h3>Brasil</h3><span class="ufsub">${ops.length} de 27 estados com operação</span></div>${grade(tot)}
      ${ops.length?`<div class="ufchips">${ops.map(u=>`<button class="chipbtn" data-uf="${u}">${UFS[u]}<small>${r[u].lojas}</small></button>`).join('')}</div>`:'<p class="ufmsg">Nenhuma loja cadastrada com o filtro atual.</p>'}
      <p class="ufmsg">Toque em um estado ou numa bolha para abrir as lojas.</p>`;
  }
  if(mudou){box.classList.remove('entra');void box.offsetWidth;box.classList.add('entra');contar(box)}
}
function setView(){$('#mapa').setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);escalarPontos()}
function animar(alvo){
  if(semMov){view={...alvo};setView();return}
  const ini={...view},t0=performance.now(),d=520;
  cancelAnimationFrame(animar.raf);
  (function passo(t){const k=Math.min(1,(t-t0)/d),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    for(const p in view)view[p]=ini[p]+(alvo[p]-ini[p])*e;setView();if(k<1)animar.raf=requestAnimationFrame(passo)})(t0);
}
function caixa(cx,cy,w,h){const ar=vbBase.w/vbBase.h;if(w/h>ar)h=w/ar;else w=h*ar;return{x:cx-w/2,y:cy-h/2,w,h}}
function alvoUF(uf){medirMapa();const b=bboxUF[uf];if(!b)return{...vbBase};return caixa(b.x+b.width/2,b.y+b.height/2,Math.max(b.width*1.45,vbBase.w*.26),Math.max(b.height*1.45,vbBase.h*.26))}
function alvoCidade(k){
  medirMapa();const ls=lojasVis().filter(l=>l.cidade+'|'+l.uf===k).map(posLoja).filter(Boolean);
  if(!ls.length)return alvoUF(estadoSel);
  const x=sum(ls,p=>p.x)/ls.length,y=sum(ls,p=>p.y)/ls.length;return caixa(x,y+vbBase.h*.006,vbBase.w*.085,vbBase.h*.085);
}
function selecionarUF(uf,manter){
  estadoSel=manter?uf:(estadoSel===uf?null:uf);cidadeSel=null;ufFil={cidade:'',marca:'',status:''};
  const temOp=estadoSel&&resumoUF()[estadoSel],alvo=temOp?alvoUF(estadoSel):{...vbBase};
  atualizarMapa(alvo);renderLojasUF(true);renderCidadeBox();
  if(mapaPronto)animar(alvo);
}
function selecionarCidade(k){
  if(!k){selecionarUF(estadoSel,true);return}
  const [c,uf]=k.split('|');estadoSel=uf;cidadeSel=k;ufFil={cidade:c,marca:'',status:''};
  const alvo=alvoCidade(k);atualizarMapa(alvo);renderLojasUF(true);renderCidadeBox();if(mapaPronto)animar(alvo);
}
function zoomArea(ids){
  const ps=ids.split(',').map(loja).filter(Boolean).map(posLoja).filter(Boolean);if(!ps.length)return;
  const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  cidadeSel=null;const alvo=caixa((x0+x1)/2,(y0+y1)/2,Math.max((x1-x0)*2.4,vbBase.w*.05),Math.max((y1-y0)*2.4,vbBase.h*.05));
  atualizarMapa(alvo);renderCidadeBox();animar(alvo);
}
function verBrasil(){estadoSel=null;cidadeSel=null;atualizarMapa(vbBase);renderLojasUF();renderCidadeBox();animar({...vbBase})}
// --- dica ao passar o mouse (computador) ---
function dica(e){
  const t=$('#dica');if(!temHover||colocando){t.hidden=true;return}
  const el=e.target.closest('#mapa [data-pt],#mapa [data-cid],#mapa [data-area],#mapa [data-uf]');
  if(!el){t.hidden=true;return}
  const ds=el.dataset,list=filtrados();let html='';
  if(ds.pt){const l=loja(ds.pt);if(!l)return;const[st,lab]=status(l);html=`<b>${esc(l.nome)}</b><span>${esc(l.cidade)}, ${l.uf}</span><span class="pill p-${st}">${lab}</span><span>${fmt.format(sum(list.filter(o=>o.loja===l.id),o=>o.valor))} no período</span>`}
  else if(ds.cid){const[c,uf]=ds.cid.split('|'),ls=lojasVis().filter(l=>l.cidade===c&&l.uf===uf),ids=new Set(ls.map(l=>l.id));html=`<b>${esc(c)}</b><span>${ls.length} lojas</span><span>${fmt.format(sum(list.filter(o=>ids.has(o.loja)),o=>o.valor))} no período</span><span class="hint2">Toque para abrir</span>`}
  else if(ds.area){const ls=ds.area.split(',').map(loja).filter(Boolean),ids=new Set(ls.map(l=>l.id));html=`<b>${ls.length} lojas nesta região</b><span>${esc([...new Set(ls.map(l=>l.cidade))].join(', '))}</span><span>${fmt.format(sum(list.filter(o=>ids.has(o.loja)),o=>o.valor))} no período</span><span class="hint2">Toque para aproximar</span>`}
  else{const e2=resumoUF()[ds.uf];html=`<b>${UFS[ds.uf]}</b><span>${e2?e2.lojas+' loja'+(e2.lojas>1?'s':'')+', '+fmt.format(e2.vendas):'Sem operação'}</span>`}
  const r=$('.mapstage').getBoundingClientRect();t.innerHTML=html;t.hidden=false;
  const x=e.clientX-r.left+16,y=e.clientY-r.top+16;t.style.left=Math.min(x,r.width-t.offsetWidth-8)+'px';t.style.top=Math.min(y,r.height-t.offsetHeight-8)+'px';
}
// --- marcar a localização de uma loja tocando no mapa ---
function iniciarColocacao(id){
  const l=loja(id);if(!l)return;colocando=id;fecharLoja();irAba('mapa');
  $('#coloca').hidden=false;$('#coloca span').innerHTML=`Toque no mapa onde fica <b>${esc(l.nome)}</b>, ${esc(l.cidade)}`;
  $('#mapa').classList.add('colocando');selecionarUF(l.uf,true);
  setTimeout(()=>$('.mapcard').scrollIntoView({behavior:semMov?'auto':'smooth',block:'center'}),50);
}
function pararColocacao(){colocando=null;$('#coloca').hidden=true;$('#mapa').classList.remove('colocando')}
function colocar(e){
  const l=loja(colocando);if(!l||!proj){pararColocacao();return}
  const svg=$('#mapa'),pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const sp=pt.matrixTransform(svg.getScreenCTM().inverse());
  const path=document.querySelector(`#mapa .uf[data-uf="${l.uf}"]`);
  if(path&&!path.isPointInFill(sp)){toast(`Toque dentro ${emUF(l.uf).replace(/^(na|no|em) /,m=>({'na ':'da ','no ':'do ','em ':'de '}[m]))}`);return}
  const p=P(l.uf);l.coord=[+p.lon(sp.x).toFixed(4),+p.lat(sp.y).toFixed(4)];
  if(!coordCidade(l.cidade,l.uf))COORDS[norm(l.cidade)+'|'+l.uf]=l.coord;
  pararColocacao();salvar();renderTudo();toast(`Localização de ${l.nome} salva`);
}
