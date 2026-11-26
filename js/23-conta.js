// ---------- conta (Supabase): login, trial de 7 dias e sincronização por registro ----------
// A chave abaixo é pública por natureza: quem protege os dados são as regras do banco (cada um só vê o que é seu).
const SB_URL='https://ulafdnjjdiscowijqwdg.supabase.co',SB_CHAVE='sb_publishable_-1c4r5XV26WUFY82X6Rwtw_9KmLDXj4';
const SB_LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
// Hash SRI da versão fixada acima: ao trocar a versão da lib, recalcule (sha384 em base64) e atualize aqui e em dono/index.html.
const SB_SRI='sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o';
const TABELAS=['marcas','produtos','lojas','pedidos','despesas'];
const BACKUP_ANTES='rc-dados-antes-da-conta',PENDENTE='rc-conta-pendente',DONO='rc-dono-dos-dados',OUTRA_CONTA='rc-dados-de-outra-conta';
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}},lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
let sb=null,conta=null,perfil=null,espelho=null,contaT=null,contaFila=Promise.resolve(),contaMsg='',contaEmail='';
// Anti-robô (Cloudflare Turnstile): cole aqui a CHAVE DO SITE quando for ligar. Vazio = desligado.
const TURNSTILE_SITE='';
let tsToken='',tsWidget=null;
function tsAtivo(){return !!TURNSTILE_SITE}
function carregarTurnstile(){
  if(!tsAtivo()||window.turnstile||document.getElementById('ts-js'))return;
  const s=document.createElement('script');s.id='ts-js';s.src='https://challenges.cloudflare.com/turnstile/v0/api.js';s.async=true;s.defer=true;document.head.appendChild(s);
}
function renderTurnstile(){
  if(!tsAtivo())return;const alvo=document.getElementById('ts-box');if(!alvo)return;
  const faz=()=>{if(!window.turnstile||!document.getElementById('ts-box'))return;tsToken='';
    try{tsWidget=window.turnstile.render('#ts-box',{sitekey:TURNSTILE_SITE,language:'pt-br',callback:t=>{tsToken=t},'error-callback':()=>{tsToken=''},'expired-callback':()=>{tsToken=''}})}catch(e){}};
  if(window.turnstile)faz();else{carregarTurnstile();let n=0;const iv=setInterval(()=>{if(window.turnstile||n++>50){clearInterval(iv);faz()}},100)}
}
function resetarTurnstile(){tsToken='';if(tsAtivo()&&window.turnstile&&tsWidget!=null){try{window.turnstile.reset(tsWidget)}catch(e){}}}


Object.assign(STATUS,{conta:['ok','Salvo na sua conta'],pendente:['warn','Sem conexão: salvo no celular, envia depois'],bloqueada:['bad','Teste encerrado: salvo só no celular']});

// Dados do app → linhas do banco
function linhasBase(){
  return{
    marcas:MARCAS.map(m=>({id:String(m.id),nome:m.nome,taxa:m.taxa,cor:m.cor,site:m.site||''})),
    produtos:PRODUTOS.map(x=>({id:String(x.id),marca:x.marca,ref:x.ref||'',nome:x.nome,preco:x.preco||0,foto:/^https?:/i.test(x.foto||'')?x.foto:'',un:x.un||null})),
    lojas:lojas.map(l=>({id:String(l.id),nome:l.nome,cidade:l.cidade||'',uf:l.uf,regiao:l.regiao||'',marcas:l.marcas||[],lng:l.coord?l.coord[0]:null,lat:l.coord?l.coord[1]:null,arquivada:!!l.arquivada,cnpj:l.cnpj||null,taxas:l.taxas&&Object.keys(l.taxas).length?l.taxas:null})),
    pedidos:pedidos.map(o=>({id:String(o.id),loja:String(o.loja),marca:o.marca,data:isoD(o.data),valor:o.valor||0,previsto:o.previsto||null,pendente:!!o.pendente,pago:!!o.pago,taxa:o.taxa,colecao:o.colecao||'',itens:o.itens&&o.itens.length?o.itens:null})),
    despesas:DESPESAS.map(x=>({id:String(x.id),data:isoD(x.data),valor:x.valor,categoria:x.categoria||'',descricao:x.descricao||''}))
  };
}

