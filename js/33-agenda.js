// ---------- agenda: visitas e compromissos ----------
// Um compromisso: {id, data ('aaaa-mm-dd'), hora ('hh:mm' ou ''), loja (id ou ''), titulo, nota, feito}.
// Fica no celular e na conta (junto com as metas), sem tabela nova no banco.
let agEdit=null,agVolta=null,agTudo=false;
const AG_SUG=['Visita','Ligar para a loja','Levar mostruário','Cobrar pagamento','Entregar pedido','Reunião com a marca'];
const agOrdem=(a,b)=>a.data<b.data?-1:a.data>b.data?1:(a.hora||'').localeCompare(b.hora||'');
function agDia(iso){
  const d=deIso(iso),n=Math.round((d-HOJE)/DAY);
  if(n===0)return'Hoje';if(n===1)return'Amanhã';if(n===-1)return'Ontem';
  const s=d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.','');
  return s.charAt(0).toUpperCase()+s.slice(1);
}
const agAtrasado=a=>!a.feito&&a.data<isoD(HOJE);
function agLinha(a,semLoja){
  const l=a.loja&&loja(a.loja),atr=agAtrasado(a);
  const sub=[a.hora,!semLoja&&l?`${l.nome}, ${l.cidade}`:'',a.nota].filter(Boolean).map(esc).join(' · ');
  return `<div class="row ag-row${a.feito?' feito':''}"><button class="ag-ok" data-ag-ok="${esc(a.id)}" aria-pressed="${a.feito}" aria-label="${a.feito?'Desmarcar':'Marcar como feito'}: ${esc(a.titulo)}">${a.feito?'✓':''}</button>
    <button class="ag-main" data-ag-edit="${esc(a.id)}"><div class="t">${esc(a.titulo)}</div>${sub?`<div class="s">${sub}</div>`:''}</button>
    <span class="ag-dia"${atr?' style="color:var(--bad)"':''}>${atr?'Atrasado · ':''}${agDia(a.data)}</span></div>`;
}
// No painel: atrasados e os próximos 14 dias (ou tudo que vem pela frente)
function renderAgenda(){
  const box=$('#agBox');if(!box)return;
  const hoje=isoD(HOJE),lim=isoD(new Date(+HOJE+14*DAY));
  const pend=AGENDA.filter(a=>!a.feito).sort(agOrdem),feitosHoje=AGENDA.filter(a=>a.feito&&a.data===hoje);
  const vis=[...pend.filter(a=>agTudo||a.data<=lim),...feitosHoje].sort(agOrdem),fora=pend.filter(a=>a.data>lim).length;
  const novo='<button class="btn ghost meta-novo" data-ag-novo>Novo compromisso</button>';
  if(!vis.length){box.innerHTML=`<p class="empty">${fora?`Nada nos próximos 14 dias. Há ${fora} ${fora===1?'compromisso':'compromissos'} mais à frente.`:'Agende visitas e lembretes. Eles aparecem aqui e na ficha da loja.'}</p>${fora?'<button class="btn ghost meta-novo" data-ag-tudo>Ver todos</button>':''}${novo}`;return}
  box.innerHTML=`<div class="list">${vis.map(a=>agLinha(a)).join('')}</div>${fora&&!agTudo?`<button class="btn ghost meta-novo" data-ag-tudo>Ver mais ${fora} à frente</button>`:''}${novo}`;
}
// Na ficha da loja: o que está marcado para ela
function blocoAgendaLoja(id){
  const ps=AGENDA.filter(a=>a.loja===id&&(!a.feito||a.data>=isoD(HOJE))).sort(agOrdem);
  return `<h2>Agenda <small>visitas e lembretes desta loja</small></h2>${ps.length?`<div class="list">${ps.map(a=>agLinha(a,true)).join('')}</div>`:''}<button class="btn ghost" data-ag-novo data-ag-loja="${esc(id)}">Agendar visita</button>`;
}
function linkGoogleAgenda(a){
  const l=a.loja&&loja(a.loja),d=a.data.replace(/-/g,'');
  let datas;
  if(a.hora){const ini=new Date(deIso(a.data));const[h,m]=a.hora.split(':');ini.setHours(+h,+m,0,0);const fim=new Date(+ini+36e5);
    const f=x=>isoD(x).replace(/-/g,'')+'T'+String(x.getHours()).padStart(2,'0')+String(x.getMinutes()).padStart(2,'0')+'00';datas=f(ini)+'/'+f(fim)}
  else datas=d+'/'+isoD(new Date(+deIso(a.data)+DAY)).replace(/-/g,'');
  const p=new URLSearchParams({action:'TEMPLATE',text:a.titulo+(l?' · '+l.nome:''),dates:datas,details:a.nota||''});
  if(l)p.set('location',`${l.cidade}, ${l.uf}, Brasil`);
  return'https://calendar.google.com/calendar/render?'+p.toString();
}
function abrirCompromisso(id,lojaId){
  agVolta=lojaAberta;lojaAberta=null;agEdit=id?AGENDA.find(x=>x.id===id)||null:null;
  const a=agEdit||{data:isoD(HOJE),hora:'',loja:lojaId||'',titulo:lojaId?'Visita':'',nota:'',feito:false};
  const ls=ativas().slice().sort((x,y)=>x.nome.localeCompare(y.nome,'pt-BR'));
  if(a.loja&&!ls.some(l=>l.id===a.loja)&&loja(a.loja))ls.unshift(loja(a.loja));
  const sh=$('#sheet');sh.dataset.tipo='agenda';sh.setAttribute('aria-label',agEdit?'Editar compromisso':'Novo compromisso');
  sh.innerHTML=`<div class="sh-top"><div class="grab"></div><div class="sh-h"><div><h3>${agEdit?'Editar compromisso':'Novo compromisso'}</h3><div class="s">Visita, ligação ou lembrete</div></div><button class="x" data-close aria-label="Fechar">×</button></div></div>
    <div class="sh-body"><form id="formAg" novalidate>
      <label class="f" for="agTit">O que fazer</label><input id="agTit" type="text" list="agSug" maxlength="80" autocomplete="off" placeholder="Ex.: Visita" value="${esc(a.titulo)}"><datalist id="agSug">${AG_SUG.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
      <label class="f" for="agLoja">Loja <small class="opc">opcional</small></label><select id="agLoja"><option value="">Nenhuma</option>${ls.map(l=>`<option value="${esc(l.id)}"${l.id===a.loja?' selected':''}>${esc(l.nome)}, ${esc(l.cidade)}</option>`).join('')}</select>
      <div class="ag-quando"><div><label class="f" for="agData">Dia</label><input id="agData" type="date" value="${a.data}"></div><div><label class="f" for="agHora">Hora <small class="opc">opcional</small></label><input id="agHora" type="time" value="${a.hora}"></div></div>
      <label class="f" for="agNota">Anotação <small class="opc">opcional</small></label><textarea id="agNota" rows="2" maxlength="300" placeholder="Ex.: levar a coleção nova">${esc(a.nota)}</textarea>
      ${agEdit?`<label class="check"><input id="agFeito" type="checkbox"${a.feito?' checked':''}> Já foi feito</label><a class="btn ghost" href="${linkGoogleAgenda(a)}" target="_blank" rel="noopener">Adicionar ao Google Agenda</a>`:''}
      <p class="erro" id="agErro" role="alert" hidden></p>
      <div class="fpe">${agEdit?'<button type="button" class="btn ghost" data-ag-del>Excluir</button>':'<button type="button" class="btn ghost" data-close>Cancelar</button>'}<button type="submit" class="btn">Salvar</button></div>
    </form></div>`;
  $('#formAg').onsubmit=e=>{e.preventDefault();salvarCompromisso()};
  $('#veu').style.display='block';requestAnimationFrame(()=>sh.classList.add('on'));
  if(!agEdit&&!a.titulo)setTimeout(()=>$('#agTit')&&$('#agTit').focus(),300);
}
function voltarDaAgenda(){const v=agVolta;agVolta=null;agEdit=null;if(v&&loja(v))abrirLoja(v);else fecharLoja()}
function salvarCompromisso(){
  const lj=$('#agLoja').value,ds=$('#agData').value,hr=$('#agHora').value;
  let tit=$('#agTit').value.trim();if(!tit&&lj)tit='Visita';
  const erro=t=>{const el=$('#agErro');el.textContent=t;el.hidden=false};
  if(!tit)return erro('Escreva o que fazer, por exemplo: Visita.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ds))return erro('Escolha o dia.');
  const a=agEdit||{id:'ag'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),feito:false};
  Object.assign(a,{titulo:tit.slice(0,80),loja:lj,data:ds,hora:/^\d{2}:\d{2}$/.test(hr)?hr:'',nota:$('#agNota').value.trim().slice(0,300)});
  if($('#agFeito'))a.feito=$('#agFeito').checked;
  const novo=!agEdit;if(novo)AGENDA.push(a);
  salvar();voltarDaAgenda();renderTudo();toast(novo?'Compromisso agendado':'Compromisso salvo');
}
function excluirCompromisso(t){
  if(!agEdit)return;
  if(!t.dataset.ok){t.dataset.ok='1';t.textContent='Toque de novo para excluir';return}
  AGENDA=AGENDA.filter(x=>x!==agEdit);salvar();voltarDaAgenda();renderTudo();toast('Compromisso excluído');
}
function alternarFeito(id){
  const a=AGENDA.find(x=>x.id===id);if(!a)return;a.feito=!a.feito;salvar();renderTudo();
  if(lojaAberta&&$('#sheet').classList.contains('on'))abrirLoja(lojaAberta);
  toast(a.feito?'Marcado como feito':'Voltou para a agenda');
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-ag-novo],[data-ag-edit],[data-ag-ok],[data-ag-del],[data-ag-tudo]');if(!t)return;
  if('agNovo' in t.dataset)abrirCompromisso(null,t.dataset.agLoja||'');
  else if(t.dataset.agEdit)abrirCompromisso(t.dataset.agEdit);
  else if(t.dataset.agOk)alternarFeito(t.dataset.agOk);
  else if('agDel' in t.dataset)excluirCompromisso(t);
  else if('agTudo' in t.dataset){agTudo=true;renderAgenda()}
});
// Agenda no topo do painel e na ficha da loja
(function(){
  const kp=$('#kPainel');if(kp)kp.insertAdjacentHTML('beforebegin','<h2>Agenda <small>atrasados e próximos 14 dias</small></h2><div id="agBox"></div>');
  const orig=renderPainel;renderPainel=function(){orig();renderAgenda()};
  const origLoja=abrirLoja;abrirLoja=function(id){origLoja(id);const sh=$('#sheet');sh.dataset.tipo='';sh.setAttribute('aria-label','Ficha da loja');const b=$('#sheet [data-novo]');if(b&&loja(id))b.insertAdjacentHTML('beforebegin',blocoAgendaLoja(id))};
  renderAgenda();
})();
