// ---------- boas-vindas e modo exemplo ----------
function renderBoas(){
  const b=$('#boas');
  const passos=[[MARCAS.length>0,'Cadastre as marcas que você representa e a comissão de cada uma','Cadastrar marcas','data-ajustes="marcas"'],[lojas.length>0,'Cadastre suas lojas','Cadastrar loja','data-ir-loja'],[pedidos.length>0,'Registre o primeiro pedido','Registrar pedido','data-tab="pedido"']];
  const prox=passos.find(p=>!p[0]);
  if(exemplo||!prox){b.hidden=true;b.innerHTML=''}
  else{b.hidden=false;b.innerHTML=`<h2>${MARCAS.length?'Falta pouco':'Bem-vindo ao Rota Comercial'}</h2><p class="s">Comece em três passos:</p><ol class="passos">${passos.map(([ok,t])=>`<li class="${ok?'feito':''}">${t}</li>`).join('')}</ol><button class="btn" ${prox[3]}>${prox[2]}</button>${!MARCAS.length&&!lojas.length?'<button class="btn ghost" data-exemplo>Antes, ver como funciona com dados de exemplo</button>':''}`}
  const eb=$('#exBanner');eb.hidden=!exemplo;
  eb.innerHTML=exemplo?`<span>Você está vendo <b>dados de exemplo</b>. Nada é salvo.</span><button data-sair-exemplo>Usar meus dados</button>`:'';
}
function entrarExemplo(){gerarExemplo();sairEdicoes();preencherForm();renderTudo();verBrasil();marcarStatus('exemplo');toast('Dados de exemplo carregados')}
function sairExemplo(){aplicar(lerLocal()||{});sairEdicoes();preencherForm();renderTudo();verBrasil();marcarStatus(atualizado?(nuvem?'nuvem':'local'):'vazio')}
function sairEdicoes(){if(pedEdit)sairEdicaoPedido();fecharCadastro()}
