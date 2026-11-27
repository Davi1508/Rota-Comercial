// Leads de venda: o painel mostra o próximo lead e abre o WhatsApp com o número e a mensagem prontos.
const MSG_PADRAO='Oi, tudo bem? Vi que vocês estão buscando representantes comerciais. Eu criei o Rota Comercial, um app de celular em que o representante tira o pedido na hora, com catálogo e fotos, e acompanha a comissão de cada cliente. Custa R$ 29,90 por mês e tem 7 dias grátis.\n\nDá para ver funcionando sem cadastro: https://rotacomercial.app.br/?exemplo=1\n\nPosso te mostrar em 2 minutos?';
const ST_LEAD={novo:'A contatar',contatado:'Contatado',respondeu:'Respondeu',cliente:'Virou cliente',sem_interesse:'Sem interesse'};
const PRI_LEAD={alta:0,media:1,baixa:2};
let leads=[],filtroLead='novo',pulados=new Set(),abertoLead=null,novoLeadAberto=false;

function msgLead(l){let m=MSG_PADRAO;try{m=localStorage.getItem('rc_dono_msg')||MSG_PADRAO}catch(_){}
  return m.replace(/\{empresa\}/g,l.empresa)}
// Aceita (11) 99999-9999, 11999999999, +55 11 99999-9999 e 0xx11…; devolve 55DDDNÚMERO ou null
function foneLead(v){let d=String(v||'').replace(/\D/g,'');if(d.startsWith('0800')||d.startsWith('0300'))return null;
  d=d.replace(/^0+/,'');if((d.length===12||d.length===13)&&!d.startsWith('55'))d=d.slice(2); // tira código de operadora (0 21 …)
  if(d.length===10||d.length===11)d='55'+d;return /^55\d{10,11}$/.test(d)?d:null}
const foneBonito=d=>{if(!d)return'';const n=d.slice(2);return `(${n.slice(0,2)}) ${n.length===11?n.slice(2,7)+'-'+n.slice(7):n.slice(2,6)+'-'+n.slice(6)}`};
const linkZap=l=>`https://wa.me/${l.telefone}?text=${encodeURIComponent(msgLead(l))}`;
const linkBusca=l=>'https://www.google.com/search?q='+encodeURIComponent(`${l.empresa.replace(/\(.*\)/,'')} ${l.regiao||''} whatsapp comercial`.replace(/\s+/g,' ').trim());
const ordemLead=(a,b)=>(PRI_LEAD[a.prioridade]-PRI_LEAD[b.prioridade])||((b.telefone?1:0)-(a.telefone?1:0))||(a.id-b.id);

async function carregarLeads(){
  const {data,error}=await sb.from('leads').select('*').order('id');
  if(error){$('#leads').innerHTML='';return}
  leads=data;desenharLeads();
}

function acoesLead(l,grande){
  const cls=grande?'btn':'btn mini';
  const zap=l.telefone?`<a class="${cls} pri" href="${esc(linkZap(l))}" target="_blank" rel="noopener" data-zap="${l.id}">Abrir WhatsApp · ${esc(foneBonito(l.telefone))}</a>`
    :`<form class="fone" data-fone="${l.id}"><input type="tel" inputmode="tel" placeholder="Cole o WhatsApp da empresa" aria-label="WhatsApp de ${esc(l.empresa)}" autocomplete="off"><button class="${cls} pri">Salvar</button></form>`;
  return `${zap}
    ${l.telefone?'':`<a class="${cls}" href="${esc(linkBusca(l))}" target="_blank" rel="noopener">Achar o WhatsApp</a>`}
    ${l.fonte?`<a class="${cls}" href="${esc(l.fonte)}" target="_blank" rel="noopener">Ver anúncio</a>`:''}
    <button class="${cls}" data-copiar-msg="${l.id}">Copiar mensagem</button>`;
}

