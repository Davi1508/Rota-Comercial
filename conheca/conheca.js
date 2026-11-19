// Vídeos da página: só baixam quando chegam perto da tela, tocam enquanto estão
// visíveis e pausam fora dela. Cada um ganha um botão de pausar/tocar.
// Quem pediu menos movimento no aparelho vê a imagem parada e toca se quiser.
(function(){
  var calmo=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var videos=[].slice.call(document.querySelectorAll('video[data-src]'));
  if(!videos.length)return;

  function carregar(v){
    if(v.getAttribute('src'))return;
    v.src=v.dataset.src;
    v.load();
  }
  function marcar(v,tocando){
    var b=v._botao;if(!b)return;
    b.textContent=tocando?'❚❚':'▶';
    b.setAttribute('aria-label',tocando?'Pausar vídeo':'Tocar vídeo');
  }
  function tocar(v){
    carregar(v);
    var p=v.play();
    // Modo economia de bateria (iPhone) ou bloqueio do navegador: fica a imagem e o botão ▶
    if(p&&p.catch)p.catch(function(){marcar(v,false)});
  }

  videos.forEach(function(v){
    v.pausadoPorQuem=calmo; // true = a pessoa (ou o aparelho) quer parado
    var b=document.createElement('button');
    b.type='button';b.className='pausa';
    v._botao=b;
    v.parentNode.appendChild(b);
    marcar(v,false);
    b.addEventListener('click',function(){
      if(v.paused){v.pausadoPorQuem=false;tocar(v)}
      else{v.pausadoPorQuem=true;v.pause()}
    });
    v.addEventListener('play',function(){marcar(v,true)});
    v.addEventListener('pause',function(){marcar(v,false)});
    // Arquivo não abriu: fica a imagem de capa, sem botão
    v.addEventListener('error',function(){b.hidden=true});
  });

  if(!('IntersectionObserver' in window)){
    videos.forEach(function(v){carregar(v);if(!v.pausadoPorQuem)tocar(v)});
    return;
  }
  // Começa a baixar um pouco antes de aparecer
  var perto=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){carregar(e.target);perto.unobserve(e.target)}});
  },{rootMargin:'300px 0px'});
  // Toca com metade na tela, pausa quando sai
  var visivel=new IntersectionObserver(function(es){
    es.forEach(function(e){
      var v=e.target;
      if(e.isIntersecting){if(!v.pausadoPorQuem&&v.paused)tocar(v)}
      else if(!v.paused)v.pause();
    });
  },{threshold:.5});
  videos.forEach(function(v){perto.observe(v);visivel.observe(v)});
})();
