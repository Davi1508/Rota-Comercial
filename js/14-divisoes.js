// ---------- divisões: regiões e coleções criadas pela pessoa ----------
function bloco(tipo,titulo,ajuda,lista){
  const usos=n=>tipo==='regiao'?lojas.filter(l=>l.regiao===n).length:pedidos.filter(o=>o.colecao===n).length;
  const un=tipo==='regiao'?['loja','lojas']:['pedido','pedidos'];
  return `<h2>${titulo}</h2><p class="ufmsg" style="margin-top:0">${ajuda}</p>
    <div class="list">${lista.map((n,i)=>{const u=usos(n);return `<div class="row"><div class="grow"><div class="t">${esc(n)}</div><div class="s">${u} ${u===1?un[0]:un[1]}</div></div><button class="chipbtn" data-del-div="${tipo}" data-idx="${i}">Excluir</button></div>`}).join('')||'<p class="empty">Nenhuma criada ainda.</p>'}</div>
    <div style="display:flex;gap:var(--s2);margin-top:var(--s2)"><input id="dv-${tipo}" type="text" placeholder="Nome, ex.: ${tipo==='regiao'?'Extremo Oeste':'Outono'}" autocomplete="off" aria-label="Novo nome" style="flex:1;min-width:0"><button class="btn" data-add-div="${tipo}" style="margin:0;width:auto;padding:0 var(--s3)">Adicionar</button></div>`;
}
function adicionarDiv(tipo){
  const inp=$('#dv-'+tipo),t=inp.value.trim(),lista=tipo==='regiao'?REGIOES:COLECOES;
  if(!t)return toast('Digite o nome antes de adicionar');
  if(lista.some(x=>norm(x)===norm(t)))return toast('Já existe com esse nome');
  lista.push(t);salvar();preencherForm();renderTudo();renderAjustes();toast('Adicionado');
}
function excluirDiv(tipo,i,btn){
  const lista=tipo==='regiao'?REGIOES:COLECOES,nome=lista[i];if(nome===undefined)return;
  const n=tipo==='regiao'?lojas.filter(l=>l.regiao===nome).length:pedidos.filter(o=>o.colecao===nome).length;
  if(n)return toast(`${n} ${tipo==='regiao'?(n>1?'lojas usam':'loja usa'):(n>1?'pedidos usam':'pedido usa')} isso. Troque antes de excluir.`);
  if(!btn.dataset.ok){btn.dataset.ok='1';btn.textContent='Toque de novo';return}
  lista.splice(i,1);if(filtro[tipo]===nome)filtro[tipo]='todas';salvar();preencherForm();renderTudo();renderAjustes();toast('Excluído');
}
function renderDivisoes(){
  if(filtro.regiao!=='todas'&&!REGIOES.includes(filtro.regiao))filtro.regiao='todas';
  if(filtro.colecao!=='todas'&&!COLECOES.includes(filtro.colecao))filtro.colecao='todas';
}
