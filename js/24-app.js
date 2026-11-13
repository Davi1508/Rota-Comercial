// ---------- app instalável (PWA) e assinatura: fim do teste e modo só leitura ----------

// Preencha quando definir: o preço aparece na tela de assinatura e o WhatsApp vira o botão de assinar.
// Exemplo: PLANO={preco:'R$ 29,90 por mês',whatsapp:'5571999999999'}
const PLANO={preco:'',whatsapp:''};

// Guarda o app no aparelho (abre sem internet). Só no site publicado (https), nunca dentro do artefato do Claude.
if('serviceWorker' in navigator&&!window.claude&&(location.protocol==='https:'||/[?&]sw=1/.test(location.search))){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('App offline indisponível',e)));
}

// ---------- instalar na tela de início ----------
let pedidoInstalar=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();pedidoInstalar=e});
addEventListener('appinstalled',()=>{pedidoInstalar=null;toast('App instalado na tela de início')});
const instalado=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const ehIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function blocoInstalar(){
  if(window.claude||instalado())return'';
  const como=pedidoInstalar?'<button class="btn" data-instalar>Instalar app</button>'
    :ehIOS()?'<p class="s" style="margin:var(--s1) 0 0">No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>'
    :'<p class="s" style="margin:var(--s1) 0 0">No menu do navegador, toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>';
  return `<h2>Instalar no celular</h2><div class="list" style="padding:var(--s3)"><div class="t">Use como um app</div><p class="s" style="margin:var(--s1) 0 0">Fica com ícone na tela de início, abre em tela cheia e funciona sem internet.</p>${pedidoInstalar?'':como}</div>${pedidoInstalar?como:''}`;
}
async function instalarApp(){if(!pedidoInstalar)return;pedidoInstalar.prompt();try{await pedidoInstalar.userChoice}catch(e){}pedidoInstalar=null;renderAjustes()}

// ---------- assinatura ----------
const somenteLeitura=()=>!!(typeof conta!=='undefined'&&conta&&perfil&&!contaAtiva());
function atualizarAvisoPlano(){
  const el=$('#planoBanner');if(!el)return;
  const bloq=somenteLeitura(),d=typeof diasTrial==='function'?diasTrial():0;
  const avisar=bloq||(conta&&perfil&&perfil.plano==='trial'&&d<=2);
  el.hidden=!avisar;if(!avisar)return;
  el.classList.toggle('bloq',bloq);
  el.innerHTML=`<span>${bloq?'<b>Seu teste grátis acabou.</b> Seus dados estão guardados. Para voltar a lançar, assine.':`<b>Seu teste grátis acaba ${d<=0?'hoje':d===1?'amanhã':`em ${d} dias`}.</b> Assine para não perder o ritmo.`}</span><button data-assinar>Assinar</button>`;
}
function abrirAssinatura(){
  lojaAberta=null;const bloq=somenteLeitura(),zap=String(PLANO.whatsapp||'').replace(/\D/g,'');
  const msg=encodeURIComponent(`Olá! Quero assinar o Rota Comercial. Meu e-mail na conta é ${conta&&conta.email||''}.`);
  const itens=['Comissão por marca e previsto x real','Lojas no mapa, com ritmo de compra','Despesas de viagem e importação de relatórios','Seus dados em qualquer aparelho'];
  $('#sheet').dataset.tipo='assinatura';$('#sheet').setAttribute('aria-label','Assinatura');
  $('#sheet').innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>${bloq?'Seu teste grátis acabou':'Assinar o Rota Comercial'}</h3><div class="s">${bloq?'Seus dados continuam guardados: lojas, pedidos, comissões e despesas.':'Continue com tudo depois do teste grátis.'}</div></div><button class="x" data-close aria-label="Fechar">×</button></div></div>
    <div class="sh-body"><div class="plano-card"><div class="plano-nome">Plano Representante</div><div class="plano-preco">${PLANO.preco?esc(PLANO.preco):'Preço em breve'}</div>
      <ul>${itens.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>
      ${zap?`<a class="btn acc" href="https://wa.me/${zap}?text=${msg}" target="_blank" rel="noopener">Assinar pelo WhatsApp</a><p class="ufmsg" style="text-align:center">WhatsApp: +${zap}</p>`
        :'<p class="ufmsg">A assinatura pelo app chega em breve. Enquanto isso, fale com quem te passou o Rota Comercial para liberar sua conta.</p>'}
      ${bloq?'<p class="ufmsg">Você continua vendo tudo. Só não dá para lançar ou alterar até assinar.</p>':''}</div>`;
  $('#veu').style.display='block';requestAnimationFrame(()=>$('#sheet').classList.add('on'));
}
// Bloqueio de alterações quando o teste acabou: desfaz o que não foi salvo e mostra a assinatura
function bloquearSeLeitura(){
  if(!somenteLeitura())return false;
  const l=lerLocal();if(l)aplicar(l);
  sairEdicoes();preencherForm();renderTudo();abrirAssinatura();return true;
}
// O aviso acompanha todo redesenho da tela
const renderTudoBase=renderTudo;
renderTudo=function(){renderTudoBase();atualizarAvisoPlano()};