function desenharLeads(){
  const el=$('#leads');if(!el)return;
  const conta=s=>leads.filter(l=>l.status===s).length;
  const fila=leads.filter(l=>l.status==='novo'&&!pulados.has(l.id)).sort(ordemLead);
  const prox=fila[0];
  const chips=[['novo','A contatar'],['contatado','Contatados'],['respondeu','Responderam'],['cliente','Clientes'],['sem_interesse','Sem interesse'],['todos','Todos']];
  const lista=leads.filter(l=>filtroLead==='todos'||l.status===filtroLead).sort(ordemLead);
  el.innerHTML=`
    <h2>Leads <span class="s">${conta('novo')} para contatar · ${conta('respondeu')} responderam · ${conta('cliente')} viraram cliente</span></h2>
    ${prox?`<div class="card prox">
      <div class="s">Próximo lead</div>
      <div class="u-h"><div class="grow"><div class="t">${esc(prox.empresa)}</div><div class="s">${esc([prox.ramo,prox.regiao].filter(Boolean).join(' · '))}</div></div><span class="tag pri-${prox.prioridade}">${{alta:'alta',media:'média',baixa:'baixa'}[prox.prioridade]}</span></div>
      ${prox.notas?`<div class="s nota">${esc(prox.notas)}</div>`:''}
      <div class="msg">${esc(msgLead(prox))}</div>
      <div class="acoes">${acoesLead(prox,true)}<button class="btn" data-pular="${prox.id}">Pular</button></div>
    </div>`:`<div class="card vazio">${pulados.size?'Você pulou os que faltam. <button class="btn mini" data-despular>Mostrar de novo</button>':'Nenhum lead para contatar. Adicione mais abaixo.'}</div>`}
    <div class="filtros" style="margin-top:var(--s3)">${chips.map(([k,t])=>`<button class="chip${filtroLead===k?' on':''}" data-filtro-lead="${k}">${t} · ${k==='todos'?leads.length:conta(k)}</button>`).join('')}</div>
    <div class="lista">${lista.map(l=>`
      <div class="u"><div class="u-h" data-abrir-lead="${l.id}" role="button" tabindex="0" aria-expanded="${abertoLead===l.id}"><div class="grow"><div class="t">${esc(l.empresa)}</div>
        <div class="s">${esc([l.ramo,l.regiao,foneBonito(l.telefone),l.contatado_em?'contatado '+relativo(l.contatado_em):''].filter(Boolean).join(' · '))}</div></div>
        <span class="tag st-${l.status}">${ST_LEAD[l.status]}</span></div>
        ${abertoLead===l.id?`${l.notas?`<div class="s nota">${esc(l.notas)}</div>`:''}
          <div class="acoes">${acoesLead(l,false)}</div>
          <div class="acoes" style="margin-top:var(--s2)">
            <select data-status-lead="${l.id}" aria-label="Situação">${Object.entries(ST_LEAD).map(([k,t])=>`<option value="${k}"${k===l.status?' selected':''}>${t}</option>`).join('')}</select>
            ${l.telefone?`<button class="btn mini" data-tirar-fone="${l.id}">Trocar número</button>`:''}
          </div>`:''}
      </div>`).join('')||'<div class="vazio">Nenhum lead aqui.</div>'}</div>
    <div class="acoes" style="margin-top:var(--s2)">
      <button class="btn mini" data-novo-lead>${novoLeadAberto?'Fechar':'+ Adicionar lead'}</button>
    </div>
    ${novoLeadAberto?`<form class="card novo-lead" id="formLead">
      <label>Empresa<input name="empresa" required maxlength="120"></label>
      <label>WhatsApp<input name="telefone" type="tel" inputmode="tel" placeholder="(71) 99999-9999"></label>
      <label>Ramo<input name="ramo" maxlength="120"></label>
      <label>Cidade ou região<input name="regiao" maxlength="120"></label>
      <label>Anotação<input name="notas" maxlength="500"></label>
      <button class="btn pri">Salvar lead</button></form>`:''}
    <details class="card" style="margin-top:var(--s2)"><summary><b>Mensagem padrão</b> <span class="s">use {empresa} para pôr o nome</span></summary>
      <textarea id="msgLead" rows="8" aria-label="Mensagem padrão">${esc(msgLead({empresa:'{empresa}'}))}</textarea>
      <div class="acoes"><button class="btn mini pri" data-salvar-msg>Salvar mensagem</button><button class="btn mini" data-msg-padrao>Voltar à original</button></div>
    </details>`;
}

