// ---------- tema ----------
function aplicarTema(t){
  document.documentElement.dataset.theme=t;try{localStorage.setItem('rc-tema',t)}catch(e){}
  $('#tema').setAttribute('aria-label',t==='dark'?'Usar tema claro':'Usar tema escuro');
  document.querySelector('meta[name=theme-color]').content=t==='dark'?'#0C0F21':'#F2F3F7';
}
