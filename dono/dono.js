const SB_URL='https://ulafdnjjdiscowijqwdg.supabase.co',SB_CHAVE='sb_publishable_-1c4r5XV26WUFY82X6Rwtw_9KmLDXj4';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const real=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const dia=d=>d?new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'—';
const relativo=d=>{if(!d)return 'nunca';const h=(Date.now()-new Date(d))/36e5;if(h<1)return 'agora há pouco';if(h<24)return `há ${Math.floor(h)}h`;const n=Math.floor(h/24);return n===1?'ontem':`há ${n} dias`};
const toast=t=>{const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2600)};
let sb=null,dados=null,filtro='todos',busca='',confirmar=null;

function aviso(html){$('#conteudo').innerHTML=`<div class="aviso">${html}</div>`;$('#quando').textContent=''}

async function carregar(){
  $('#atualizar').disabled=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){aviso('<p><b>Entre no app com a conta do dono</b> e volte aqui.</p><a class="btn pri" href="../">Abrir o app</a>');return}
    const {data,error}=await sb.rpc('painel_dono');
    if(error){aviso(error.code==='42501'||/acesso negado/.test(error.message)?'<p><b>Este painel é só para o dono.</b></p><p class="s">Você entrou com '+esc(session.user.email)+'.</p>':'<p>Não consegui carregar agora.</p><p class="s">'+esc(error.message)+'</p>');return}
    dados=data;desenhar();
  }catch(e){aviso('<p>Sem conexão com o servidor.</p>')}
  finally{$('#atualizar').disabled=false}
}

function situacaoDe(u){
  if(u.situacao==='teste'&&u.trial_ate&&new Date(u.trial_ate)-Date.now()<2*864e5)return['logo','vence '+relativoFuturo(u.trial_ate)];
  return[u.situacao,{teste:'em teste',vencido:'teste vencido',pagante:'pagante'}[u.situacao]];
}
function relativoFuturo(d){const h=(new Date(d)-Date.now())/36e5;return h<24?`em ${Math.max(1,Math.round(h))}h`:`em ${Math.round(h/24)} dias`}