// Quando cada registro foi editado (ms). O servidor ignora uma gravação mais antiga que a que ele já tem,
// então uma edição feita sem internet não desfaz outra mais nova feita em outro aparelho.
// carimbos[tabela][id]={h:conteúdo do registro, e:quando foi editado}
const CARIMBOS='rc-carimbos';
let carimbos=(()=>{try{return JSON.parse(localStorage.getItem(CARIMBOS))||{}}catch(e){return{}}})();
const guardarCarimbos=()=>{try{localStorage.setItem(CARIMBOS,JSON.stringify(carimbos))}catch(e){}};
function linhas(){
  const l=linhasBase();
  TABELAS.forEach(t=>{const c=carimbos[t]||{};l[t]=l[t].map(r=>({...r,editado_em:(c[r.id]||{}).e||0}))});
  return l;
}
// Marca como "editado agora" o que mudou desde o último carimbo. Registro igual ao que o servidor já tem herda o carimbo dele.
function carimbar(){
  const l=linhasBase();
  TABELAS.forEach(t=>{
    const c=carimbos[t]=carimbos[t]||{},vivos=new Set();
    l[t].forEach(r=>{
      vivos.add(r.id);const s=JSON.stringify(r),en=c[r.id];
      if(en&&en.h===s)return;
      let e=Date.now();
      const sv=espelho&&espelho[t]&&espelho[t].get(r.id);
      if(sv){try{const{editado_em,...resto}=JSON.parse(sv);if(JSON.stringify(resto)===s)e=editado_em||0}catch(x){}}
      c[r.id]={h:s,e};
    });
    Object.keys(c).forEach(id=>{if(!vivos.has(id))delete c[id]});
  });
  guardarCarimbos();
}
// Depois de ler o servidor: os registros passam a ter o carimbo que o servidor guarda
function semearCarimbos(srv){
  const l=linhasBase();
  TABELAS.forEach(t=>{
    const c={};
    l[t].forEach(r=>{const e=srv[t]&&srv[t][r.id];if(e!==undefined)c[r.id]={h:JSON.stringify(r),e};else if((carimbos[t]||{})[r.id])c[r.id]=carimbos[t][r.id]});
    carimbos[t]=c;
  });
  guardarCarimbos();
}
const perfilLocal=()=>({nome:NOME,regioes:REGIOES,colecoes:COLECOES,extras:{sugestoes,metas:METAS,agenda:AGENDA}});
// srv: carimbos vindos do servidor, para montar o espelho do que o servidor tem de fato
const espelhar=srv=>{const l=linhas(),e={perfil:JSON.stringify(perfilLocal())};
  TABELAS.forEach(t=>e[t]=new Map(l[t].map(r=>[r.id,JSON.stringify(srv&&srv[t]&&srv[t][r.id]!==undefined?{...r,editado_em:srv[t][r.id]}:r)])));return e};
const vazioEspelho=()=>{const e={perfil:''};TABELAS.forEach(t=>e[t]=new Map());return e};

function contaAtiva(){if(!perfil)return true;return perfil.plano==='ativo'||(perfil.plano==='trial'&&new Date(perfil.trial_ate)>new Date())}
function diasTrial(){return perfil?Math.max(0,Math.ceil((new Date(perfil.trial_ate)-new Date())/DAY)):0}

