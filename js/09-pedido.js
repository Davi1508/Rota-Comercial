// ---------- formulários: pedido ----------
// aceita 1.500,50 / 1500,5 / 1500.5
const num=x=>{let t=String(x).replace(/[^\d,.-]/g,'');if(t.includes(','))t=t.replace(/\./g,'').replace(',','.');return parseFloat(t)};
const isoD=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const deIso=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12)};
let pedEdit=null,avisoPed='',avisoLoja='',lojaEdit=null;
function preencherLojas(){const v=$('#pLoja').value,q='';
  const vis=[...lojas].filter(l=>(!l.arquivada||(pedEdit&&pedEdit.loja===l.id))&&(!q||l.id===v||norm(l.nome+' '+l.cidade+' '+(l.regiao||'')).includes(q)));
  $('#pLoja').innerHTML=vis.sort((a,b)=>a.nome.localeCompare(b.nome)).map(l=>`<option value="${l.id}">${esc(l.nome)}, ${esc(l.cidade)} (${l.uf})</option>`).join('');
  if(loja(v))$('#pLoja').value=v}
const marcaForm=()=>{const r=document.querySelector('input[name=marca]:checked');return r?r.value:null};
function preencherMarcas(){
  const lm=[...document.querySelectorAll('input[name=lmarca]:checked')].map(x=>x.value),pm=marcaForm();
  $('#lMarcas').innerHTML=MARCAS.map(m=>`<label><input type="checkbox" name="lmarca" value="${m.id}"${lm.includes(m.id)?' checked':''}><i class="dot" style="background:${m.cor};margin:0"></i><span>${esc(m.nome)}<small>${pct(m.taxa)} de comissão</small></span></label>`).join('');
  $('#pMarca').innerHTML=MARCAS.map((m,i)=>`<label><input type="radio" name="marca" value="${m.id}" ${(pm&&marca(pm)?m.id===pm:!i)?'checked':''}><i class="dot" style="background:${m.cor};margin:0"></i><span>${esc(m.nome)}<small>${pct(m.taxa)} de comissão</small></span></label>`).join('');
}
function filtrarMarcasForm(){
  [['#bMarcaP','#pMarca'],['#bMarcaL','#lMarcas']].forEach(([b,c])=>{const inp=$(b);inp.hidden=MARCAS.length<2;const q=norm(inp.value);
    $(c).querySelectorAll('label').forEach(lb=>{const ch=lb.querySelector('input');lb.style.display=!q||ch.checked||norm(lb.textContent).includes(q)?'':'none'})});
}
function preencherDivisoes(){
  const r=$('#lRegiao').value,c=$('#pColecao').value;
  $('#lRegiao').innerHTML='<option value="">Sem região</option>'+REGIOES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  if(REGIOES.includes(r))$('#lRegiao').value=r;
  $('#pColecao').innerHTML='<option value="">Sem coleção</option>'+COLECOES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  if(COLECOES.includes(c))$('#pColecao').value=c;
}
function preencherForm(){
  preencherLojas();preencherMarcas();filtrarMarcasForm();preencherDivisoes();
  $('#lUF').innerHTML=Object.entries(UFS).sort((a,b)=>a[1].localeCompare(b[1])).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');$('#lUF').value='BA';
  $('#pData').value=isoD(HOJE);$('#pData').max=isoD(HOJE);$('#vData').value=isoD(HOJE);$('#vData').max=isoD(HOJE);
  syncMarcaLoja();
}
function syncMarcaLoja(){const l=loja($('#pLoja').value);if(l&&l.marcas.length&&!l.marcas.includes(marcaForm())){const r=document.querySelector(`input[name=marca][value="${l.marcas[0]}"]`);if(r)r.checked=true}preview()}
function preview(){
  avisoPed='';$('#pErro').hidden=true;
  const v=num($('#pValor').value),pv=num($('#pPrev').value),m=marca(marcaForm());
  if(!m){$('#prev').innerHTML='Cadastre uma marca para ver a comissão.';return}
  const taxa=pedEdit&&pedEdit.marca===m.id?pedEdit.taxa:m.taxa;
  const cmp=v>0&&pv>0?`<br>O real ficou em <b style="display:inline;font-size:inherit">${Math.round(v/pv*100)}%</b> da previsão (${v>=pv?'+':'−'}${fmt2.format(Math.abs(v-pv))})`:'';
  $('#prev').innerHTML=v>0?`Sua comissão neste pedido<b class="num">${fmt2.format(v*taxa)}</b>${pct(taxa)} de ${fmt2.format(v)} pela ${esc(m.nome)}${cmp}`
    :pv>0?`Comissão estimada<b class="num">${fmt2.format(pv*taxa)}</b>${pct(taxa)} da previsão de ${fmt2.format(pv)}. Complete o valor real quando o pedido fechar.`
    :`Digite a previsão ou o valor do pedido para ver sua comissão.`;
}
function estadoPedido(){
  const falta=!MARCAS.length?'marcas':!lojas.length?'lojas':'';
  $('#form').hidden=!!falta;$('#pedVazio').hidden=!falta;
  $('#pedVazio').innerHTML=falta==='marcas'?`<p>Antes do primeiro pedido, cadastre as marcas que você representa e a comissão de cada uma.</p><button class="btn" data-ajustes="marcas">Cadastrar marcas</button>`
    :falta==='lojas'?`<p>Antes do primeiro pedido, cadastre uma loja.</p><button class="btn" data-ir-loja>Cadastrar loja</button>`:'';
}
function editarPedido(id){
  const o=pedidos.find(p=>p.id==id);if(!o)return;fecharLoja();irAba('pedido');pedEdit=o;
  $('#pedTit').textContent='Editar pedido';$('#pSalvar').textContent='Salvar alterações';$('#pExcluir').hidden=false;$('#pCancelar').hidden=false;
  $('#pValor').value=o.pendente?'':String(o.valor).replace('.',',');$('#pPrev').value=o.previsto?String(o.previsto).replace('.',','):'';$('#pLoja').value=o.loja;const r=document.querySelector(`input[name=marca][value="${o.marca}"]`);if(r)r.checked=true;
  $('#pData').value=isoD(o.data);$('#pColecao').value=o.colecao||'';$('#pPago').checked=o.pago;preview();
}
function sairEdicaoPedido(){
  pedEdit=null;$('#pedTit').textContent='Novo pedido';$('#pSalvar').textContent='Salvar pedido';
  const ex=$('#pExcluir');ex.hidden=true;ex.dataset.ok='';ex.textContent='Excluir pedido';$('#pCancelar').hidden=true;
  $('#pValor').value='';$('#pPrev').value='';$('#pColecao').value='';$('#pPago').checked=false;$('#pData').value=isoD(HOJE);preview();
}
function erroPed(t){const e=$('#pErro');e.textContent=t;e.hidden=false}
function salvarPedido(e){
  e.preventDefault();
  const v0=num($('#pValor').value),pv0=num($('#pPrev').value),v=v0>0?Math.round(v0*100)/100:0,prev=pv0>0?Math.round(pv0*100)/100:0,l=loja($('#pLoja').value),mid=marcaForm(),ds=$('#pData').value;
  if(!v&&!prev)return erroPed('Digite a previsão, o valor real, ou os dois.');
  if(!l||!mid)return erroPed('Escolha a loja e a marca.');
  if(!ds)return erroPed('Escolha a data do pedido.');
  const data=deIso(ds);
  if(data>HOJE)return erroPed('A data não pode ser no futuro.');
  const avisos=[];
  if(v>=200000)avisos.push(`o valor está alto (${fmt.format(v)})`);
  if((HOJE-data)/DAY>730)avisos.push('a data tem mais de 2 anos');
  if(v&&pedidos.some(o=>o!==pedEdit&&o.loja===l.id&&o.marca===mid&&o.valor===v&&isoD(o.data)===ds))avisos.push('já existe um pedido igual nesse dia');
  const chave=avisos.join('|')+v+l.id+mid+ds;
  if(avisos.length&&avisoPed!==chave){erroPed(`Confira: ${avisos.join(', ')}. Se estiver certo, toque em salvar de novo.`);avisoPed=chave;return}
  let o;const col=$('#pColecao').value;
  if(pedEdit){o=pedEdit;if(o.marca!==mid)o.taxa=marca(mid).taxa;Object.assign(o,{valor:v,loja:l.id,marca:mid,data,pago:$('#pPago').checked,colecao:col})}
  else{o=addPedido(l.id,mid,v,data,$('#pPago').checked);o.colecao=col}
  if(prev)o.previsto=prev;else delete o.previsto;
  if(!v){o.pendente=true;o.pago=false}else delete o.pendente;
  if(!l.marcas.includes(mid))l.marcas.push(mid);
  const editado=!!pedEdit;sairEdicaoPedido();salvar();renderTudo();
  toast(o.pendente?'Previsão salva. Complete o valor real quando o pedido fechar.':o.previsto?`Pedido salvo: ${Math.round(o.valor/o.previsto*100)}% da previsão`:editado?'Pedido atualizado':`Pedido salvo. Comissão de ${fmt2.format(com(o))}`);
}
function excluirPedido(btn){
  if(!pedEdit)return;
  if(!btn.dataset.ok){btn.dataset.ok='1';btn.textContent='Toque de novo para excluir';return}
  pedidos=pedidos.filter(o=>o!==pedEdit);sairEdicaoPedido();salvar();renderTudo();toast('Pedido excluído');
}
