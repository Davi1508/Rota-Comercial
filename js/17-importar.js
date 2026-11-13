// ---------- importar relatório de outra IA ----------
let impTxt='',impItens=null,impErro='';
function instrucoesImport(){
  const ls=lojas.map(l=>`${l.nome} (${l.cidade}/${l.uf})`).join('; ')||'(nenhuma ainda: todas serão cadastradas)';
  const ms=MARCAS.map(m=>m.nome).join('; ')||'(nenhuma: cadastre as marcas no app antes)',rs=REGIOES.join('; ')||'(nenhuma)',cs=COLECOES.join('; ')||'(nenhuma)';
  return `Leia o relatório e devolva SOMENTE uma lista JSON, sem nenhum texto antes ou depois. Cada item da lista é um lançamento, de um destes 3 tipos:

1) Loja (cadastro de loja nova):
{"tipo":"loja","nome":"Boutique Ondina","cidade":"Salvador","uf":"BA","regiao":"Baixo Sul","marcas":["Maré Alta"]}

2) Pedido de venda:
{"tipo":"pedido","data":"2026-11-09","loja":"Boutique Ondina","cidade":"Salvador","uf":"BA","regiao":"Baixo Sul","marca":"Maré Alta","valor":1500.00,"pago":false,"colecao":"Inverno"}

3) Despesa de viagem:
{"tipo":"despesa","data":"2026-11-10","valor":120.50,"categoria":"Combustível","descricao":"Gasolina em Barreiras"}

Regras:
- Datas sempre no formato AAAA-MM-DD. Valores só com números e ponto decimal, sem R$ e sem separador de milhar.
- Se a loja de um pedido não estiver na lista de lojas cadastradas abaixo, ela será cadastrada sozinha: nesse caso informe sempre "cidade" e "uf" (sigla do estado, ex.: BA). Se não souber o estado, use BA.
- Para lojas já cadastradas, use o nome exatamente como está na lista abaixo.
- "regiao" e "colecao" precisam ser exatamente um dos nomes das listas abaixo.
- "marca": use o nome da lista abaixo. Se for uma marca que não está na lista, escreva o nome exatamente como aparece no relatório; o app vai pedir a comissão antes de lançar.
- "pago": true se a comissão do pedido já foi recebida, false se não.
- Categorias de despesa sugeridas: Combustível, Alimentação, Hospedagem, Pedágio, Transporte, Estacionamento.
- Não invente dados. Se faltar data, valor, loja ou marca, deixe o item de fora.
- Pode entregar como texto, como arquivo .json ou como .html (com a lista dentro de <script type="application/json">).

Lojas cadastradas (nome, cidade/UF): ${ls}
Marcas: ${ms}
Regiões: ${rs}
Coleções: ${cs}`;
}
const GENERICAS=new Set(['loja','lojas','moda','modas','store','boutique','casa','fashion','center','the','das','dos','atelie','emporio','vitrine','jeans','kids','look','chic','estilo','cia']);
const palavras=s=>norm(s).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!GENERICAS.has(w));
function parecido(a,b){const A=palavras(a),B=palavras(b),na=norm(a),nb=norm(b);return A.some(w=>B.includes(w))||na.includes(nb)||nb.includes(na)}
// Acha a loja do relatório; se não existir, prepara o cadastro (feito só na hora de lançar)
function resolverLoja(x,novas){
  const nome=String(x.loja||x.nome||'').trim();if(!nome)return{erro:'Falta o nome da loja'};
  const u0=String(x.uf||x.estado||'').trim(),uf=UFS[u0.toUpperCase()]?u0.toUpperCase():(UF_POR_NOME[norm(u0)]||'BA');
  const cid=String(x.cidade||'').trim();
  const ex=ativas().filter(l=>norm(l.nome)===norm(nome));
  if(ex.length)return{l:ex.find(l=>cid&&norm(l.cidade)===norm(cid))||ex[0]};
  if(!cid)return{erro:`A loja "${nome}" não está cadastrada e o relatório não diz a cidade`};
  const cidade=nomeCidade(cid,uf),k=norm(nome)+'|'+norm(cidade)+'|'+uf;
  const reg=String(x.regiao||'').trim(),regOk=REGIOES.find(r=>norm(r)===norm(reg))||'';
  let nv=novas.get(k);if(!nv){nv={k,nome,cidade,uf,regiao:regOk};novas.set(k,nv)}else if(!nv.regiao&&regOk)nv.regiao=regOk;
  return{nova:nv,parecida:ativas().find(l=>parecido(l.nome,nome)),regAviso:reg&&!regOk?reg:''};
}
function msgNova(nv,regAviso){return `Pronto para lançar · loja nova em ${nv.cidade}/${nv.uf}${coordCidade(nv.cidade,nv.uf)?'':' (marque no mapa depois)'}${regAviso?` · região "${regAviso}" não existe, fica sem região`:''}`}
function marcarParecida(r,res){r.ok=false;r.forcavel=true;r.msgOk=msgNova(res.nova,res.regAviso);r.msg=`Parecida com "${res.parecida.nome}" (${res.parecida.cidade}). Se for a mesma loja, corrija o nome no relatório. Se for outra, toque em Criar como nova.`}
function analisarItem(x,vistos,novas){
  const r={ok:false,resumo:'',msg:'',dados:null};
  if(!x||typeof x!=='object')return(r.msg='Item inválido',r);
  if(x.tipo==='loja'){
    const res=resolverLoja(x,novas);r.resumo=`Loja · ${String(x.nome||x.loja||'?')} · ${String(x.cidade||'?')}`;
    if(res.erro)return(r.msg=res.erro,r);
    if(res.l)return(r.msg='Essa loja já está cadastrada',r);
    const nomes=Array.isArray(x.marcas)?x.marcas:String(x.marcas||'').split(/[;,]/).map(s=>s.trim()).filter(Boolean);
    const ids=nomes.map(n=>(MARCAS.find(m=>norm(m.nome)===norm(n))||{}).id);
    const falta=nomes.filter((n,i)=>!ids[i]);
    if(falta.length){falta.forEach(pedirMarca);return(r.msg=falta.length>1?`Marcas novas: ${falta.join(', ')}. Informe a comissão no quadro acima.`:pedirMarca(falta[0]),r)}
    r.dados={tipo:'loja',novaKey:res.nova.k,marcas:ids};
    if(res.parecida){marcarParecida(r,res);return r}
    r.ok=true;r.msg=msgNova(res.nova,res.regAviso);return r;
  }
  let dataTxt0=String(x.data||'').trim();const br=dataTxt0.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(br)dataTxt0=`${br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`;
  const ds=/^\d{4}-\d{2}-\d{2}$/.test(dataTxt0)&&isoD(deIso(dataTxt0))===dataTxt0?deIso(dataTxt0):null;
  const val=Math.round((typeof x.valor==='number'?x.valor:num(x.valor))*100)/100;
  if(!ds)return(r.msg='Data inválida (use AAAA-MM-DD)',r);
  if(ds>HOJE)return(r.msg='Data no futuro',r);
  if(!(val>0))return(r.msg='Valor inválido',r);
  const dt=ds.toLocaleDateString('pt-BR');
  if(x.tipo==='despesa'){
    const cat=String(x.categoria||'').trim(),desc=String(x.descricao||'').trim();
    r.resumo=`Despesa · ${dt} · ${fmt2.format(val)} · ${desc||cat||'sem descrição'}`;
    const k=['d',isoD(ds),val,cat,desc].join('|');
    if(vistos.has(k)||DESPESAS.some(d=>isoD(d.data)===isoD(ds)&&d.valor===val&&(d.descricao||'')===desc&&(d.categoria||'')===cat))return(r.msg='Já existe igual: não será lançado de novo',r);
    vistos.add(k);r.ok=true;r.msg='Pronto para lançar';r.dados={tipo:'despesa',data:ds,valor:val,categoria:cat,descricao:desc};return r;
  }
  if(x.tipo==='pedido'){
    const m=MARCAS.find(m=>norm(m.nome)===norm(x.marca||'')),col0=String(x.colecao||'').trim(),col=COLECOES.find(c=>norm(c)===norm(col0));
    r.resumo=`Pedido · ${dt} · ${fmt2.format(val)} · ${x.loja||'?'} · ${m?m.nome:(x.marca||'?')}`;
    if(!m)return(r.msg=String(x.marca||'').trim()?pedirMarca(String(x.marca)):'Falta a marca do pedido',r);
    if(col0&&!col)return(r.msg=`Coleção "${col0}" não existe em Ajustes`,r);
    const res=resolverLoja(x,novas);if(res.erro)return(r.msg=res.erro,r);
    const lk=res.l?res.l.id:'novo:'+res.nova.k,k=['p',lk,m.id,isoD(ds),val].join('|');
    if(vistos.has(k)||(res.l&&pedidos.some(o=>o.loja===res.l.id&&o.marca===m.id&&o.valor===val&&isoD(o.data)===isoD(ds))))return(r.msg='Já existe igual: não será lançado de novo',r);
    vistos.add(k);r.dados={tipo:'pedido',data:ds,valor:val,loja:res.l?res.l.id:null,novaKey:res.nova?res.nova.k:null,marca:m.id,pago:simNao(x.pago),colecao:col||''};
    if(res.nova&&res.parecida){marcarParecida(r,res);return r}
    r.ok=true;r.msg=res.nova?msgNova(res.nova,res.regAviso):'Pronto para lançar';return r;
  }
  r.msg='Tipo desconhecido (use "loja", "pedido" ou "despesa")';return r;
}
const CAMPOS_TAB={data:'data',valor:'valor',categoria:'categoria',descricao:'descricao',descrição:'descricao',loja:'loja',nome:'nome',cidade:'cidade',uf:'uf',estado:'uf',regiao:'regiao',região:'regiao',marcas:'marcas',marca:'marca',pago:'pago',colecao:'colecao',coleção:'colecao',tipo:'tipo'};
const simNao=v=>typeof v==='boolean'?v:/^(sim|s|true|x|pago|recebida)$/i.test(String(v||'').trim());
// Procura a lista: texto JSON, ou HTML com JSON dentro (script, pre, code) ou uma tabela com cabeçalho
function extrairLista(txt){
  const t=String(txt||'').trim();if(!t)return null;
  const fromJson=s=>{try{const a=JSON.parse(s);const arr=Array.isArray(a)?a:(a&&(a.itens||a.lancamentos));return Array.isArray(arr)?arr:null}catch(e){return null}};
  if(!/^</.test(t))return fromJson(t.replace(/^```(?:json)?\s*|\s*```$/g,''));
  const doc=new DOMParser().parseFromString(t,'text/html');
  for(const el of doc.querySelectorAll('script,pre,code,textarea')){const a=fromJson(el.textContent.trim().replace(/^```(?:json)?\s*|\s*```$/g,''));if(a&&a.length&&typeof a[0]==='object')return a}
  for(const tb of doc.querySelectorAll('table')){
    const rows=[...tb.querySelectorAll('tr')].map(r=>[...r.children].map(c=>c.textContent.trim()));if(rows.length<2)continue;
    const head=rows[0].map(h=>CAMPOS_TAB[norm(h)]||CAMPOS_TAB[h.toLowerCase()]||null);if(!head.includes('data')||!head.includes('valor'))continue;
    return rows.slice(1).filter(r=>r.some(Boolean)).map(r=>{const o={};head.forEach((k,i)=>{if(k)o[k]=r[i]});if(!o.tipo)o.tipo=o.loja?'pedido':(o.nome&&!o.valor)?'loja':'despesa';return o});
  }
  return null;
}
let impNovas=new Map(),impMarcasNovas=new Map(),impUltimo='';
const pedirMarca=n=>{const k=norm(n);if(!impMarcasNovas.has(k))impMarcasNovas.set(k,n.trim());return `Marca nova: ${n.trim()}. Informe a comissão dela no quadro acima.`};
function processarRelatorio(txt){
  impErro='';impItens=null;impNovas=new Map();impMarcasNovas=new Map();impUltimo=txt;
  const arr=extrairLista(txt);
  if(!arr||!arr.length){impErro='Não achei a lista de lançamentos. Aceito texto com a lista JSON, um arquivo .json ou um .html com a lista ou uma tabela.';renderAjustes();return}
  const vistos=new Set();impItens=arr.map((x,i)=>{if(x&&typeof x.tipo==='string')x.tipo=x.tipo.trim().toLowerCase();const r=analisarItem(x,vistos,impNovas);if(!r.resumo)r.resumo=`Item ${i+1}`;return r});renderAjustes();
}
function conferirImport(){impTxt=$('#impTexto').value;processarRelatorio(impTxt)}
function cadastrarMarcasImport(){
  const ins=[...document.querySelectorAll('[data-taxa-nova]')],novas=[];
  for(const el of ins){const t=num(el.value);if(!(t>0&&t<=50)){toast(`Informe a comissão de ${el.dataset.taxaNova} (entre 0,1% e 50%)`);el.focus();return}novas.push([el.dataset.taxaNova,t])}
  novas.forEach(([nome,t])=>{if(!MARCAS.some(m=>norm(m.nome)===norm(nome)))MARCAS.push({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nome,taxa:+(t/100).toFixed(4),cor:PALETA[MARCAS.length%PALETA.length]})});
  salvar();preencherMarcas();syncMarcaLoja();renderTudo();processarRelatorio(impUltimo);
  toast(`${novas.length} ${novas.length===1?'marca cadastrada':'marcas cadastradas'}. Confira e lance.`);
}
function forcarImport(i){
  const k=impItens[i]&&impItens[i].dados&&impItens[i].dados.novaKey;if(!k)return;
  impItens.forEach(x=>{if(x.forcavel&&x.dados&&x.dados.novaKey===k){x.ok=true;x.forcavel=false;x.msg=x.msgOk}});renderAjustes();
}
function lancarImport(){
  const ok=(impItens||[]).filter(x=>x.ok);if(!ok.length)return;
  const criadas=new Map();
  const lojaDe=d=>{if(d.loja)return loja(d.loja);let l=criadas.get(d.novaKey);
    if(!l){const nv=impNovas.get(d.novaKey);l={id:'N'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),nome:nv.nome,cidade:nv.cidade,uf:nv.uf,regiao:nv.regiao,marcas:[],coord:coordCidade(nv.cidade,nv.uf)};lojas.push(l);criadas.set(d.novaKey,l)}
    return l};
  ok.forEach(({dados:d})=>{
    if(d.tipo==='despesa')DESPESAS.push({id:'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),data:d.data,valor:d.valor,categoria:d.categoria,descricao:d.descricao});
    else if(d.tipo==='loja'){const l=lojaDe(d);d.marcas.forEach(m=>{if(!l.marcas.includes(m))l.marcas.push(m)})}
    else{const l=lojaDe(d);const o=addPedido(l.id,d.marca,d.valor,d.data,d.pago);o.colecao=d.colecao;if(!l.marcas.includes(d.marca))l.marcas.push(d.marca)}
  });
  const n=ok.length,nl=criadas.size,sem=[...criadas.values()].filter(l=>!l.coord).length;
  impItens=null;impTxt='';impNovas=new Map();salvar();preencherLojas();syncMarcaLoja();renderTudo();renderAjustes();
  toast(`${n} ${n===1?'item lançado':'itens lançados'}${nl?`, ${nl} ${nl===1?'loja cadastrada':'lojas cadastradas'}`:''}${sem?`. ${sem} sem lugar no mapa: abra a loja e toque em Marcar no mapa`:''}`);
}
function blocoImportar(){
  const pv=impItens?`<div class="list" style="margin-top:var(--s2)">${impItens.map((x,i)=>`<div class="row"><div class="grow"><div class="t">${esc(x.resumo||'Item')}</div><div class="s"${x.ok?'':` style="color:var(--${x.forcavel?'warn':'bad'})"`}>${esc(x.msg)}</div>${x.forcavel?`<button class="chipbtn" data-forcar-imp="${i}" style="margin-top:var(--s2)">Criar como nova</button>`:''}</div></div>`).join('')}</div>`
    +(()=>{const n=impItens.filter(x=>x.ok).length;return `<button class="btn acc" data-lancar-imp ${n?'':'disabled'}>Lançar ${n} ${n===1?'item':'itens'}</button>`})():'';
  return `<h2>Importar relatório de outra IA</h2>
    <p class="ufmsg" style="margin-top:0">Peça à outra IA o relatório no formato abaixo, cole aqui, confira e lance tudo de uma vez.</p>
    <button class="btn ghost" data-copiar-instr>Copiar instruções para a outra IA</button>
    <textarea id="impTexto" rows="5" placeholder="Cole aqui a lista JSON" style="margin-top:var(--s2)">${esc(impTxt)}</textarea>
    <button class="btn" data-conferir-imp>Conferir texto colado</button>
    <label class="btn ghost" style="text-align:center;cursor:pointer">Escolher arquivo (.json ou .html)<input type="file" id="impArq" accept=".json,.html,.htm,application/json,text/html,text/plain" hidden></label>
    ${impErro?`<div class="erro">${esc(impErro)}</div>`:''}${impMarcasNovas.size?`<div class="aviso" style="margin-top:var(--s2)"><b>${impMarcasNovas.size===1?'Marca nova no relatório':'Marcas novas no relatório'}</b><p class="s" style="margin:var(--s1) 0 var(--s2)">Informe a comissão de cada uma para lançar os itens dela.</p>${[...impMarcasNovas.values()].map(n=>`<label class="f" style="margin-top:var(--s2)">${esc(n)} · comissão (%)</label><input type="text" inputmode="decimal" placeholder="Ex.: 10 ou 8,5" data-taxa-nova="${esc(n)}" autocomplete="off">`).join('')}<button class="btn" data-cad-marcas-imp>Cadastrar ${impMarcasNovas.size===1?'marca':'marcas'} e conferir de novo</button></div>`:''}${pv}`;
}
