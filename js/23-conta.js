// ---------- conta (Supabase): login, trial de 7 dias e sincronização por registro ----------
// A chave abaixo é pública por natureza: quem protege os dados são as regras do banco (cada um só vê o que é seu).
const SB_URL='https://ulafdnjjdiscowijqwdg.supabase.co',SB_CHAVE='sb_publishable_-1c4r5XV26WUFY82X6Rwtw_9KmLDXj4';
const SB_LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const TABELAS=['marcas','lojas','pedidos','despesas'];
const BACKUP_ANTES='rc-dados-antes-da-conta',PENDENTE='rc-conta-pendente';
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}},lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
let sb=null,conta=null,perfil=null,espelho=null,contaT=null,contaFila=Promise.resolve(),contaMsg='',contaEmail='';

Object.assign(STATUS,{conta:['ok','Salvo na sua conta'],pendente:['warn','Sem conexão: salvo no celular, envia depois'],bloqueada:['bad','Teste encerrado: salvo só no celular']});

// Dados do app → linhas do banco
function linhas(){
  return{
    marcas:MARCAS.map(m=>({id:String(m.id),nome:m.nome,taxa:m.taxa,cor:m.cor})),
    lojas:lojas.map(l=>({id:String(l.id),nome:l.nome,cidade:l.cidade||'',uf:l.uf,regiao:l.regiao||'',marcas:l.marcas||[],lng:l.coord?l.coord[0]:null,lat:l.coord?l.coord[1]:null,arquivada:!!l.arquivada})),
    pedidos:pedidos.map(o=>({id:String(o.id),loja:String(o.loja),marca:o.marca,data:isoD(o.data),valor:o.valor||0,previsto:o.previsto||null,pendente:!!o.pendente,pago:!!o.pago,taxa:o.taxa,colecao:o.colecao||''})),
    despesas:DESPESAS.map(x=>({id:String(x.id),data:isoD(x.data),valor:x.valor,categoria:x.categoria||'',descricao:x.descricao||''}))
  };
}
const perfilLocal=()=>({nome:NOME,regioes:REGIOES,colecoes:COLECOES,extras:{sugestoes}});
const espelhar=()=>{const l=linhas(),e={perfil:JSON.stringify(perfilLocal())};TABELAS.forEach(t=>e[t]=new Map(l[t].map(r=>[r.id,JSON.stringify(r)])));return e};
const vazioEspelho=()=>{const e={perfil:''};TABELAS.forEach(t=>e[t]=new Map());return e};

function contaAtiva(){if(!perfil)return true;return perfil.plano==='ativo'||(perfil.plano==='trial'&&new Date(perfil.trial_ate)>new Date())}
function diasTrial(){return perfil?Math.max(0,Math.ceil((new Date(perfil.trial_ate)-new Date())/DAY)):0}

// Envia só o que mudou desde a última vez: primeiro marcas e lojas (os pedidos dependem delas), depois as remoções
// semApagar: usado ao reabrir com mudanças que não chegaram ao servidor (não apaga o que veio de outro aparelho)
function enviarConta(semApagar){
  if(!conta||exemplo||!espelho)return Promise.resolve();
  contaFila=contaFila.then(async()=>{
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
      lsSet(PENDENTE,null);marcarStatus('conta');
    }catch(e){console.warn('Não salvou na conta',e);marcarStatus(contaAtiva()?'pendente':'bloqueada')}
  });
  return contaFila;
}
function agendarConta(){if(!conta)return false;lsSet(PENDENTE,conta.id);marcarStatus('salvando');clearTimeout(contaT);contaT=setTimeout(enviarConta,800);return true}

