// ---------- importar produtos pelo XML da NF-e ----------
// Lido no próprio aparelho: a nota não é enviada para nenhum servidor.
// Junta os tamanhos do mesmo modelo e cor ("VESTIDO ... - PRETO / P", "/ M"...) num produto só.

const NFE_NS='http://www.portalfiscal.inf.br/nfe';
const PEQUENAS=new Set(['de','da','do','das','dos','e','com','sem','em','para','por','a','o','as','os','na','no','x']);
// "VESTIDO AJUSTADO GOLA ALTA" -> "Vestido ajustado gola alta"; mantém siglas curtas com número (P, M, 40, 500ML)
function nomeBonito(s){
  s=String(s||'').replace(/\s+/g,' ').trim();if(!s||s!==s.toUpperCase())return s;
  const p=s.toLowerCase().split(' ');
  return p.map((w,i)=>i===0?w.charAt(0).toUpperCase()+w.slice(1):/\d/.test(w)?w.toUpperCase():w).join(' ').replace(/ - (\p{L})/gu,(m,c)=>' - '+c.toUpperCase());
}
function lerNfe(texto,nomeArq){
  const doc=new DOMParser().parseFromString(texto,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw new Error(`${nomeArq}: o arquivo não é um XML válido.`);
  const tag=(el,n)=>{const x=el.getElementsByTagNameNS(NFE_NS,n)[0]||el.getElementsByTagName(n)[0];return x?x.textContent.trim():''};
  const infNFe=doc.getElementsByTagNameNS(NFE_NS,'infNFe')[0]||doc.getElementsByTagName('infNFe')[0];
  if(!infNFe)throw new Error(`${nomeArq}: não parece ser o XML de uma nota fiscal (NF-e).`);
  const emit=infNFe.getElementsByTagNameNS(NFE_NS,'emit')[0]||infNFe.getElementsByTagName('emit')[0];
  const ide=infNFe.getElementsByTagNameNS(NFE_NS,'ide')[0]||infNFe.getElementsByTagName('ide')[0];
  const dets=[...(infNFe.getElementsByTagNameNS(NFE_NS,'det').length?infNFe.getElementsByTagNameNS(NFE_NS,'det'):infNFe.getElementsByTagName('det'))];
  const itens=dets.map(d=>{const p=d.getElementsByTagNameNS(NFE_NS,'prod')[0]||d.getElementsByTagName('prod')[0];if(!p)return null;
    const v=n=>parseFloat(tag(p,n))||0,imp=d.getElementsByTagNameNS(NFE_NS,'imposto')[0]||d.getElementsByTagName('imposto')[0],vi=n=>imp?parseFloat(tag(imp,n))||0:0;
    const q=v('qCom'),vu=v('vUnCom'),vp=v('vProd');
    // custo de verdade: produto - desconto + frete, seguro e outras despesas + IPI e ICMS-ST do item
    const total=vp-v('vDesc')+v('vFrete')+v('vSeg')+v('vOutro')+vi('vIPI')+vi('vICMSST')+vi('vFCPST');
    const unit=q>0?total/q:vu,ean=tag(p,'cEAN');
    return{cod:(tag(p,'cProd')||(/^\d{8,14}$/.test(ean)?ean:'')).slice(0,60),nome:tag(p,'xProd'),un:unOk(tag(p,'uCom')),q,unit:Math.round(unit*100)/100}}).filter(x=>x&&x.nome);
  if(!itens.length)throw new Error(`${nomeArq}: a nota não tem produtos.`);
  return{arq:nomeArq,cnpj:tag(emit||infNFe,'CNPJ')||tag(emit||infNFe,'CPF'),emitente:tag(emit||infNFe,'xFant')||tag(emit||infNFe,'xNome'),razao:tag(emit||infNFe,'xNome'),numero:tag(ide||infNFe,'nNF'),natureza:tag(ide||infNFe,'natOp'),itens};
}
// separa "MODELO - COR / TAMANHO"; sem esse padrão, cada item é um produto
function separarTamanho(nome){const m=/^(.*\S)\s*\/\s*([^/]{1,12})$/.exec(nome);return m&&/ - /.test(m[1])?{base:m[1],tam:m[2].trim()}:null}
const prefixoComum=cs=>{if(!cs.length)return'';let p=cs[0];for(const c of cs)while(!c.startsWith(p))p=p.slice(0,-1);return p};
function agruparNfe(itens,juntar){
  if(!juntar)return itens.map(i=>({ref:i.cod,nome:nomeBonito(i.nome),un:i.un,custo:i.unit,qtd:i.q,tams:[]}));
  const g=new Map();
  for(const i of itens){const s=separarTamanho(i.nome),k=s?norm(s.base)+'|'+i.unit:'#'+i.cod+'|'+norm(i.nome)+'|'+i.unit;
    if(!g.has(k))g.set(k,{base:s?s.base:i.nome,itens:[],tams:[]});const x=g.get(k);x.itens.push(i);if(s&&!x.tams.includes(s.tam))x.tams.push(s.tam)}
  return[...g.values()].map(x=>{const cs=x.itens.map(i=>i.cod),pre=prefixoComum(cs);
    return{ref:x.itens.length>1&&pre.length>=4?pre:cs[0],nome:nomeBonito(x.base)+(x.tams.length>1?` (${x.tams.join(', ')})`:x.tams.length===1&&x.itens.length===1?` / ${x.tams[0]}`:''),
      un:x.itens[0].un,custo:x.itens[0].unit,qtd:x.itens.reduce((a,i)=>a+i.q,0),tams:x.tams}});
}
function marcaDaNota(n){const a=norm(n.emitente),b=norm(n.razao);
  return MARCAS.find(m=>{const k=norm(m.nome);return k.length>=3&&(a.includes(k)||b.includes(k)||k.includes(a.split(' ').slice(0,2).join(' ')))})}
const tituloCada=s=>String(s).toLowerCase().split(' ').map((w,i)=>i&&PEQUENAS.has(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
const nomeMarcaDaNota=n=>tituloCada(String(n.emitente||n.razao).replace(/\b(IND(USTRIA)?|COM(ERCIO)?|CONFEC[CÇ](OES|ÕES))\.?(\s+(E|DE|DO|DA)\b)*/gi,' ').replace(/\b(LTDA|S\.?\s?A\.?|EIRELI|ME|EPP)\b\.?/gi,' ').replace(/\s+/g,' ').trim()).slice(0,40);

// XML de NF-e deveria ser UTF-8, mas alguns sistemas salvam em ISO-8859-1: respeita o que o arquivo declara
async function textoXml(f){const b=new Uint8Array(await f.arrayBuffer());
  const cab=new TextDecoder('latin1').decode(b.slice(0,200)),m=/encoding=["']([\w-]+)["']/i.exec(cab);
  let enc=m?m[1].toLowerCase():'utf-8';if(!/^(utf-8|utf8|iso-8859-1|latin1|windows-1252|cp1252)$/.test(enc))enc='utf-8';
  let t=new TextDecoder(enc==='utf8'?'utf-8':enc).decode(b);if(enc.startsWith('utf')&&t.includes('\uFFFD'))t=new TextDecoder('windows-1252').decode(b);return t.replace(/^\uFEFF/,'')}
async function lerNotas(files){
  const notas=[],erros=[];
  for(const f of files){
    if(f.size>8e6){erros.push(`${f.name}: arquivo grande demais.`);continue}
    try{notas.push(lerNfe(await textoXml(f),f.name))}catch(e){erros.push(e.message)}
  }
  if(!notas.length){ip.erro=erros[0]||'Nenhuma nota encontrada nos arquivos.';renderImportProd();return}
  const emits=[...new Map(notas.map(n=>[(n.cnpj||'').slice(0,8)||norm(n.razao),n.emitente])).values()];
  if(emits.length>1){ip.erro=`As notas são de fornecedores diferentes (${emits.slice(0,3).join(', ')}). Importe as notas de uma marca por vez.`;renderImportProd();return}
  const m=marcaDaNota(notas[0]);
  ip.nf={notas,erros,marca:m?m.id:'nova',nomeNova:nomeMarcaDaNota(notas[0]),juntar:true,valorE:'custo',margem:'',atualizarPreco:false};
  ip.etapa='nota';renderImportProd();
}
function produtosDaNota(){const n=ip.nf;return agruparNfe(n.notas.flatMap(x=>x.itens),n.juntar)}
function precoDeVenda(custo){const n=ip.nf,mg=num(n.margem);return n.valorE==='venda'?custo:mg>0?Math.round(custo*(1+mg/100)*100)/100:0}
function corpoNota(){
  const n=ip.nf,ps=produtosDaNota(),tot=n.notas.reduce((a,x)=>a+x.itens.length,0),mid=n.marca;
  const chave=p=>p.ref?'r:'+norm(p.ref):'n:'+norm(p.nome),existentes=mid&&mid!=='nova'?new Set(PRODUTOS.filter(p=>p.marca===mid).map(chave)):new Set();
  const atual=ps.filter(p=>existentes.has(chave(p))).length;
  const ex=ps.slice(0,5).map(p=>{const pv=precoDeVenda(p.custo);return`<div class="ped"><div class="grow"><div class="t">${esc(p.nome)}</div><div class="s">Ref. ${esc(p.ref)}${n.valorE==='custo'?` · custo ${precoBR(p.custo)}`:''}${pv?` · venda ${precoBR(pv)}`:''}${unCurta(p.un)?' / '+unCurta(p.un):''}</div></div></div>`}).join('');
  return`<div class="plan-top"><div class="grow"><b>${n.notas.length===1?`Nota ${esc(n.notas[0].numero)}`:`${n.notas.length} notas`} · ${esc(n.notas[0].emitente)}</b><div class="s">${tot.toLocaleString('pt-BR')} itens na nota${n.notas[0].natureza?` · ${esc(nomeBonito(n.notas[0].natureza))}`:''}</div></div><button class="chipbtn" data-ip-voltar>Trocar</button></div>
    ${n.erros.length?`<p class="s" style="color:var(--warn)">${n.erros.map(esc).join('<br>')}</p>`:''}
    <label class="f" for="nfMarca">Marca destes produtos</label><select id="nfMarca" data-sem-combo>${MARCAS.map(m=>`<option value="${esc(m.id)}"${m.id===mid?' selected':''}>${esc(m.nome)}</option>`).join('')}<option value="nova"${mid==='nova'?' selected':''}>Nova marca: ${esc(n.nomeNova)}</option></select>
    ${mid==='nova'?`<label class="f" for="nfNovaNome">Nome da marca nova</label><input id="nfNovaNome" type="text" maxlength="40" value="${esc(n.nomeNova)}" autocomplete="off"><label class="f" for="nfNovaTaxa">Comissão da marca (%)</label><div class="valor taxa"><input id="nfNovaTaxa" class="num" type="text" inputmode="decimal" placeholder="10" maxlength="6" autocomplete="off" value="${esc(n.taxaNova||'')}"><span>%</span></div>`:''}
    <label class="check" style="margin-top:var(--s3)"><input type="checkbox" id="nfJuntar"${n.juntar?' checked':''}> Juntar os tamanhos do mesmo modelo e cor num produto só</label>
    <fieldset class="radios" style="margin-top:var(--s3)"><legend class="f">O valor de cada item na nota é</legend>
      <label class="check"><input type="radio" name="nfValor" value="custo"${n.valorE==='custo'?' checked':''}> O meu custo (quanto eu pago, já com desconto, frete, IPI e ST da nota)</label>
      <label class="check"><input type="radio" name="nfValor" value="venda"${n.valorE==='venda'?' checked':''}> O preço de venda para o cliente</label></fieldset>
    ${n.valorE==='custo'?`<label class="f" for="nfMargem">Preço de venda = custo + <small class="opc">opcional, em %</small></label><div class="valor taxa"><input id="nfMargem" class="num" type="text" inputmode="decimal" placeholder="0" maxlength="6" autocomplete="off" value="${esc(n.margem)}"><span>%</span></div><p class="s">Deixe em branco para pôr o preço de venda depois, produto a produto.</p>`:''}
    ${atual?`<label class="check"><input type="checkbox" id="nfAtualizar"${n.atualizarPreco?' checked':''}> Atualizar também o preço de venda dos ${atual} que já estão no catálogo</label>`:''}
    <h3 style="margin:var(--s4) 0 var(--s2)">${ps.length.toLocaleString('pt-BR')} produtos${atual?` · ${atual} já no catálogo (atualiza o custo)`:''}</h3>
    <div class="list">${ex}</div>${ps.length>5?`<p class="s">E mais ${(ps.length-5).toLocaleString('pt-BR')}.</p>`:''}
    <div class="erro" id="nfErro" hidden></div>
    <button class="btn" data-nf-salvar>Importar ${ps.length.toLocaleString('pt-BR')} produtos</button>`;
}
function salvarNota(){
  const n=ip.nf,err=m=>{const e=$('#nfErro');e.textContent=m;e.hidden=false};
  let mid=n.marca;
  if(mid==='nova'){const nome=($('#nfNovaNome')||{}).value?.trim()||n.nomeNova,tx=num(($('#nfNovaTaxa')||{}).value||'');
    if(!nome)return err('Digite o nome da marca.');if(!(tx>0&&tx<=100))return err('Digite a comissão da marca, de 0,01% a 100%.');
    const ja=MARCAS.find(m=>norm(m.nome)===norm(nome));
    if(ja)mid=ja.id;else{const m={id:'M'+Date.now(),nome:nome.slice(0,40),taxa:Math.round(tx*1000)/100000,cor:PALETA[MARCAS.length%PALETA.length]};MARCAS.push(m);mid=m.id}}
  const ps=produtosDaNota(),chave=p=>p.ref?'r:'+norm(p.ref):'n:'+norm(p.nome),porRef=new Map(PRODUTOS.filter(p=>p.marca===mid).map(p=>[chave(p),p]));let novos=0,atual=0;
  for(const x of ps){const pv=precoDeVenda(x.custo),e=porRef.get(chave(x));
    if(e){e.custo=x.custo;if(n.atualizarPreco&&pv)e.preco=pv;if(x.un&&x.un!=='un')e.un=x.un;atual++}
    else{const p={id:novoIdProd(),marca:mid,ref:x.ref,nome:x.nome.slice(0,160),preco:pv,foto:'',...(n.valorE==='custo'?{custo:x.custo}:{}),...(x.un&&x.un!=='un'?{un:x.un}:{})};PRODUTOS.push(p);porRef.set(chave(p),p);novos++}}
  salvar();if(typeof preencherForm==='function')preencherForm();renderItensForm();renderProdutos();
  ip.fim={novos,atual,fotos:0,falhas:0};ip.etapa='pronto';renderImportProd();
  toast(`${(novos+atual).toLocaleString('pt-BR')} produtos salvos no catálogo`);
}
document.addEventListener('change',e=>{
  const t=e.target;if(!t||!ip)return;
  if(t.id==='ipXml'){const fs=[...t.files];t.value='';if(fs.length)lerNotas(fs);return}
  if(!ip.nf)return;
  if(t.id==='nfMarca'){ip.nf.marca=t.value;renderImportProd()}
  else if(t.id==='nfJuntar'){ip.nf.juntar=t.checked;renderImportProd()}
  else if(t.name==='nfValor'){ip.nf.valorE=t.value;renderImportProd()}
  else if(t.id==='nfAtualizar'){ip.nf.atualizarPreco=t.checked}
  else if(t.id==='nfMargem'){ip.nf.margem=t.value;renderImportProd()}
  else if(t.id==='nfNovaNome'){ip.nf.nomeNova=t.value}
  else if(t.id==='nfNovaTaxa'){ip.nf.taxaNova=t.value}
});
document.addEventListener('click',e=>{if(e.target.closest('[data-nf-salvar]'))salvarNota()});
