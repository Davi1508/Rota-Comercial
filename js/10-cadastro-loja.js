// ---------- formulários: loja ----------
function abrirCadastro(uf,id){
  if(!MARCAS.length){abrirAjustes('marcas');toast('Cadastre suas marcas antes das lojas');return}
  irAba('lojas');lojaEdit=id?loja(id):null;avisoLoja='';$('#lErro').hidden=true;
  $('#formLoja').hidden=false;$('#abrirNova').hidden=true;
  $('#lojaTit').textContent=lojaEdit?'Editar loja':'Nova loja';$('#lSalvar').textContent=lojaEdit?'Salvar alterações':'Cadastrar loja';
  if(lojaEdit){$('#lNome').value=lojaEdit.nome;$('#lCidade').value=lojaEdit.cidade;$('#lUF').value=lojaEdit.uf;$('#lRegiao').value=lojaEdit.regiao||'';document.querySelectorAll('input[name=lmarca]').forEach(x=>x.checked=lojaEdit.marcas.includes(x.value))}
  else if(uf)$('#lUF').value=uf;
  dicaCidade();$('#lNome').focus();
}
function dicaCidade(){const c=$('#lCidade').value.trim(),uf=$('#lUF').value,h=$('#lHint');
  if(!c){h.textContent='';h.className='hint';return}
  if(coordCidade(c,uf)){h.textContent=`${nomeCidade(c,uf)} encontrada: a loja vai direto para o lugar certo do mapa.`;h.className='hint ok'}
  else{h.textContent=`${c} não está na lista do mapa. Depois de salvar, você toca no mapa para marcar o lugar.`;h.className='hint warn'}}
function fecharCadastro(){lojaEdit=null;avisoLoja='';$('#lHint').textContent='';$('#formLoja').reset();$('#lUF').value='BA';$('#lErro').hidden=true;$('#formLoja').hidden=true;$('#abrirNova').hidden=false}
function erroLoja(t){const e=$('#lErro');e.textContent=t;e.hidden=false}
function salvarLoja(e){
  e.preventDefault();const ms=[...document.querySelectorAll('input[name=lmarca]:checked')].map(x=>x.value);
  const nome=$('#lNome').value.trim(),uf=$('#lUF').value,bruta=$('#lCidade').value.trim(),regiao=$('#lRegiao').value;
  if(!nome||!bruta)return erroLoja('Preencha o nome e a cidade.');
  if(!ms.length)return erroLoja('Escolha pelo menos uma marca.');
  const cidade=nomeCidade(bruta,uf),chave=norm(nome+cidade+uf);
  if(lojas.some(l=>l!==lojaEdit&&norm(l.nome)===norm(nome)&&norm(l.cidade)===norm(cidade)&&l.uf===uf)&&avisoLoja!==chave){erroLoja(`Já existe "${nome}" em ${cidade}. Se for outra loja, toque em salvar de novo.`);avisoLoja=chave;return}
  let l,mudouLugar;
  if(lojaEdit){l=lojaEdit;mudouLugar=l.cidade!==cidade||l.uf!==uf;Object.assign(l,{nome,cidade,uf,marcas:ms,regiao});if(mudouLugar)l.coord=coordCidade(cidade,uf)}
  else{l={id:'N'+Date.now(),nome,cidade,uf,marcas:ms,regiao,coord:coordCidade(cidade,uf)};lojas.push(l);mudouLugar=true}
  const editado=!!lojaEdit;fecharCadastro();preencherLojas();syncMarcaLoja();salvar();renderTudo();
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