// Espaço usado x limites do plano grátis do Supabase (fotos 1 GB, banco 500 MB)
const LIM_FOTOS=1024**3,LIM_BANCO=500*1024**2;
const tam=b=>b>=1024**3?(b/1024**3).toFixed(2).replace('.',',')+' GB':b>=1024**2?(b/1024**2).toFixed(1).replace('.',',')+' MB':Math.round(b/1024)+' KB';
function espacoHtml(e){
  if(!e)return'';
  const barra=(usado,lim,titulo,det)=>{const pc=Math.min(100,usado/lim*100),cls=pc>=90?'bad':pc>=70?'warn':'ok';
    return `<div class="esp"><div class="esp-h"><b>${titulo}</b><span class="num">${tam(usado)} de ${tam(lim)}</span></div><div class="esp-bar"><i class="${cls}" style="width:${Math.max(1,pc)}%"></i></div><div class="s">${det}${pc>=70?` · <b class="${cls}">${Math.round(pc)}% usado${pc>=90?': hora de passar para o plano Pro':''}</b>`:` · ${pc<1?'menos de 1':Math.round(pc)}% usado`}</div></div>`};
  const media=e.fotos_n?e.fotos_bytes/e.fotos_n:80*1024,cabem=Math.max(0,Math.floor((LIM_FOTOS-e.fotos_bytes)/media));
  return `<h2>Espaço usado <span class="s">plano grátis do Supabase</span></h2><div class="card">
    ${barra(+e.fotos_bytes,LIM_FOTOS,'Fotos do catálogo',`${(+e.fotos_n).toLocaleString('pt-BR')} fotos · ${(+e.produtos).toLocaleString('pt-BR')} produtos · cabem mais ~${cabem.toLocaleString('pt-BR')} fotos`)}
    ${barra(+e.banco_bytes,LIM_BANCO,'Banco de dados','pedidos, lojas, produtos e contas')}
    ${e.maiores&&e.maiores.length?`<div class="s" style="margin-top:var(--s3)">Quem mais usa fotos</div>${e.maiores.map(m=>`<div class="esp-u"><span>${esc(m.email||'conta excluída')}</span><span class="num">${(+m.n).toLocaleString('pt-BR')} · ${tam(+m.bytes)}</span></div>`).join('')}`:''}
  </div>`;
}
// Busca de fotos (Brave): US$ 5 por mil buscas, com US$ 5 grátis por mês
function buscasHtml(b){
  if(!b)return'';const n=+b.mes||0,custo=Math.max(0,n*0.005-5),pc=Math.min(100,n/1000*100);
  return `<h2>Busca de fotos <span class="s">este mês</span></h2><div class="card"><div class="esp"><div class="esp-h"><b>${n.toLocaleString('pt-BR')} buscas</b><span class="num">${custo?'custo estimado US$ '+custo.toFixed(2).replace('.',','):'dentro do grátis'}</span></div>
    <div class="esp-bar"><i class="${pc>=90?'bad':pc>=70?'warn':'ok'}" style="width:${Math.max(1,pc)}%"></i></div>
    <div class="s">${(+b.usuarios||0).toLocaleString('pt-BR')} ${+b.usuarios===1?'pessoa usou':'pessoas usaram'} · as primeiras 1.000 do mês são grátis (US$ 5), depois US$ 5 por mil. Buscas repetidas não contam.</div></div></div>`;
}
function emailsHtml(m){
  if(!m)return'';const t=m.por_tipo||{},nome={teste_acabando:'teste acabando',teste_acabou:'teste acabou',sem_uso:'conta parada'};
  const partes=Object.keys(nome).map(k=>`${nome[k]}: ${(+t[k]||0).toLocaleString('pt-BR')}`).join(' · ');
  return `<h2>E-mails automáticos <span class="s">todo dia às 9h17</span></h2><div class="card"><div class="esp"><div class="esp-h"><b>${(+m.enviados||0).toLocaleString('pt-BR')} enviados</b><span class="num">${(+m.semana||0).toLocaleString('pt-BR')} nos últimos 7 dias</span></div>
    <div class="s">${partes} · ${(+m.sairam||0).toLocaleString('pt-BR')} ${+m.sairam===1?'pessoa pediu':'pessoas pediram'} para não receber</div></div></div>`;
}
function desenhar(){
  const r=dados.resumo,us=dados.usuarios,por=dados.por_dia;
  $('#quando').textContent='Atualizado às '+new Date(dados.agora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const conv=r.total?Math.round(r.com_pedido/r.total*100):0;
  const kpi=(n,t,dest)=>`<div class="kpi${dest?' dest':''}"><span class="s">${t}</span><b>${n}</b></div>`;
  const max=Math.max(1,...por.map(p=>p.n));
  const lista=us.filter(u=>{
    const [cls]=situacaoDe(u);
    if(filtro==='logo'&&cls!=='logo')return false;
    if(['teste','vencido','pagante'].includes(filtro)&&u.situacao!==filtro)return false;
    if(busca){const q=busca.toLowerCase();if(!(u.email||'').toLowerCase().includes(q)&&!(u.nome||'').toLowerCase().includes(q))return false}
    return true});
  const chips=[['todos','Todos',us.length],['logo','Vence logo',r.vencem2],['teste','Em teste',r.teste],['vencido','Vencidos',r.vencido],['pagante','Pagantes',r.pagante]];
  $('#conteudo').innerHTML=`
    <div class="kpis">
      ${kpi(real(r.receita),'Receita por mês',true)}
      ${kpi(r.pagante,'Pagantes')}${kpi(r.teste,'Em teste')}${kpi(r.vencido,'Teste vencido')}
      ${kpi(r.total,'Usuários')}${kpi(r.novos7,'Novos em 7 dias')}${kpi(r.ativos7,'Entraram em 7 dias')}
      ${kpi(conv+'%','Lançaram pedido')}
    </div>
    ${espacoHtml(dados.espaco)}${buscasHtml(dados.buscas)}${emailsHtml(dados.emails)}
    <h2>Cadastros por dia <span class="s">últimos 30 dias</span></h2>
    <div class="card"><div class="barras" role="img" aria-label="Cadastros por dia nos últimos 30 dias">${por.map(p=>`<i class="${p.n?'':'zero'}" style="height:${p.n?Math.max(8,p.n/max*100):3}%" title="${dia(p.d)}: ${p.n}"></i>`).join('')}</div>
      <div class="eixo s"><span>${dia(por[0]&&por[0].d)}</span><span>${por.reduce((a,p)=>a+p.n,0)} no período</span><span>hoje</span></div></div>
    <h2>Usuários</h2>
    <div class="filtros">${chips.map(([k,t,n])=>`<button class="chip${filtro===k?' on':''}" data-filtro="${k}">${t} · ${n}</button>`).join('')}</div>
    <input type="search" id="busca" placeholder="Buscar por nome ou e-mail" value="${esc(busca)}" aria-label="Buscar usuário">
    <div class="lista">${lista.map(u=>{const [cls,txt]=situacaoDe(u);return `
      <div class="u"><div class="u-h"><div class="grow"><div class="t">${esc(u.nome||'Sem nome')}</div><div class="s">${esc(u.email)}${u.provedor==='google'?' · Google':''}</div></div><span class="tag ${cls}">${esc(txt)}</span></div>
        <div class="dados">
          <div><span>Criou a conta</span>${dia(u.criado)}</div>
          <div><span>Último acesso</span>${relativo(u.ultimo_acesso)}</div>
          <div><span>Pedidos · lojas · produtos</span>${u.pedidos} · ${u.lojas} · ${u.produtos||0}</div>
          <div><span>Buscas de foto no mês</span>${u.buscas||0} de ${u.limite_buscas||150}</div>
          <div><span>${u.situacao==='pagante'?'Paga por mês':'Teste até'}</span>${u.situacao==='pagante'?real(u.valor||29.90):dia(u.trial_ate)}</div>
        </div>
        <div class="acoes">
          ${(u.buscas||0)>=(u.limite_buscas||150)*0.8?`<button class="btn mini" data-acao="buscas" data-valor="${(u.limite_buscas||150)+150}" data-email="${esc(u.email)}">+150 buscas</button>`:''}
          ${u.situacao!=='pagante'?`<button class="btn mini pri" data-acao="ativar" data-valor="29.90" data-email="${esc(u.email)}">Ativar R$ 29,90</button><button class="btn mini" data-acao="ativar" data-valor="19.90" data-email="${esc(u.email)}">Fundador R$ 19,90</button><button class="btn mini" data-acao="mais7" data-email="${esc(u.email)}">+7 dias de teste</button>`
            :`<button class="btn mini perigo" data-acao="pausar" data-email="${esc(u.email)}">${confirmar==='pausar|'+u.email?'Toque de novo para pausar':'Pausar (parou de pagar)'}</button>`}
          <button class="btn mini" data-copiar="${esc(u.email)}">Copiar e-mail</button>
        </div></div>`}).join('')||'<div class="vazio">Ninguém aqui.</div>'}</div>
    <h2>Últimos erros do app</h2>
    <div class="card">${dados.erros.length?dados.erros.map(e=>`<div class="erro-item"><b>${esc(e.mensagem)}</b><div class="s">${new Date(e.quando).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${esc(e.onde||'')} · ${esc(e.versao||'')}</div></div>`).join(''):'<div class="vazio">Nenhum erro registrado. 🎉</div>'}</div>`;
  const b=$('#busca');b.oninput=()=>{busca=b.value;const pos=b.selectionStart;desenhar();const n=$('#busca');n.focus();n.setSelectionRange(pos,pos)};
}

document.addEventListener('click',async e=>{
  const f=e.target.closest('[data-filtro]');if(f){filtro=f.dataset.filtro;confirmar=null;desenhar();return}
  const c=e.target.closest('[data-copiar]');if(c){try{await navigator.clipboard.writeText(c.dataset.copiar);toast('E-mail copiado')}catch(_){toast(c.dataset.copiar)}return}
  const a=e.target.closest('[data-acao]');if(!a)return;
  const {acao,email,valor}=a.dataset;
  if(acao==='pausar'&&confirmar!=='pausar|'+email){confirmar='pausar|'+email;desenhar();return}
  confirmar=null;a.disabled=true;
  const {error}=await sb.rpc('dono_alterar',{p_email:email,p_acao:acao,p_valor:valor?Number(valor):null});
  if(error){a.disabled=false;toast('Não deu: '+error.message);return}
  toast({ativar:'Conta ativada',mais7:'+7 dias de teste',pausar:'Conta pausada',buscas:'Limite de buscas aumentado'}[acao]);
  carregar();
});
$('#atualizar').onclick=carregar;

if(!window.supabase){aviso('<p>Não consegui carregar a biblioteca da conta. Verifique a internet e atualize.</p>')}
else{sb=window.supabase.createClient(SB_URL,SB_CHAVE,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,lock:async(_n,_t,fn)=>await fn()}});carregar()}