async function buscarTudo(t){
  const todas=[];
  for(let i=0;;i+=1000){const{data,error}=await sb.from(t).select('*').range(i,i+999);if(error)throw error;todas.push(...data);if(data.length<1000)break}
  return todas;
}
// Banco → dados do app
async function lerConta(){
  const{data:p,error}=await sb.from('profiles').select('*').eq('id',conta.id).single();if(error)throw error;perfil=p;
  const [ma,lo,pe,de]=await Promise.all(TABELAS.map(buscarTudo));
  return{vazio:!ma.length&&!lo.length&&!pe.length&&!de.length,dados:{v:1,atualizado:Date.now(),nome:p.nome,regioes:p.regioes,colecoes:p.colecoes,sugestoes:(p.extras||{}).sugestoes||[],
    marcas:ma.map(m=>({id:m.id,nome:m.nome,taxa:+m.taxa,cor:m.cor})),
    lojas:lo.map(l=>({id:l.id,nome:l.nome,cidade:l.cidade,uf:l.uf,regiao:l.regiao,marcas:l.marcas||[],coord:l.lng!=null&&l.lat!=null?[l.lng,l.lat]:null,arquivada:l.arquivada})),
    pedidos:pe.map(o=>({id:/^\d+$/.test(o.id)?+o.id:o.id,loja:o.loja,marca:o.marca,data:o.data,valor:+o.valor,previsto:o.previsto!=null?+o.previsto:0,pendente:o.pendente,pago:o.pago,taxa:+o.taxa,colecao:o.colecao})),
    despesas:de.map(x=>({id:x.id,data:x.data,valor:+x.valor,categoria:x.categoria,descricao:x.descricao}))}};
}
const temDadosLocais=()=>!exemplo&&(MARCAS.length||lojas.length||pedidos.length||DESPESAS.length);

// Depois de entrar: conta vazia recebe os dados do celular; conta com dados manda nos dados do celular (com cópia guardada)
async function sincronizarAoEntrar(){
  marcarStatus('salvando');
  try{
    let r=await lerConta();
    if(exemplo)sairExemplo();
    if(r.vazio){
      espelho=vazioEspelho();
      if(temDadosLocais()){await enviarConta();toast('Seus dados do celular foram enviados para a sua conta')}
      else{espelho.perfil='';enviarConta()}
    }else{
      if(temDadosLocais()){lsSet(BACKUP_ANTES,JSON.stringify(serializar()));
        // Mudanças feitas sem internet: sobem primeiro, depois tudo é lido de novo do servidor
        if(lsGet(PENDENTE)===conta.id){const meu=serializar();aplicar(r.dados);espelho=espelhar();aplicar(meu);await enviarConta(true);r=await lerConta()}}
      aplicar(r.dados);try{localStorage.setItem(CHAVE,JSON.stringify(serializar()))}catch(e){}
      espelho=espelhar();sairEdicoes();preencherForm();renderTudo();marcarStatus('conta');toast('Dados da sua conta carregados');
    }
  }catch(e){console.warn('Conta indisponível',e);espelho=null;marcarStatus('pendente');toast('Não foi possível falar com o servidor agora. Seus dados continuam no celular.')}
  if($('#cEmail')||$('[data-conta-sair]'))renderAjustes();
}

function carregarLib(){return new Promise((ok,falha)=>{if(window.supabase&&window.supabase.createClient)return ok();const s=document.createElement('script');s.src=SB_LIB;s.onload=ok;s.onerror=falha;document.head.appendChild(s)})}
async function iniciarConta(){
  if(window.claude)return; // dentro do artefato do Claude a conexão com servidores de fora é bloqueada
  try{await carregarLib()}catch(e){console.warn('Biblioteca da conta não carregou',e);return}
  sb=window.supabase.createClient(SB_URL,SB_CHAVE,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev,sess)=>{
    const u=sess&&sess.user;
    if(u&&(!conta||conta.id!==u.id)){conta=u;sincronizarAoEntrar()}
    else if(!u&&conta){conta=null;perfil=null;espelho=null;marcarStatus('local')}
  });
  addEventListener('online',()=>{if(conta&&espelho)enviarConta()});
}