// Envia só o que mudou desde a última vez: primeiro marcas e lojas (os pedidos dependem delas), depois as remoções
// semApagar: usado ao reabrir com mudanças que não chegaram ao servidor (não apaga o que veio de outro aparelho)
function enviarConta(semApagar){
  if(!conta||exemplo||!espelho)return Promise.resolve();
  contaFila=contaFila.then(async()=>{
    carimbar();
    const atual=linhas(),pAtual=JSON.stringify(perfilLocal());
    try{
      marcarStatus('salvando');
      for(const t of TABELAS){
        const up=atual[t].filter(r=>espelho[t].get(r.id)!==JSON.stringify(r));
        for(let i=0;i<up.length;i+=500){const parte=up.slice(i,i+500);
          const{error}=await sb.from(t).upsert(parte.map(r=>({...r,user_id:conta.id})),{onConflict:'user_id,id'});if(error)throw error;
          parte.forEach(r=>espelho[t].set(r.id,JSON.stringify(r)))}
      }
      if(!semApagar)for(const t of [...TABELAS].reverse()){
        const ids=new Set(atual[t].map(r=>r.id)),del=[...espelho[t].keys()].filter(id=>!ids.has(id));
        for(let i=0;i<del.length;i+=200){const parte=del.slice(i,i+200);
          const{error}=await sb.from(t).delete().in('id',parte);if(error)throw error;parte.forEach(id=>espelho[t].delete(id))}
      }
      if(pAtual!==espelho.perfil){const{error}=await sb.from('profiles').update(perfilLocal()).eq('id',conta.id);if(error)throw error;espelho.perfil=pAtual}
      lsSet(PENDENTE,null);marcarStatus('conta');if(typeof subirFotosLocais==='function')setTimeout(subirFotosLocais,0);
    }catch(e){console.warn('Não salvou na conta',e);marcarStatus(contaAtiva()?'pendente':'bloqueada')}
  });
  return contaFila;
}
function agendarConta(){if(!conta)return false;lsSet(PENDENTE,conta.id);marcarStatus('salvando');clearTimeout(contaT);contaT=setTimeout(enviarConta,800);return true}

async function buscarTudo(t){
  const todas=[];
  for(let i=0;;i+=1000){const{data,error}=await sb.from(t).select('*').order('id').range(i,i+999);if(error)throw error;todas.push(...data);if(data.length<1000)break}
  return todas;
}
// Banco → dados do app
async function lerConta(){
  const{data:p,error}=await sb.from('profiles').select('*').eq('id',conta.id).single();if(error)throw error;perfil=p;
  const [ma,pr,lo,pe,de]=await Promise.all(TABELAS.map(buscarTudo));
  const srvCarimbos=Object.fromEntries(TABELAS.map((t,i)=>[t,Object.fromEntries([ma,pr,lo,pe,de][i].map(x=>[String(x.id),+x.editado_em||0]))]));
  return{vazio:!ma.length&&!pr.length&&!lo.length&&!pe.length&&!de.length,carimbos:srvCarimbos,dados:{v:1,atualizado:Date.now(),nome:p.nome,regioes:p.regioes,colecoes:p.colecoes,sugestoes:(p.extras||{}).sugestoes||[],metas:(p.extras||{}).metas||[],agenda:(p.extras||{}).agenda||[],
    marcas:ma.map(m=>({id:m.id,nome:m.nome,taxa:+m.taxa,cor:m.cor,site:m.site||''})),
    produtos:pr.map(x=>({id:x.id,marca:x.marca,ref:x.ref,nome:x.nome,preco:+x.preco,foto:x.foto,...(x.un?{un:x.un}:{})})),
    lojas:lo.map(l=>({id:l.id,nome:l.nome,cidade:l.cidade,uf:l.uf,regiao:l.regiao,marcas:l.marcas||[],coord:l.lng!=null&&l.lat!=null?[l.lng,l.lat]:null,arquivada:l.arquivada,...(l.cnpj?{cnpj:l.cnpj}:{}),...(l.taxas?{taxas:l.taxas}:{})})),
    pedidos:pe.map(o=>({id:/^\d+$/.test(o.id)?+o.id:o.id,loja:o.loja,marca:o.marca,data:o.data,valor:+o.valor,previsto:o.previsto!=null?+o.previsto:0,pendente:o.pendente,pago:o.pago,taxa:+o.taxa,colecao:o.colecao,...(o.itens?{itens:o.itens}:{})})),
    despesas:de.map(x=>({id:x.id,data:x.data,valor:+x.valor,categoria:x.categoria,descricao:x.descricao}))}};
}
const temDadosLocais=()=>!exemplo&&(MARCAS.length||lojas.length||pedidos.length||DESPESAS.length||PRODUTOS.length);

