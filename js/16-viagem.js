// ---------- despesas de viagem ----------
// Lançamento inteligente: lê frases como "gasolina 120 ontem em Barreiras" e preenche os campos. Roda no próprio celular.
const CATS_SUG=[['Combustível',/gasolina|etanol|álcool|alcool|diesel|combust|posto|abastec/i],['Alimentação',/almo[çc]o|jantar|lanche|refei|comida|caf[ée]|restaurante|padaria|marmita/i],['Hospedagem',/hotel|pousada|hospeda|airbnb|di[áa]ria/i],['Pedágio',/ped[áa]gio/i],['Transporte',/uber|t[áa]xi|[ôo]nibus|passagem|avi[ãa]o|aplicativo|corrida/i],['Estacionamento',/estacion/i]];
function interpretarDespesa(txt){
  let t=' '+txt.trim()+' ',data=new Date(HOJE);
  const dm=t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/),dd=t.match(/\bdia (\d{1,2})\b/i);
  if(dm){const y=dm[3]?(+dm[3]<100?2000+ +dm[3]:+dm[3]):HOJE.getFullYear(),d=new Date(y,+dm[2]-1,+dm[1],12);if(!isNaN(d)&&d<=HOJE)data=d;t=t.replace(dm[0],' ')}
  else if(dd){const d=new Date(HOJE.getFullYear(),HOJE.getMonth(),+dd[1],12);if(d<=HOJE)data=d;t=t.replace(dd[0],' ')}
  else{const r=[['anteontem',2],['ontem',1],['hoje',0]].find(([w])=>new RegExp('\\b'+w+'\\b','i').test(t));if(r){data=new Date(HOJE-r[1]*DAY);t=t.replace(new RegExp('\\b'+r[0]+'\\b','i'),' ')}}
  const vm=t.match(/(?:R\$\s?)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+\.\d{1,2})(?!\d)/);
  let valor=0;
  if(vm){const raw=vm[1];valor=raw.includes(',')?+raw.replace(/\./g,'').replace(',','.'):/^\d{1,3}(\.\d{3})+$/.test(raw)?+raw.replace(/\./g,''):+raw;t=t.replace(vm[0],' ')}
  let descricao=t.replace(/\s+/g,' ').replace(/^\s*(em|de|no|na|do|da|com)\s+|\s+(em|de|no|na|com)\s*$/gi,'').trim();
  descricao=descricao?descricao.charAt(0).toUpperCase()+descricao.slice(1):'';
  const c=CATS_SUG.find(([,re])=>re.test(t));
  return{valor:valor||0,data,categoria:c?c[0]:'',descricao};
}
function preencherComTexto(){
  const r=interpretarDespesa($('#vTexto').value);
  if(!$('#vTexto').value.trim()){toast('Escreva o que gastou primeiro');return}
  if(!r.valor){toast('Não achei o valor. Inclua a quantia, por exemplo: 35,50');return}
  $('#vValor').value=String(r.valor).replace('.',',');$('#vData').value=isoD(r.data);$('#vCat').value=r.categoria;$('#vDesc').value=r.descricao;$('#vErro').hidden=true;
  toast('Confira os campos e toque em salvar');
}
function erroViagem(t){const e=$('#vErro');e.textContent=t;e.hidden=false;return null}
function salvarDespesa(e){
  e.preventDefault();$('#vErro').hidden=true;
  const v=Math.round(num($('#vValor').value)*100)/100,ds=$('#vData').value;
  if(!(v>0))return erroViagem('Digite um valor maior que zero.');
  if(!ds)return erroViagem('Escolha a data da despesa.');
  const data=deIso(ds);if(data>HOJE)return erroViagem('A data não pode ser no futuro.');
  const d={valor:v,data,categoria:$('#vCat').value.trim(),descricao:$('#vDesc').value.trim()};
  if(desEdit)Object.assign(desEdit,d);else DESPESAS.push({id:'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),...d});
  const editado=!!desEdit;sairEdicaoDesp();salvar();renderTudo();toast(editado?'Despesa atualizada':'Despesa salva');
}
function editarDespesa(id){
  const x=DESPESAS.find(d=>d.id===id);if(!x)return;desEdit=x;
  $('#vValor').value=String(x.valor).replace('.',',');$('#vData').value=isoD(x.data);$('#vCat').value=x.categoria||'';$('#vDesc').value=x.descricao||'';$('#vTexto').value='';
  $('#vSalvar').textContent='Salvar alterações';$('#vExcluir').hidden=false;$('#vCancelar').hidden=false;$('#vExcluir').dataset.ok='';$('#vExcluir').textContent='Excluir despesa';$('#vErro').hidden=true;
  irAba('viagem');$('#vValor').scrollIntoView({block:'center'});
}
function sairEdicaoDesp(){
  desEdit=null;$('#vSalvar').textContent='Salvar despesa';$('#vExcluir').hidden=true;$('#vCancelar').hidden=true;
  $('#vValor').value='';$('#vCat').value='';$('#vDesc').value='';$('#vData').value=isoD(HOJE);$('#vTexto').value='';$('#vErro').hidden=true;
}
function excluirDespesa(btn){
  if(!desEdit)return;
  if(!btn.dataset.ok){btn.dataset.ok='1';btn.textContent='Toque de novo para excluir';return}
  DESPESAS=DESPESAS.filter(x=>x!==desEdit);sairEdicaoDesp();salvar();renderTudo();toast('Despesa excluída');
}
function renderViagem(){
  if(!$('#t-viagem'))return;
  const list=DESPESAS.filter(x=>noPeriodo(x.data)).sort((a,b)=>b.data-a.data),cats={},qd=norm(($('#bDesp')||{}).value||'');
  const vistaD=qd?list.filter(x=>norm([x.descricao,x.categoria,x.data.toLocaleDateString('pt-BR'),String(x.valor).replace('.',',')].join(' ')).includes(qd)):list;
  list.forEach(x=>{const k=x.categoria||'Sem categoria';cats[k]=(cats[k]||0)+x.valor});
  $('#kViagem').innerHTML=[['Total no período',fmt2.format(sum(list,x=>x.valor))],['Lançamentos',list.length]].map(([l,v])=>`<div><span>${l}</span><b class="num">${v}</b></div>`).join('');
  const ks=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  $('#vCats').innerHTML=ks.length?ks.map(([k,v])=>`<div class="row"><div class="grow"><div class="t">${esc(k)}</div><div class="bar"><i style="width:${v/ks[0][1]*100}%"></i></div></div><div class="n num">${fmt2.format(v)}</div></div>`).join(''):'<p class="empty">Nenhuma despesa de viagem neste período.</p>';
  $('#vLista').innerHTML=vistaD.length?vistaD.map(x=>`<button class="row" data-edit-desp="${x.id}"><div class="grow"><div class="t">${esc(x.descricao||x.categoria||'Despesa')}</div><div class="s">${x.data.toLocaleDateString('pt-BR')}${x.categoria?', '+esc(x.categoria):''}</div></div><div class="n num">${fmt2.format(x.valor)}</div></button>`).join(''):(qd?'<p class="empty">Nada encontrado com essa busca.</p>':'<p class="empty">Nenhum lançamento neste período. Escreva acima o que gastou.</p>');
  const dl=[...new Set([...CATS_SUG.map(c=>c[0]),...DESPESAS.map(x=>x.categoria).filter(Boolean)])];
  $('#catList').innerHTML=dl.map(c=>`<option value="${esc(c)}">`).join('');
}