// ---------- tela da conta em Ajustes ----------
function blocoConta(){
  if(window.claude)return'';
  if(!sb)return `<h2>Sua conta</h2><p class="ufmsg" style="margin-top:0">A conta não está disponível agora. Verifique a internet e abra Ajustes de novo.</p>`;
  if(conta){
    const ativa=contaAtiva(),d=diasTrial();
    const sit=!perfil?'':perfil.plano==='ativo'?'Assinatura ativa':ativa?`Teste grátis: ${d===1?'falta 1 dia':`faltam ${d} dias`}`:'Teste encerrado: você pode ver tudo, mas novos lançamentos não vão para a conta';
    return `<h2>Sua conta</h2><div class="list" style="padding:var(--s3)"><div class="t">${esc(conta.email||'')}</div><p class="s" style="margin:var(--s1) 0 0${perfil&&!ativa?';color:var(--bad)':''}">${esc(sit)}</p></div>
      <div style="display:flex;gap:var(--s2);margin-top:var(--s2)"><button class="btn ghost" data-conta-sync style="margin:0">Sincronizar agora</button><button class="btn ghost" data-conta-sair style="margin:0">Sair da conta</button></div>`;
  }
  return `<h2>Sua conta</h2><p class="ufmsg" style="margin-top:0">Com uma conta, seus dados ficam guardados no servidor e aparecem em qualquer aparelho. Os dados deste celular vão junto quando você cria a conta.</p>
    <form id="contaForm" novalidate onsubmit="event.preventDefault();contaAcao('entrar')"><label class="f" for="cEmail">E-mail</label><input id="cEmail" type="email" autocomplete="email" inputmode="email" value="${esc(contaEmail)}">
    <label class="f" for="cSenha">Senha</label><input id="cSenha" type="password" autocomplete="current-password" minlength="8">
    ${contaMsg?`<div class="erro">${esc(contaMsg)}</div>`:''}
    <div style="display:flex;gap:var(--s2);margin-top:var(--s3)"><button type="button" class="btn" data-conta-entrar style="margin:0">Entrar</button><button type="button" class="btn ghost" data-conta-criar style="margin:0">Criar conta (7 dias grátis)</button></div></form>`;
}
const traduzErro=e=>{const m=String(e&&e.message||e||'');
  if(/Invalid login/i.test(m))return'E-mail ou senha incorretos.';
  if(/Email not confirmed/i.test(m))return'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if(/already registered/i.test(m))return'Esse e-mail já tem conta. Use Entrar.';
  if(/Password should be/i.test(m))return'A senha precisa ter pelo menos 8 caracteres.';
  if(/rate limit/i.test(m))return'Muitas tentativas. Espere alguns minutos e tente de novo.';
  return'Não foi possível agora. Verifique a internet e tente de novo.'};
async function contaAcao(tipo){
  const email=($('#cEmail')||{}).value?.trim(),senha=($('#cSenha')||{}).value||'';contaEmail=email||'';
  contaMsg='';
  if(!/^\S+@\S+\.\S+$/.test(email||''))contaMsg='Digite um e-mail válido.';
  else if(senha.length<8)contaMsg='A senha precisa ter pelo menos 8 caracteres.';
  if(contaMsg)return renderAjustes();
  try{
    if(tipo==='criar'){
      const{data,error}=await sb.auth.signUp({email,password:senha,options:{data:{nome:NOME},emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
      if(!data.session)toast('Conta criada. Abra o link que enviamos para o seu e-mail para confirmar.');
    }else{const{error}=await sb.auth.signInWithPassword({email,password:senha});if(error)throw error}
  }catch(e){contaMsg=traduzErro(e)}
  renderAjustes();
}
async function contaSair(){try{await sb.auth.signOut()}catch(e){}conta=null;perfil=null;espelho=null;marcarStatus('local');toast('Você saiu da conta. Os dados continuam neste celular.');renderAjustes()}

iniciarConta();
