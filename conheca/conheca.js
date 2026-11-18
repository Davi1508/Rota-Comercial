// Quem pediu menos movimento no aparelho vê a imagem parada
if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('video').forEach(v=>{v.removeAttribute('autoplay');v.pause()});
