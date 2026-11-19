// ---------- formulários: loja ----------
function abrirCadastro(uf,id){
  if(!MARCAS.length){abrirAjustes('marcas');toast('Cadastre suas marcas antes das lojas');return}
  irAba('lojas');lojaEdit=id?loja(id):null;avisoLoja='';$('#lErro').hidden=true;
  $('#formLoja').hidden=false;$('#abrirNova').hidden=true;
  $('#lojaTit').textContent=lojaEdit?'Editar loja':'Nova loja';$('#lSalvar').textContent=lojaEdit?'Salvar alterações':'Cadastrar loja';
  if(lojaEdit){$('#lNome').value=lojaEdit.nome;$('#lCidade').value=lojaEdit.cidade;$('#lUF').value=lojaEdit.uf;$('#lRegiao').value=lojaEdit.regiao||'';$('#lCnpj').value=lojaEdit.cnpj?cnpjBR(lojaEdit.cnpj):'';document.querySelectorAll('input[name=lmarca]').forEach(x=>x.checked=lojaEdit.marcas.includes(x.value))}
  else if(uf)$('#lUF').value=uf;
  dicaCidade();renderTaxasLoja(lojaEdit&&lojaEdit.taxas||{});$('#lNome').focus();
}
// Comissão combinada com este cliente, por marca (em branco = a da marca)
function renderTaxasLoja(val){const box=$('#lTaxas');if(!box)return;
  const atual={};box.querySelectorAll('input[data-ltaxa]').forEach(i=>{if(i.value.trim())atual[i.dataset.ltaxa]=i.value});
  const ms=[...document.querySelectorAll('input[name=lmarca]:checked')].map(x=>marca(x.value)).filter(Boolean);
  if(!ms.length){box.innerHTML='';return}
  box.innerHTML=`<details class="ltaxas"${ms.some(m=>atual[m.id]||(val&&val[m.id]))?' open':''}><summary>Comissão diferente para este cliente <small class="opc">opcional</small></summary>
    <p class="s" style="margin:var(--s1) 0 var(--s2)">Deixe em branco para usar a comissão da marca.</p>
    ${ms.map(m=>`<div class="ltaxa"><span class="grow">${esc(m.nome)}<small class="s"> · marca paga ${pctTxt(m.taxa)}%</small></span><div class="valor taxa"><input class="num" type="text" inputmode="decimal" data-ltaxa="${esc(m.id)}" placeholder="${pctTxt(m.taxa)}" maxlength="6" autocomplete="off" aria-label="Comissão da ${esc(m.nome)} neste cliente" value="${esc(atual[m.id]!=null?atual[m.id]:val&&val[m.id]?pctTxt(val[m.id]):'')}"><span>%</span></div></div>`).join('')}</details>`}
document.addEventListener('change',e=>{if(e.target&&e.target.name==='lmarca')renderTaxasLoja()});
function dicaCidade(){const c=$('#lCidade').value.trim(),uf=$('#lUF').value,h=$('#lHint');
  if(!c){h.textContent='';h.className='hint';return}
  if(coordCidade(c,uf)){h.textContent=`${nomeCidade(c,uf)} encontrada: a loja vai direto para o lugar certo do mapa.`;h.className='hint ok'}
  else{h.textContent=typeof CIDADES_TODAS!=='undefined'&&CIDADES_TODAS?`Não achamos ${c}/${uf}. Confira o nome e o estado, ou salve e toque no mapa para marcar o lugar.`:`${c} não está na lista do mapa. Depois de salvar, você toca no mapa para marcar o lugar.`;h.className='hint warn'}}
function fecharCadastro(){lojaEdit=null;if($('#lTaxas'))$('#lTaxas').innerHTML='';avisoLoja='';$('#lHint').textContent='';$('#formLoja').reset();$('#lUF').value='BA';$('#lErro').hidden=true;$('#formLoja').hidden=true;$('#abrirNova').hidden=false}
function erroLoja(t){const e=$('#lErro');e.textContent=t;e.hidden=false}
function salvarLoja(e){
  e.preventDefault();const ms=[...document.querySelectorAll('input[name=lmarca]:checked')].map(x=>x.value);
  const nome=$('#lNome').value.trim(),uf=$('#lUF').value,bruta=$('#lCidade').value.trim(),regiao=$('#lRegiao').value;
  if(!nome||!bruta)return erroLoja('Preencha o nome e a cidade.');
  if(!ms.length)return erroLoja('Escolha pelo menos uma marca.');
  const taxas={};for(const i of document.querySelectorAll('#lTaxas input[data-ltaxa]')){const v=i.value.trim();if(!v||!ms.includes(i.dataset.ltaxa))continue;const t=num(v);
    if(!(t>0&&t<=100)){i.closest('details').open=true;i.focus();return erroLoja('A comissão do cliente vai de 0,01% a 100%. Deixe em branco para usar a da marca.')}
    const tx=Math.round(t*1000)/100000;if(Math.abs(tx-marca(i.dataset.ltaxa).taxa)>1e-9)taxas[i.dataset.ltaxa]=tx}
  const cnpj=soDigitos($('#lCnpj').value);if(cnpj&&!cnpjValido(cnpj)){$('#lCnpj').focus();return erroLoja('Esse CNPJ não confere. Revise os números ou deixe em branco.')}
  const cidade=nomeCidade(bruta,uf),chave=norm(nome+cidade+uf);
  if(lojas.some(l=>l!==lojaEdit&&norm(l.nome)===norm(nome)&&norm(l.cidade)===norm(cidade)&&l.uf===uf)&&avisoLoja!==chave){erroLoja(`Já existe "${nome}" em ${cidade}. Se for outra loja, toque em salvar de novo.`);avisoLoja=chave;return}
  let l,mudouLugar;
  if(lojaEdit){l=lojaEdit;mudouLugar=l.cidade!==cidade||l.uf!==uf;Object.assign(l,{nome,cidade,uf,marcas:ms,regiao});if(cnpj)l.cnpj=cnpj;else delete l.cnpj;if(Object.keys(taxas).length)l.taxas=taxas;else delete l.taxas;if(mudouLugar)l.coord=coordCidade(cidade,uf)}
  else{l={id:'N'+Date.now(),nome,cidade,uf,marcas:ms,regiao,coord:coordCidade(cidade,uf),...(cnpj?{cnpj}:{}),...(Object.keys(taxas).length?{taxas}:{})};lojas.push(l);mudouLugar=true}
  const editado=!!lojaEdit;fecharCadastro();preencherLojas();if(!editado&&!pedEdit)$('#pLoja').value=l.id;syncMarcaLoja();salvar();renderTudo();
  if(!mudouLugar){toast('Loja atualizada');return}
  if(l.coord){toast(editado?'Loja atualizada':`${l.nome} cadastrada ${emUF(uf)}`);irAba('mapa');selecionarCidade(l.cidade+'|'+uf)}
  else{toast(`${l.nome} salva. Agora marque o lugar no mapa`);iniciarColocacao(l.id)}
}
// Arquivar mantém os pedidos e as comissões no histórico; a loja só some das listas e do mapa
function removerLoja(id){
  const l=loja(id);if(!l)return;l.arquivada=true;
  fecharLoja();cidadeSel=null;preencherLojas();syncMarcaLoja();salvar();renderTudo();toast(`${l.nome} foi arquivada. Os pedidos continuam no histórico.`);
}
function desarquivarLoja(id){const l=loja(id);if(!l)return;delete l.arquivada;preencherLojas();salvar();renderTudo();renderAjustes();toast(`${l.nome} voltou para a lista`)}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2800)}
