// ---------- entrar com Google ----------
async function entrarComGoogle(b){
  if(!sb){toast('A conta não está disponível agora. Verifique a internet.');return}
  if(!navigator.onLine){toast('Você está sem internet');return}
  if(b){b.disabled=true;b.lastChild.textContent='Abrindo o Google…'}
  lsSet(SEM_CONTA,null);try{sessionStorage.setItem('rc-google-tentou',String(Date.now()))}catch(e){}
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});
  if(error){if(b){b.disabled=false;b.lastChild.textContent='Continuar com Google'}toast('Não foi possível abrir o Google agora. Tente de novo.')}
}
// Volta do Google com erro (ex.: a pessoa cancelou): avisa e limpa o endereço
(()=>{const h=new URLSearchParams(location.hash.slice(1)),q=new URLSearchParams(location.search),e=h.get('error')||q.get('error');
  if(!e)return;history.replaceState(null,'',location.pathname);
  setTimeout(()=>toast(e==='access_denied'?'Entrada com Google cancelada':'Não deu para entrar com o Google. Tente de novo ou use o e-mail.'),800)})();
document.addEventListener('click',e=>{const b=e.target.closest('[data-en-google]');if(b&&!b.disabled)entrarComGoogle(b)});
// Diagnóstico da volta do login (só diz se veio token, nunca o valor)
(()=>{const u=location.href,tipo=/access_token=/.test(u)?'token':/[?&]code=/.test(u)?'code':/error=/.test(u)?'erro':'';
  let tentou=0;try{tentou=+sessionStorage.getItem('rc-google-tentou')||0;sessionStorage.removeItem('rc-google-tentou')}catch(e){}
  if(!tipo&&tentou&&Date.now()-tentou<10*60e3){
    const chaves=[...new URLSearchParams(location.hash.slice(1)).keys(),...new URLSearchParams(location.search).keys()].join(',').slice(0,120);
    registrarErro('diag-login: voltou do Google SEM token; caminho='+location.pathname+'; chaves='+(chaves||'nenhuma')+'; standalone='+(matchMedia('(display-mode: standalone)').matches?'sim':'nao'),'diag');return}
  if(!tipo)return;const t0=Date.now();
  setTimeout(()=>{if(typeof conta!=='undefined'&&conta)return;
    registrarErro('diag-login: voltou com '+tipo+', sem conta após 6s; lib='+(typeof sb!=='undefined'&&sb?'sim':'nao')+', standalone='+(matchMedia('(display-mode: standalone)').matches?'sim':'nao'),'diag '+(Date.now()-t0)+'ms')},6000)})();