// Depois de entrar: conta vazia recebe os dados do celular; conta com dados manda nos dados do celular (com cópia guardada)
async function sincronizarAoEntrar(){
  marcarStatus('salvando');
  try{
    let r=await lerConta();
    if(exemplo)sairExemplo();
    const dono=lsGet(DONO);
    if(r.vazio){
      espelho=vazioEspelho();
      const meta=conta.user_metadata||{},nomeServidor=(r.dados.nome||'').trim()||String(meta.nome||meta.full_name||meta.name||'').trim().split(/\s+/)[0].slice(0,40);
      if(temDadosLocais()&&dono&&dono!==conta.id){
        // Dados deste aparelho são de OUTRA conta: não vão para a conta nova
        lsSet(OUTRA_CONTA,JSON.stringify(serializar()));
        aplicar(limpar({}));if(nomeServidor)NOME=nomeServidor;try{localStorage.setItem(CHAVE,JSON.stringify(serializar()))}catch(e){}
        sairEdicoes();preencherForm();espelho.perfil='';await enviarConta();
        toast('Conta nova começando do zero. Os dados da conta anterior não foram copiados.');
      }
      else if(temDadosLocais()){if(!NOME&&nomeServidor)NOME=nomeServidor;await enviarConta();toast('Seus dados do celular foram enviados para a sua conta')}
      else{if(!NOME&&nomeServidor)NOME=nomeServidor;espelho.perfil='';enviarConta()}
      lsSet(DONO,conta.id);
      renderTudo();
    }else{
      if(temDadosLocais()){lsSet(BACKUP_ANTES,JSON.stringify(serializar()));
        // Mudanças feitas sem internet: sobem primeiro, depois tudo é lido de novo do servidor
        if(lsGet(PENDENTE)===conta.id){const meu=serializar();aplicar(r.dados);espelho=espelhar(r.carimbos);aplicar(meu);await enviarConta(true);r=await lerConta()}}
      aplicar(r.dados);semearCarimbos(r.carimbos);try{localStorage.setItem(CHAVE,JSON.stringify(serializar()))}catch(e){}
      espelho=espelhar();
      if(!NOME){const m=conta.user_metadata||{},n=String(m.nome||m.full_name||m.name||'').trim().split(/\s+/)[0];if(n){NOME=n.slice(0,40);try{localStorage.setItem(CHAVE,JSON.stringify(serializar()))}catch(e){}agendarConta()}}lsSet(DONO,conta.id);sairEdicoes();preencherForm();renderTudo();marcarStatus('conta');toast('Dados da sua conta carregados');
    }
  }catch(e){console.warn('Conta indisponível',e);espelho=null;marcarStatus('pendente');toast('Não foi possível falar com o servidor agora. Seus dados continuam no celular.')}
  if($('#cEmail')||$('[data-conta-sair]'))renderAjustes();
}

