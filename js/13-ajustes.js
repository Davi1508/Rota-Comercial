// ---------- ajustes: marcas, sugestões e seus dados ----------
let ajusteAba='marcas',marcaEdit=null,restPend=null;
function abrirAjustes(aba){if(aba)ajusteAba=aba;marcaEdit=null;restPend=null;lojaAberta=null;renderAjustes();$('#veu').style.display='block';requestAnimationFrame(()=>$('#sheet').classList.add('on'))}
function renderAjustes(){
  const usos=id=>pedidos.filter(o=>o.marca===id).length;
  const formMarca=m=>`<form class="form" id="formMarca" style="max-width:none">
     <label class="f" for="mNome">Nome da marca</label><input id="mNome" type="text" value="${m?esc(m.nome):''}" required autocomplete="off">
     <label class="f" for="mTaxa">Comissão (%)</label><input id="mTaxa" type="text" inputmode="decimal" value="${m?String(+(m.taxa*100).toFixed(2)).replace('.',','):''}" placeholder="Ex.: 10 ou 8,5" autocomplete="off" required>
     <span class="f">Cor</span><div class="cores">${PALETA.map((c,i)=>`<label><input type="radio" name="mcor" value="${c}" ${(m?m.cor===c:i===MARCAS.length%PALETA.length)?'checked':''}><i style="background:${c}"></i></label>`).join('')}</div>
     ${m?'<p class="ufmsg">Se mudar a comissão, a nova taxa vale para os próximos pedidos. Os pedidos já registrados mantêm a taxa da época.</p>':''}
     <div class="erro" id="mErro" hidden></div>
     <button class="btn" type="submit">${m?'Salvar marca':'Adicionar marca'}</button>
     ${m?`<button class="btn danger" type="button" data-del-marca="${m.id}">Excluir marca</button>`:''}
     <button class="btn ghost" type="button" data-marca-cancel>Cancelar</button></form>`;
  let corpo='';
  if(ajusteAba==='marcas'){
    corpo=marcaEdit!==null?formMarca(marcaEdit==='nova'?null:marca(marcaEdit))
      :`<div class="list">${MARCAS.map(m=>`<button class="row" data-edit-marca="${m.id}"><i class="sw" style="background:${m.cor};height:32px;align-self:center"></i><div class="grow"><div class="t">${esc(m.nome)}</div><div class="s">${pct(m.taxa)} de comissão, ${usos(m.id)} pedido${usos(m.id)!==1?'s':''}</div></div><span class="s">Editar</span></button>`).join('')||'<p class="empty">Nenhuma marca ainda. Adicione a primeira.</p>'}</div><button class="btn" data-edit-marca="nova">Adicionar marca</button>`;
  }else if(ajusteAba==='divisoes'){
    corpo=bloco('regiao','Regiões','Crie as divisões que fizerem sentido para você, como áreas de venda. Cada loja escolhe uma região.',REGIOES)
      +bloco('colecao','Coleções','Crie as coleções ou épocas das suas marcas, como Outono, Verão ou a coleção do ano. Cada pedido pode receber uma.',COLECOES);
  }else if(ajusteAba==='sugestoes'){
    corpo=`<p class="ufmsg" style="margin-top:0">Achou algo estranho ou sentiu falta de alguma coisa? Anote aqui na hora. Depois é só copiar e mandar.</p>
      <textarea id="sgTexto" rows="4" placeholder="Ex.: queria ver as lojas que não compram há 60 dias"></textarea>
      <button class="btn" data-sugerir>Anotar sugestão</button>
      ${sugestoes.length?`<h2>Anotadas <small>${sugestoes.length}</small></h2><div class="list">${sugestoes.slice().reverse().map(s=>`<div class="ped"><div class="grow"><div>${esc(s.texto)}</div><div class="s">${new Date(s.em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}, aba ${esc(s.tela)}</div></div></div>`).join('')}</div><button class="btn ghost" data-copiar-sug>Copiar todas para enviar</button>`:''}`;
  }else{
    corpo=`${restPend?`<div class="aviso">A cópia tem ${restPend.lojas.length} lojas, ${(restPend.marcas||[]).length} marcas e ${(restPend.pedidos||[]).length} pedidos. Ela vai substituir tudo o que está neste celular agora.<button class="btn danger" data-restaurar>Substituir pelos dados da cópia</button><button class="btn ghost" data-restaurar-nao>Cancelar</button></div>`:''}
      <div class="list" style="padding:16px"><div class="t">Onde seus dados ficam</div><p class="s" style="margin:4px 0 0">${textoOndeSalva()}</p></div>
      ${typeof blocoInstalar==='function'?blocoInstalar():''}${typeof blocoConta==='function'?blocoConta():''}${blocoImportar()}<h2>Dados de exemplo (teste)</h2><p class="ufmsg" style="margin-top:0">${exemplo?'Você está vendo dados de exemplo. Nada é salvo enquanto estiver neste modo.':'Carrega lojas, pedidos e despesas inventados para testar o app. Seus dados ficam guardados e voltam quando você sair do exemplo.'}</p><button class="btn ghost" data-exemplo-dev>${exemplo?'Voltar para meus dados':'Carregar dados de exemplo'}</button><h2>Seu nome</h2><div style="display:flex;gap:var(--s2)"><input id="nomeUsu" type="text" value="${esc(NOME)}" autocomplete="off" aria-label="Seu nome" style="flex:1;min-width:0"><button class="btn" data-salvar-nome style="margin:0;width:auto;padding:0 var(--s3)">Salvar</button></div>
      ${(()=>{const ar=lojas.filter(l=>l.arquivada);return ar.length?`<h2>Lojas arquivadas</h2><p class="ufmsg" style="margin-top:0">Os pedidos delas continuam contando no histórico.</p><div class="list">${ar.map(l=>`<div class="row"><div class="grow"><div class="t">${esc(l.nome)}</div><div class="s">${esc(l.cidade)}, ${l.uf}</div></div><button class="chipbtn" data-desarquivar="${l.id}">Restaurar</button></div>`).join('')}</div>`:''})()}
      <h2>Cópia de segurança</h2><p class="ufmsg" style="margin-top:0">Faça uma cópia de vez em quando. Com ela você recupera tudo se trocar de celular ou limpar o navegador.</p>
      <button class="btn" data-backup>Baixar cópia</button><button class="btn ghost" data-backup-copiar>Copiar cópia como texto</button>
      <h2>Restaurar uma cópia</h2>
      <label class="btn ghost" style="text-align:center;cursor:pointer">Escolher arquivo da cópia<input type="file" id="arqBackup" accept=".json,application/json,text/plain" hidden></label>
      <details class="colar"><summary>Ou colar o texto da cópia</summary><textarea id="txtBackup" rows="4" placeholder="Cole aqui o texto copiado"></textarea><button class="btn ghost" data-colar-backup>Usar este texto</button></details>
      <h2>Começar do zero</h2><button class="btn danger" data-zerar>Apagar todos os dados</button>`;
  }
  $('#sheet').innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>Ajustes</h3><div class="s">Marcas, divisões, sugestões e seus dados</div></div><button class="x" data-close aria-label="Fechar">×</button></div>
    <div class="seg" style="margin-top:16px;max-width:none">${[['marcas','Marcas'],['divisoes','Divisões'],['sugestoes','Sugestões'],['dados','Seus dados']].map(([k,t])=>`<button data-aj="${k}" class="${k===ajusteAba?'on':''}">${t}</button>`).join('')}</div></div>
    <div class="sh-body" style="padding-top:16px">${corpo}</div>`;
  const fm=$('#formMarca');if(fm){fm.onsubmit=salvarMarca;if(marcaEdit==='nova')$('#mNome').focus()}
  const ai=$('#impArq');if(ai)ai.onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>processarRelatorio(r.result);r.readAsText(f)};
  const ab=$('#arqBackup');if(ab)ab.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>lerBackup(r.result);r.readAsText(f)};
}
function salvarMarca(e){
  e.preventDefault();
  const nome=$('#mNome').value.trim(),t=num($('#mTaxa').value),cor=(document.querySelector('input[name=mcor]:checked')||{}).value||PALETA[0];
  const err=x=>{$('#mErro').textContent=x;$('#mErro').hidden=false};
  if(!nome)return err('Digite o nome da marca.');
  if(!(t>0&&t<=50))return err('A comissão precisa ficar entre 0,1% e 50%.');
  const edit=marcaEdit!=='nova'&&marca(marcaEdit);
  if(MARCAS.some(m=>m!==edit&&norm(m.nome)===norm(nome)))return err('Já existe uma marca com esse nome.');
  const taxa=+(t/100).toFixed(4);
  if(edit)Object.assign(edit,{nome,taxa,cor});else MARCAS.push({id:'m'+Date.now().toString(36),nome,taxa,cor});
  marcaEdit=null;salvar();preencherMarcas();syncMarcaLoja();renderTudo();renderAjustes();toast(edit?'Marca atualizada':'Marca adicionada');
}
function excluirMarca(id,btn){
  const n=pedidos.filter(o=>o.marca===id).length;
  if(n){toast(`Essa marca tem ${n} pedido${n>1?'s':''}. Exclua os pedidos antes.`);return}
  if(!btn.dataset.ok){btn.dataset.ok='1';btn.textContent='Toque de novo para excluir';return}
  MARCAS=MARCAS.filter(m=>m.id!==id);lojas.forEach(l=>l.marcas=l.marcas.filter(x=>x!==id));if(filtro.marca===id)filtro.marca='todas';
  marcaEdit=null;salvar();preencherMarcas();syncMarcaLoja();renderTudo();renderAjustes();toast('Marca excluída');
}
function anotarSugestao(){
  const t=$('#sgTexto').value.trim();if(!t){toast('Escreva a sugestão antes de anotar');return}
  const aba=document.querySelector('.nav button.on');sugestoes.push({texto:t,em:Date.now(),tela:aba?aba.textContent.trim():''});salvar();renderAjustes();toast('Sugestão anotada');
}
async function copiar(txt,ok){try{await navigator.clipboard.writeText(txt);toast(ok)}catch(e){toast('Este aparelho não deixou copiar. Tente de novo.')}}
const textoBackup=()=>JSON.stringify({app:'rota-comercial',...serializar(),exemplo:false});
async function baixarBackup(){
  const nome=`rota-comercial-copia-${isoD(new Date())}.json`;
  if(window.claude&&typeof claude.use==='function'){
    const dl=await claude.use('downloads').catch(()=>null);
    if(dl){try{await dl.save({filename:nome,data:textoBackup()});toast('Cópia salva')}catch(e){if(e&&e.code!=='declined')copiar(textoBackup(),'Não deu para baixar aqui. A cópia foi copiada como texto: cole num lugar seguro.')}return}
    copiar(textoBackup(),'Cópia copiada como texto: cole num lugar seguro, como um e-mail para você mesmo');return;
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([textoBackup()],{type:'application/json'}));a.download=nome;document.body.appendChild(a);a.click();a.remove();toast('Cópia baixada');
}
function lerBackup(txt){
  let d=null;try{d=JSON.parse(txt)}catch(e){}
  if(!d||d.app!=='rota-comercial'||!Array.isArray(d.lojas)){toast('Esse arquivo não é uma cópia do Rota Comercial');return}
  restPend=d;renderAjustes();$('#sheet').scrollTop=0;
}
function restaurar(){if(!restPend)return;aplicar({...restPend,exemplo:false});restPend=null;sairEdicoes();salvar();preencherForm();renderTudo();fecharLoja();verBrasil();toast('Cópia restaurada')}
function zerar(btn){
  if(!btn.dataset.ok){btn.dataset.ok='1';btn.textContent='Toque de novo: isso apaga lojas, marcas e pedidos';return}
  aplicar({});exemplo=false;sairEdicoes();salvar();preencherForm();renderTudo();fecharLoja();verBrasil();toast('Dados apagados');
}
