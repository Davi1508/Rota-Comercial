// ---------- todas as cidades do Brasil ----------
// mapa/cidades.json: {"UF":"Nome|lon|lat;..."} com as 5.570 cidades (IBGE, via municipios-brasileiros, MIT).
// Carrega depois que o app abriu; as cidades da lista curta continuam valendo enquanto isso.
let CIDADES_TODAS=null;
function mesclarCidades(d){
  CIDADES_TODAS={};
  for(const [uf,txt] of Object.entries(d)){
    const nomes=[];
    for(const item of txt.split(';')){
      const [n,lon,lat]=item.split('|');if(!n)continue;
      const k=norm(n)+'|'+uf;nomes.push(n);
      if(!COORDS[k]){COORDS[k]=[+lon,+lat];NOMES[k]=n}
    }
    CIDADES_TODAS[uf]=nomes;
  }
}
async function carregarCidades(){
  try{
    const r=await fetch('mapa/cidades.json');if(!r.ok)return;
    mesclarCidades(await r.json());
    // lojas que estavam sem lugar no mapa e agora têm cidade conhecida
    const achou=lojas.some(l=>!l.coord&&coordCidade(l.cidade,l.uf));
    if(achou)renderTudo();
    if(!$('#formLoja').hidden)dicaCidade();
    listaCidades();
  }catch(e){}
}
// sugestões enquanto digita a cidade, da UF escolhida
function listaCidades(){
  const inp=$('#lCidade');if(!inp||!CIDADES_TODAS)return;
  let dl=$('#cidList');if(!dl){dl=document.createElement('datalist');dl.id='cidList';inp.after(dl);inp.setAttribute('list','cidList')}
  const uf=$('#lUF').value;if(dl.dataset.uf===uf)return;
  dl.dataset.uf=uf;dl.innerHTML=(CIDADES_TODAS[uf]||[]).map(n=>`<option value="${esc(n)}">`).join('');
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='lUF')listaCidades()});
setTimeout(carregarCidades,600);