// Relê só o plano e a data do teste (barato): libera na hora quem acabou de assinar
async function atualizarPlano(){
  if(!sb||!conta||!perfil)return;
  try{const{data,error}=await sb.from('profiles').select('plano,trial_ate').eq('id',conta.id).single();if(error||!data)return;
    const antes=contaAtiva();perfil={...perfil,...data};
    if(antes!==contaAtiva()){if(contaAtiva()){toast('Assinatura ativa. Obrigado!');fecharLoja();enviarConta()}renderTudo()}
    else if(typeof atualizarAvisoPlano==='function')atualizarAvisoPlano();
  }catch(e){}
}
// Reserva: se a volta do Google trouxe o login no endereço e a biblioteca não leu em 4s, entra direto com ele
function resgatarLoginDaUrl(){
  const h=new URLSearchParams(location.hash.slice(1)),at=h.get('access_token'),rt=h.get('refresh_token');
  if(!at||!rt)return;
  setTimeout(async()=>{
    if(conta)return;
    try{const {data,error}=await sb.auth.setSession({access_token:at,refresh_token:rt});
      if(error)throw error;
      if(location.hash.includes('access_token'))history.replaceState(null,'',location.pathname+location.search);
      if(typeof registrarErro==='function')registrarErro('diag-login: precisou do resgate e deu certo','resgate');
    }catch(e){if(typeof registrarErro==='function')registrarErro('diag-login: resgate falhou: '+(e&&e.message||e),'resgate')}
  },4000);
}
function carregarLib(){return new Promise((ok,falha)=>{if(window.supabase&&window.supabase.createClient)return ok();const s=document.createElement('script');s.src=SB_LIB;s.integrity=SB_SRI;s.crossOrigin='anonymous';s.onload=ok;s.onerror=falha;document.head.appendChild(s)})}
async function iniciarConta(){
  try{await carregarLib()}catch(e){console.warn('Biblioteca da conta não carregou',e);return}
  // lock simples: a trava do navegador (navigator.locks) às vezes fica presa no Safari e o login nunca termina
  sb=window.supabase.createClient(SB_URL,SB_CHAVE,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,lock:async(_n,_t,fn)=>await fn()}});
  resgatarLoginDaUrl();
  sb.auth.onAuthStateChange((ev,sess)=>{
    const u=sess&&sess.user;
    if(ev==='PASSWORD_RECOVERY'){mostrarEntrada('nova');return}
    if(u){if($('#entrada')&&!$('#entrada').hidden&&entradaModo!=='nova')esconderEntrada();if(!conta||conta.id!==u.id){conta=u;sincronizarAoEntrar()}}
    else{if(conta){conta=null;perfil=null;espelho=null;marcarStatus('local')}
      const criar=/[?&]criar=1/.test(location.search);
      if(criar)history.replaceState(null,'',location.pathname+location.hash);
      // Link de demonstração (?exemplo=1): abre o app com dados de exemplo, sem pedir conta. Nada é salvo.
      if(ev==='INITIAL_SESSION'&&!criar&&/[?&]exemplo=1/.test(location.search)){if(!exemplo)entrarExemplo();return}
      if(ev==='INITIAL_SESSION'&&(criar||lsGet(SEM_CONTA)!=='1'))mostrarEntrada(criar?'criar':'entrar')}
  });
  addEventListener('online',()=>{if(conta&&espelho)enviarConta()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')atualizarPlano()});
  setInterval(()=>{if(document.visibilityState==='visible')atualizarPlano()},10*60e3);
}

// Outra aba trocou de conta, excluiu a conta ou apagou os dados: esta aba recarrega para não misturar dados
addEventListener('storage',e=>{
  if(e.key===DONO&&e.oldValue!==e.newValue||e.key===CHAVE&&e.newValue===null){
    if(window.__recarregando)return;window.__recarregando=true;setTimeout(()=>location.reload(),200)}
});

// ---------- tela de entrada (abre no começo do app) ----------
const SEM_CONTA='rc-sem-conta';
let entradaModo='entrar',entradaMsg='',entradaOk='',entradaCarregando=false,contaNome='';
const PIN_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6" fill="#FFC83D" stroke="none"/></svg>';
const ROTA_SVG='<svg class="en-rota" viewBox="0 0 320 96" fill="none" aria-hidden="true"><path d="M16 72 C72 72 72 24 128 24 S184 72 240 56 S288 24 304 24" stroke="rgba(255,255,255,.45)" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>'
  +[[16,72],[128,24],[240,56],[304,24]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i===3?10:7}" fill="${i===3?'#FFC83D':'#fff'}"/><circle cx="${x}" cy="${y}" r="3" fill="${i===3?'#141833':'#3346D3'}"/>`).join('')+'</svg>';
const OLHO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ENVELOPE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';

function mostrarEntrada(modo){
  entradaModo=modo||entradaModo;entradaMsg='';entradaOk='';
  let el=$('#entrada');
  if(!el){el=document.createElement('div');el.id='entrada';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Entrar no Rota Comercial');document.body.appendChild(el)}
  renderEntrada();el.hidden=false;document.body.classList.add('com-entrada');
}
function esconderEntrada(){const el=$('#entrada');if(el)el.hidden=true;document.body.classList.remove('com-entrada')}
function renderEntrada(){
  const el=$('#entrada');if(!el)return;
  const m=entradaModo,car=entradaCarregando,campoEmail=(foco)=>`<label class="f" for="cEmail">E-mail</label><input id="cEmail" type="email" autocomplete="email" inputmode="email" maxlength="160" placeholder="voce@email.com" value="${esc(contaEmail)}"${foco?' autofocus':''}>`;
  const campoSenha=(novo)=>`<label class="f" for="cSenha">${m==='nova'?'Nova senha':'Senha'}</label><div class="en-senha"><input id="cSenha" type="password" autocomplete="${novo?'new-password':'current-password'}" maxlength="72" placeholder="${novo?'8+ caracteres, com letra e número':''}"><button type="button" class="en-olho" data-en-olho aria-label="Mostrar senha">${OLHO}</button></div>`;
  let corpo='';
  if(m==='confirme'){
    corpo=`<div class="en-aviso"><div class="en-ico">${ENVELOPE}</div><h2>Confira seu e-mail</h2><p>Enviamos um link para <b>${esc(contaEmail)}</b>. Toque nele para ativar sua conta e voltar para o app.</p></div>
      ${entradaOk?`<div class="en-ok">${esc(entradaOk)}</div>`:''}${entradaMsg?`<div class="erro">${esc(entradaMsg)}</div>`:''}
      <button type="button" class="btn" data-en-modo="entrar">Já confirmei, entrar</button>
      <button type="button" class="en-link" data-en-reenviar${car?' disabled':''}>Não chegou? Reenviar e-mail</button>`;
  }else if(m==='esqueci'){
    corpo=`<h2 class="en-tit">Recuperar senha</h2><p class="en-sub">Enviamos um link para você criar uma senha nova.</p>
      <form novalidate data-en-form>${campoEmail(true)}
      ${entradaOk?`<div class="en-ok">${esc(entradaOk)}</div>`:''}${entradaMsg?`<div class="erro">${esc(entradaMsg)}</div>`:''}
      ${tsAtivo()?'<div id="ts-box" class="ts-box"></div>':''}<button class="btn"${car?' disabled':''}>${car?'Enviando…':'Enviar link'}</button></form>
      <button type="button" class="en-link" data-en-modo="entrar">Voltar para entrar</button>`;
  }else if(m==='nova'){
    corpo=`<h2 class="en-tit">Crie uma senha nova</h2><form novalidate data-en-form>${campoSenha(true)}
      ${entradaMsg?`<div class="erro">${esc(entradaMsg)}</div>`:''}<button class="btn"${car?' disabled':''}>${car?'Salvando…':'Salvar senha'}</button></form>`;
  }else{
    const criar=m==='criar';
    corpo=`<div class="en-seg" role="tablist"><button type="button" role="tab" aria-selected="${!criar}" class="${criar?'':'on'}" data-en-modo="entrar">Entrar</button><button type="button" role="tab" aria-selected="${criar}" class="${criar?'on':''}" data-en-modo="criar">Criar conta</button></div>
      <button type="button" class="btn en-google" data-en-google${car?' disabled':''}><span class="en-g" aria-hidden="true">G</span>Continuar com Google</button>
      <div class="en-ou" aria-hidden="true"><span>ou com e-mail</span></div>
      <form novalidate data-en-form>
      ${criar?`<label class="f" for="cNome">Seu nome</label><input id="cNome" type="text" autocomplete="given-name" maxlength="40" value="${esc(contaNome||NOME)}" placeholder="Como quer ser chamado">`:''}
      ${campoEmail(!criar)}${campoSenha(criar)}
      ${entradaMsg?`<div class="erro">${esc(entradaMsg)}</div>`:''}
      ${tsAtivo()?'<div id="ts-box" class="ts-box"></div>':''}<button class="btn"${car?' disabled':''}>${car?(criar?'Criando conta…':'Entrando…'):(criar?'Começar 7 dias grátis':'Entrar')}</button>
      </form>
      ${criar?'<p class="en-nota">Sem cartão de crédito. Seus dados deste aparelho vão junto para a conta.</p><p class="en-nota">Ao criar a conta, você concorda com os <a href="termos.html" target="_blank" rel="noopener">Termos de uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.</p>':'<button type="button" class="en-link" data-en-modo="esqueci">Esqueci minha senha</button>'}`;
  }
  el.innerHTML=`<div class="en-wrap"><header class="en-hero"><div class="en-logo">${PIN_SVG}</div><h1>Rota Comercial</h1><p>Comissões, lojas e viagens do representante, num lugar só.</p>${ROTA_SVG}</header>
    <section class="en-card">${corpo}${m==='nova'?'':`<button type="button" class="en-pular" data-en-pular>Continuar sem conta<span>Os dados ficam só neste aparelho</span></button>`}</section></div>`;
  const f=el.querySelector('[data-en-form]');if(f)f.onsubmit=e=>{e.preventDefault();enviarEntrada()};
  if(['entrar','criar','esqueci'].includes(m))renderTurnstile();
}
// Senha forte: 8 a 72 caracteres, com pelo menos uma letra e um número
function senhaForte(s){s=String(s||'');senhaForte.motivo='';
  if(s.length<8){senhaForte.motivo='A senha precisa ter pelo menos 8 caracteres.';return false}
  if(s.length>72){senhaForte.motivo='A senha pode ter no máximo 72 caracteres.';return false}
  if(!/[A-Za-zÀ-ÿ]/.test(s)||!/[0-9]/.test(s)){senhaForte.motivo='Misture letras e números para uma senha mais segura.';return false}
  return true}
const lerCampos=()=>{const v=id=>($(id)||{}).value;if(v('#cEmail')!=null)contaEmail=v('#cEmail').trim();if(v('#cNome')!=null)contaNome=v('#cNome').trim();return{email:contaEmail,senha:v('#cSenha')||''}};
async function enviarEntrada(){
  if(entradaCarregando)return;
  const{email,senha}=lerCampos(),m=entradaModo;entradaMsg='';entradaOk='';
  if(m!=='nova'&&!/^\S+@\S+\.\S+$/.test(email))entradaMsg='Digite um e-mail válido.';
  else if(m==='entrar'&&!senha)entradaMsg='Digite sua senha.';
  else if((m==='criar'||m==='nova')&&!senhaForte(senha))entradaMsg=senhaForte.motivo;
  if(!entradaMsg&&tsAtivo()&&(m==='criar'||m==='entrar'||m==='esqueci')&&!tsToken)entradaMsg='Confirme que você não é um robô.';
  if(entradaMsg)return renderEntrada();
  const captchaToken=tsToken||undefined;
  entradaCarregando=true;renderEntrada();
  try{
    if(m==='criar'){
      if(contaNome){NOME=contaNome.slice(0,40);salvar()}
      const{data,error}=await sb.auth.signUp({email,password:senha,options:{data:{nome:NOME},emailRedirectTo:location.origin+location.pathname,captchaToken}});if(error)throw error;
      if(!data.session)entradaModo='confirme';
    }else if(m==='entrar'){const{error}=await sb.auth.signInWithPassword({email,password:senha,options:{captchaToken}});if(error)throw error}
    else if(m==='esqueci'){const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname,captchaToken});if(error)throw error;entradaOk='Pronto! Se existir uma conta com esse e-mail, o link chega em instantes.'}
    else if(m==='nova'){const{error}=await sb.auth.updateUser({password:senha});if(error)throw error;toast('Senha nova salva');entradaCarregando=false;esconderEntrada();return}
  }catch(e){entradaMsg=traduzErro(e)}
  resetarTurnstile();
  entradaCarregando=false;if($('#entrada')&&!$('#entrada').hidden)renderEntrada();
}
async function reenviarConfirmacao(){entradaCarregando=true;renderEntrada();try{const{error}=await sb.auth.resend({type:'signup',email:contaEmail,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;entradaOk='E-mail reenviado.'}catch(e){entradaMsg=traduzErro(e)}entradaCarregando=false;renderEntrada()}
function pularEntrada(){lsSet(SEM_CONTA,'1');esconderEntrada()}

// ---------- conta em Ajustes ----------
function blocoConta(){
  if(!sb)return `<h2>Sua conta</h2><p class="ufmsg" style="margin-top:0">A conta não está disponível agora. Verifique a internet e abra Ajustes de novo.</p>`;
  if(conta){
    const ativa=contaAtiva(),d=diasTrial();
    const sit=!perfil?'':perfil.plano==='ativo'?'Assinatura ativa':ativa?`Teste grátis: ${d===1?'falta 1 dia':`faltam ${d} dias`}`:'Teste encerrado: você pode ver tudo, mas novos lançamentos não vão para a conta';
    return `<h2>Sua conta</h2><div class="list" style="padding:var(--s3)"><div class="t">${esc(conta.email||'')}</div><p class="s" style="margin:var(--s1) 0 0${perfil&&!ativa?';color:var(--bad)':''}">${esc(sit)}</p></div>
      <div style="display:flex;gap:var(--s2);margin-top:var(--s2)"><button class="btn ghost" data-conta-sync style="margin:0">Sincronizar agora</button><button class="btn ghost" data-conta-sair style="margin:0">Sair da conta</button></div>
      <button class="btn ghost perigo" data-excluir-conta>Excluir minha conta</button>`;
  }
  return `<h2>Sua conta</h2><p class="ufmsg" style="margin-top:0">Com uma conta, seus dados ficam guardados no servidor e aparecem em qualquer aparelho.</p><button class="btn" data-conta-abrir>Entrar ou criar conta</button>`;
}
const traduzErro=e=>{const m=String(e&&e.message||e||'');
  if(/captcha/i.test(m))return'Não consegui confirmar que você não é um robô. Tente de novo.';
  if(/Invalid login/i.test(m))return'E-mail ou senha incorretos.';
  if(/Email not confirmed/i.test(m))return'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if(/already registered/i.test(m))return'Esse e-mail já tem conta. Toque em Entrar.';
  if(/Password should be|weak/i.test(m))return'Escolha uma senha mais forte: pelo menos 8 caracteres, com letras e números.';
  if(/rate limit|too many/i.test(m))return'Muitas tentativas. Espere alguns minutos e tente de novo.';
  return'Não foi possível agora. Verifique a internet e tente de novo.'};
async function contaSair(){
  // Sobe o que ainda não chegou ao servidor; se não der, avisa antes de apagar do aparelho
  if(conta&&espelho&&!exemplo){clearTimeout(contaT);try{await enviarConta()}catch(e){}
    if(lsGet(PENDENTE)===conta.id&&!confirm('Há mudanças que ainda não foram salvas na conta e vão se perder se você sair agora. Sair mesmo assim?'))return}
  try{await sb.auth.signOut({scope:'local'})}catch(e){}
  conta=null;perfil=null;espelho=null;
  // Os dados são da conta: saem do aparelho para não aparecerem no modo sem conta
  aplicar(limpar({}));try{localStorage.setItem(CHAVE,JSON.stringify(serializar()))}catch(e){}
  lsSet(DONO,null);lsSet(PENDENTE,null);lsSet(BACKUP_ANTES,null);lsSet(OUTRA_CONTA,null);
  sairEdicoes();preencherForm();renderTudo();fecharLoja();verBrasil();marcarStatus('vazio');toast('Você saiu da conta. Os dados dela foram removidos deste aparelho.');mostrarEntrada('entrar')}

iniciarConta();
