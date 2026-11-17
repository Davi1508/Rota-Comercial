// ---------- LGPD: links legais e excluir conta ----------
function blocoLegal(){
  return `<h2>Privacidade</h2><div class="list legal-links">
    <a class="row" href="privacidade.html" target="_blank" rel="noopener"><div class="grow"><div class="t">Política de privacidade</div><div class="s">O que guardamos e por quê</div></div><span aria-hidden="true">›</span></a>
    <a class="row" href="termos.html" target="_blank" rel="noopener"><div class="grow"><div class="t">Termos de uso</div><div class="s">Teste grátis, assinatura e seus direitos</div></div><span aria-hidden="true">›</span></a>
    <a class="row" href="mailto:contato@rotacomercial.app.br"><div class="grow"><div class="t">Falar sobre seus dados</div><div class="s">contato@rotacomercial.app.br</div></div><span aria-hidden="true">›</span></a>
  </div><p class="ufmsg creditos">Mapa do Brasil: <a href="https://mapsvg.com/maps/brazil" target="_blank" rel="noopener">MapSVG</a>, por Victor Cazanave, licença <a href="https://creativecommons.org/licenses/by/4.0/deed.pt-br" target="_blank" rel="noopener">CC BY 4.0</a>. Cidades: <a href="https://github.com/kelvins/municipios-brasileiros" target="_blank" rel="noopener">municípios brasileiros</a> (MIT).</p>`;
}

const PALAVRA_EXCLUIR='EXCLUIR';
function abrirExcluirConta(){
  if(!sb||!conta){toast('Entre na conta para excluir');return}
  lojaAberta=null;
  const sh=$('#sheet');sh.dataset.tipo='excluir';sh.setAttribute('aria-label','Excluir minha conta');
  sh.innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>Excluir minha conta</h3><div class="s">${esc(conta.email||'')}</div></div><button class="x" data-close aria-label="Fechar">×</button></div></div>
    <div class="sh-body"><form id="formExcluir" novalidate>
      <div class="aviso">Isso apaga <b>para sempre</b> sua conta e todos os dados dela: marcas, lojas, pedidos, despesas e metas, no servidor e neste aparelho. Não dá para desfazer.</div>
      <p class="ufmsg">Quer guardar seus dados antes? Baixe uma cópia primeiro.</p>
      <button type="button" class="btn ghost" data-backup>Baixar cópia antes</button>
      <label class="f" for="exConfirma">Para confirmar, digite ${PALAVRA_EXCLUIR}</label>
      <input id="exConfirma" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${PALAVRA_EXCLUIR}">
      <p class="erro" id="exErro" role="alert" hidden></p>
      <div class="fpe"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn danger" id="exBotao">Excluir para sempre</button></div>
    </form></div>`;
  $('#formExcluir').onsubmit=e=>{e.preventDefault();excluirConta()};
  $('#veu').style.display='block';requestAnimationFrame(()=>sh.classList.add('on'));
}

async function excluirConta(){
  const erro=t=>{const el=$('#exErro');el.textContent=t;el.hidden=false};
  if($('#exConfirma').value.trim().toUpperCase()!==PALAVRA_EXCLUIR)return erro(`Digite ${PALAVRA_EXCLUIR} para confirmar.`);
  if(!navigator.onLine)return erro('Você está sem internet. Conecte e tente de novo.');
  const b=$('#exBotao');b.disabled=true;b.textContent='Excluindo…';
  // apaga as fotos do catálogo antes (o banco não apaga arquivos sozinho)
  try{const pasta=conta.id;for(let i=0;i<50;i++){const{data}=await sb.storage.from('fotos').list(pasta,{limit:1000});if(!data||!data.length)break;await sb.storage.from('fotos').remove(data.map(f=>pasta+'/'+f.name));if(data.length<1000)break}}catch(e){}
  const {error}=await sb.rpc('excluir_conta');
  if(error){b.disabled=false;b.textContent='Excluir para sempre';return erro('Não foi possível excluir agora. Tente de novo ou escreva para contato@rotacomercial.app.br.')}
  // conta apagada no servidor: limpa este aparelho e sai
  const uidExcluido=conta&&conta.id;
  [CHAVE,BACKUP_ANTES,PENDENTE,SEM_CONTA,OUTRA_CONTA].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
  // marca que os dados que ainda estiverem em outra aba são da conta excluída: nunca sobem para outra conta
  lsSet(DONO,'excluida:'+uidExcluido);
  try{await sb.auth.signOut({scope:'local'})}catch(e){}
  conta=null;perfil=null;espelho=null;
  try{aplicar(limpar({}))}catch(e){}
  fecharLoja();renderTudo();marcarStatus('local');
  toast('Sua conta e seus dados foram excluídos');
  mostrarEntrada('criar');
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-excluir-conta]'))abrirExcluirConta();
});
