// ---------- entrar com Google ----------
async function entrarComGoogle(b){
  if(!sb){toast('A conta não está disponível agora. Verifique a internet.');return}
  if(!navigator.onLine){toast('Você está sem internet');return}
  if(b){b.disabled=true;b.lastChild.textContent='Abrindo o Google…'}
  lsSet(SEM_CONTA,null);
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});
  if(error){if(b){b.disabled=false;b.lastChild.textContent='Continuar com Google'}toast('Não foi possível abrir o Google agora. Tente de novo.')}
}
// Volta do Google com erro (ex.: a pessoa cancelou): avisa e limpa o endereço
(()=>{const h=new URLSearchParams(location.hash.slice(1)),q=new URLSearchParams(location.search),e=h.get('error')||q.get('error');
  if(!e)return;history.replaceState(null,'',location.pathname);
  setTimeout(()=>toast(e==='access_denied'?'Entrada com Google cancelada':'Não deu para entrar com o Google. Tente de novo ou use o e-mail.'),800)})();
document.addEventListener('click',e=>{const b=e.target.closest('[data-en-google]');if(b&&!b.disabled)entrarComGoogle(b)});