async function mudarLead(id,campos,ok){
  const {error}=await sb.from('leads').update(campos).eq('id',id);
  if(error){toast('Não deu: '+error.message);return false}
  Object.assign(leads.find(l=>l.id===id),campos);desenharLeads();if(ok)toast(ok);return true;
}

document.addEventListener('click',async e=>{
  const t=e.target;
  const z=t.closest('[data-zap]');
  if(z){const id=+z.dataset.zap,l=leads.find(x=>x.id===id);   // o link abre o WhatsApp sozinho; aqui só marca como contatado
    if(l&&l.status==='novo')setTimeout(()=>mudarLead(id,{status:'contatado',contatado_em:new Date().toISOString()},'Marcado como contatado'),300);return}
  const f=t.closest('[data-filtro-lead]');if(f){filtroLead=f.dataset.filtroLead;abertoLead=null;desenharLeads();return}
  const a=t.closest('[data-abrir-lead]');if(a){const id=+a.dataset.abrirLead;abertoLead=abertoLead===id?null:id;desenharLeads();return}
  const p=t.closest('[data-pular]');if(p){pulados.add(+p.dataset.pular);desenharLeads();return}
  if(t.closest('[data-despular]')){pulados.clear();desenharLeads();return}
  const c=t.closest('[data-copiar-msg]');if(c){const l=leads.find(x=>x.id===+c.dataset.copiarMsg);try{await navigator.clipboard.writeText(msgLead(l));toast('Mensagem copiada')}catch(_){toast('Não consegui copiar')}return}
  const tf=t.closest('[data-tirar-fone]');if(tf){mudarLead(+tf.dataset.tirarFone,{telefone:null});return}
  if(t.closest('[data-novo-lead]')){novoLeadAberto=!novoLeadAberto;desenharLeads();if(novoLeadAberto)$('#formLead input').focus();return}
  if(t.closest('[data-salvar-msg]')){const v=$('#msgLead').value.trim();try{localStorage.setItem('rc_dono_msg',v||MSG_PADRAO)}catch(_){}toast('Mensagem salva neste aparelho');desenharLeads();return}
  if(t.closest('[data-msg-padrao]')){try{localStorage.removeItem('rc_dono_msg')}catch(_){}desenharLeads();toast('Mensagem original de volta');return}
});
document.addEventListener('keydown',e=>{const a=e.target.closest&&e.target.closest('[data-abrir-lead]');if(a&&(e.key==='Enter'||e.key===' ')){e.preventDefault();a.click()}});
document.addEventListener('change',e=>{const s=e.target.closest('[data-status-lead]');if(!s)return;
  const id=+s.dataset.statusLead,l=leads.find(x=>x.id===id),campos={status:s.value};
  if(s.value!=='novo'&&!l.contatado_em)campos.contatado_em=new Date().toISOString();
  mudarLead(id,campos,'Situação atualizada')});
document.addEventListener('submit',async e=>{
  const f=e.target.closest('form[data-fone]');
  if(f){e.preventDefault();const v=f.querySelector('input').value,n=foneLead(v);
    if(!n){toast(/^\s*0[38]00/.test(v.replace(/\D/g,''))?'0800 não tem WhatsApp':'Número inválido: use DDD + número');return}
    mudarLead(+f.dataset.fone,{telefone:n},'Número salvo');return}
  if(e.target.id==='formLead'){e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    const tel=d.telefone.trim()?foneLead(d.telefone):null;if(d.telefone.trim()&&!tel){toast('WhatsApp inválido: use DDD + número');return}
    const novo={empresa:d.empresa.trim(),telefone:tel,ramo:d.ramo.trim()||null,regiao:d.regiao.trim()||null,notas:d.notas.trim()||null,prioridade:'media'};
    const {data,error}=await sb.from('leads').insert(novo).select().single();
    if(error){toast('Não deu: '+error.message);return}
    leads.push(data);novoLeadAberto=false;filtroLead='novo';desenharLeads();toast('Lead salvo')}
});
