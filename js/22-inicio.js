// ---------- geral ----------
function renderPeriodo(){
  const p=filtro.periodo==='pers';$('#persBox').hidden=!p;if(!p)return;
  if(!filtro.de||!filtro.ate){filtro.de=isoD(new Date(HOJE.getFullYear(),HOJE.getMonth(),1));filtro.ate=isoD(HOJE)}
  $('#pDe').value=filtro.de;$('#pAte').value=filtro.ate;$('#pDe').max=$('#pAte').max=isoD(HOJE);
}
function mudarPeriodo(){let a=$('#pDe').value,b=$('#pAte').value;if(!a||!b)return;if(a>b)[a,b]=[b,a];if(b>isoD(HOJE))b=isoD(HOJE);filtro.de=a;filtro.ate=b;renderTudo()}
function renderTudo(){
  ultCache=null;renderPeriodo();renderDivisoes();renderPrevisto();$('#hello').textContent=saudacao();renderViagem();
  if(filtro.marca!=='todas'&&!marca(filtro.marca))filtro.marca='todas';
  renderFbar();
  renderBoas();estadoPedido();renderHero();atualizarMapa();renderLojasUF();renderCidadeBox();renderPainel();renderLojas();
}
function irAba(t){if(t==='pedido'&&typeof somenteLeitura==='function'&&somenteLeitura()){abrirAssinatura();return}document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));document.querySelectorAll('.tab').forEach(s=>s.classList.toggle('on',s.id==='t-'+t));window.scrollTo(0,0);if(t==='mapa')renderPontos(view)}

function virarDia(){const n=new Date();n.setHours(12,0,0,0);if(+n===+HOJE)return;const era=isoD(HOJE);HOJE.setTime(+n);
  ['#pData','#vData'].forEach(id=>{const el=$(id);el.max=isoD(HOJE);if(el.value===era)el.value=isoD(HOJE)});ultCache=null;renderTudo()}
setInterval(virarDia,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)virarDia()});
function saudacao(){const hr=new Date().getHours();return(hr<12?'Bom dia':hr<18?'Boa tarde':'Boa noite')+(NOME?', '+NOME.split(' ')[0]:'')}
aplicarTema(document.documentElement.dataset.theme);
$('#tema').onclick=()=>aplicarTema(document.documentElement.dataset.theme==='dark'?'light':'dark');
$('#ajustes').onclick=()=>abrirAjustes();
$('#veu').onclick=fecharLoja;
$('#busca').oninput=renderLojas;
$('#pLoja').onchange=syncMarcaLoja;$('#pMarca').onchange=preview;$('#pValor').oninput=preview;$('#pPrev').oninput=preview;$('#pData').onchange=preview;
addEventListener('resize',()=>{rectMapa=null;clearTimeout(window.rz);window.rz=setTimeout(escalarPontos,120)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#sheet').classList.contains('on'))fecharLoja();else if(colocando)pararColocacao()}
  if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('uf')){e.preventDefault();selecionarUF(e.target.dataset.uf)}});
$('#ufPainel').addEventListener('change',e=>{const k={fCid:'cidade',fMar:'marca',fSt:'status'}[e.target.id];if(k){ufFil[k]=e.target.value;renderLojasUF()}});
$('#lCidade').oninput=dicaCidade;$('#lUF').onchange=dicaCidade;
$('#mapa').addEventListener('pointermove',dica);$('#mapa').addEventListener('pointerleave',()=>$('#dica').hidden=true);
$('#abrirNova').onclick=()=>abrirCadastro();$('#cancNova').onclick=fecharCadastro;
$('#formLoja').onsubmit=salvarLoja;$('#form').onsubmit=salvarPedido;
$('#buscarTudo').onclick=abrirBusca;comboTudo();$('#bMarcaP').oninput=filtrarMarcasForm;$('#bMarcaL').oninput=filtrarMarcasForm;$('#bDesp').oninput=renderViagem;
$('#pDe').onchange=mudarPeriodo;$('#pAte').onchange=mudarPeriodo;
$('#formViagem').onsubmit=salvarDespesa;$('#vInterpretar').onclick=preencherComTexto;$('#vExcluir').onclick=e=>excluirDespesa(e.currentTarget);$('#vCancelar').onclick=()=>{sairEdicaoDesp();toast('Edição cancelada')};
$('#pExcluir').onclick=e=>excluirPedido(e.currentTarget);$('#pCancelar').onclick=()=>{sairEdicaoPedido();toast('Edição cancelada')};
document.addEventListener('click',e=>{
  if(colocando&&e.target.closest('#mapa')){colocar(e);return}
  const t=e.target.closest('[data-cancela-coloca],[data-crumb],[data-cid],[data-area],[data-colocar],[data-tab],[data-pt],[data-uf],[data-l],[data-c],[data-close],[data-pay],[data-st],[data-novo],[data-p],[data-m],[data-retry],[data-nova-uf],[data-remover],[data-desarquivar],[data-ver-lojas],[data-limpar],[data-edit-ped],[data-editar-loja],[data-ajustes],[data-aj],[data-edit-marca],[data-marca-cancel],[data-del-marca],[data-sugerir],[data-copiar-sug],[data-backup],[data-backup-copiar],[data-restaurar],[data-restaurar-nao],[data-colar-backup],[data-zerar],[data-exemplo],[data-sair-exemplo],[data-ir-loja],[data-div-f],[data-add-div],[data-del-div],[data-edit-desp],[data-salvar-nome],[data-copiar-instr],[data-conferir-imp],[data-lancar-imp],[data-forcar-imp],[data-cad-marcas-imp],[data-b-loja],[data-b-cid],[data-b-marca],[data-b-div],[data-b-ped],[data-b-desp],[data-filtros],[data-tirar-f],[data-f-tipo],[data-limpar-f],[data-exemplo-dev],[data-conta-abrir],[data-conta-sair],[data-conta-sync],[data-en-modo],[data-en-olho],[data-en-reenviar],[data-en-pular],[data-assinar],[data-instalar]');if(!t)return;
  const ds=t.dataset;
  if('cancelaColoca' in ds)pararColocacao();
  else if(ds.crumb){if(ds.crumb==='brasil')verBrasil();else if(ds.crumb==='uf')selecionarUF(estadoSel,true)}
  else if(ds.cid)selecionarCidade(ds.cid);
  else if(ds.area)zoomArea(ds.area);
  else if(ds.colocar)iniciarColocacao(ds.colocar);
  else if(ds.tab){if(colocando)pararColocacao();irAba(ds.tab)}
  else if(ds.pt)abrirLoja(ds.pt);
  else if(ds.uf)selecionarUF(ds.uf);
  else if(ds.p){filtro.periodo=ds.p;document.querySelectorAll('#periodo button').forEach(b=>b.classList.toggle('on',b===t));renderTudo()}
  else if(ds.m){filtro.marca=ds.m;cidadeSel=null;renderTudo()}
  else if('retry' in ds)carregarMapa();
  else if('verLojas' in ds)$('#ufPainel').scrollIntoView({behavior:semMov?'auto':'smooth',block:'start'});
  else if('limpar' in ds){ufFil={cidade:'',marca:'',status:''};renderLojasUF()}
  else if(ds.novaUf){fecharLoja();abrirCadastro(ds.novaUf)}
  else if(ds.desarquivar)desarquivarLoja(ds.desarquivar);
  else if(ds.remover){if(t.dataset.ok){removerLoja(ds.remover)}else{t.dataset.ok='1';t.textContent='Toque de novo para arquivar'}}
  else if(ds.editPed)editarPedido(ds.editPed);
  else if(ds.editarLoja){const id=ds.editarLoja;fecharLoja();abrirCadastro(null,id)}
  else if(ds.l)abrirLoja(ds.l);
  else if('c' in ds){selecionarCidade(ds.c||null);$('.mapcard').scrollIntoView({behavior:semMov?'auto':'smooth',block:'center'})}
  else if('close' in ds)fecharLoja();
  else if(ds.pay){const o=pedidos.find(p=>p.id==ds.pay);o.pago=!o.pago;salvar();renderTudo();const sc=$('#sheet').scrollTop;abrirLoja(lojaAberta);$('#sheet').scrollTop=sc}
  else if(ds.st){stFiltro=ds.st;renderLojas()}
  else if(ds.novo){fecharLoja();if(pedEdit)sairEdicaoPedido();irAba('pedido');$('#pLoja').value=ds.novo;syncMarcaLoja();$('#pValor').focus()}
  else if(ds.ajustes!==undefined)abrirAjustes(ds.ajustes||undefined);
  else if(ds.aj){ajusteAba=ds.aj;marcaEdit=null;restPend=null;renderAjustes()}
  else if(ds.editMarca){marcaEdit=ds.editMarca;renderAjustes()}
  else if('marcaCancel' in ds){marcaEdit=null;renderAjustes()}
  else if(ds.delMarca)excluirMarca(ds.delMarca,t);
  else if('sugerir' in ds)anotarSugestao();
  else if('copiarSug' in ds)copiar(sugestoes.map(s=>`• ${s.texto} (${new Date(s.em).toLocaleDateString('pt-BR')}, aba ${s.tela})`).join('\n'),'Sugestões copiadas. Cole no WhatsApp ou no e-mail.');
  else if('backup' in ds)baixarBackup();
  else if('backupCopiar' in ds)copiar(textoBackup(),'Cópia copiada como texto: cole num lugar seguro');
  else if('colarBackup' in ds)lerBackup($('#txtBackup').value);
  else if('restaurar' in ds)restaurar();
  else if('restaurarNao' in ds){restPend=null;renderAjustes()}
  else if('zerar' in ds)zerar(t);
  else if('exemplo' in ds)entrarExemplo();
  else if('sairExemplo' in ds)sairExemplo();
  else if(ds.divF){filtro[ds.divF]=ds.val;cidadeSel=null;renderTudo()}
  else if(ds.editDesp)editarDespesa(ds.editDesp);
  else if('copiarInstr' in ds)copiar(instrucoesImport(),'Instruções copiadas. Cole na outra IA.');
  else if('conferirImp' in ds)conferirImport();
  else if('lancarImp' in ds)lancarImport();
  else if('contaAbrir' in ds){fecharLoja();mostrarEntrada('entrar')}
  else if(ds.enModo){lerCampos();mostrarEntrada(ds.enModo)}
  else if('enOlho' in ds){const i=$('#cSenha');const v=i.type==='password';i.type=v?'text':'password';t.setAttribute('aria-label',v?'Esconder senha':'Mostrar senha');t.classList.toggle('on',v)}
  else if('enReenviar' in ds)reenviarConfirmacao();
  else if('enPular' in ds)pularEntrada();
  else if('assinar' in ds){fecharLoja();abrirAssinatura()}
  else if('instalar' in ds)instalarApp();
  else if('contaSair' in ds)contaSair();
  else if('contaSync' in ds)enviarConta().then(sincronizarAoEntrar);
  else if('cadMarcasImp' in ds)cadastrarMarcasImport();
  else if('filtros' in ds)abrirFiltros();
  else if(ds.tirarF){filtro[ds.tirarF]='todas';cidadeSel=null;renderTudo()}
  else if(ds.fTipo){filtro[ds.fTipo]=filtro[ds.fTipo]===ds.val&&ds.val!=='todas'?'todas':ds.val;cidadeSel=null;renderTudo()}
  else if('limparF' in ds){filtro.marca=filtro.regiao=filtro.colecao='todas';cidadeSel=null;renderTudo()}
  else if('exemploDev' in ds){fecharLoja();if(exemplo)sairExemplo();else entrarExemplo()}
  else if(ds.bLoja)abrirLoja(ds.bLoja);
  else if(ds.bCid){fecharLoja();irAba('mapa');selecionarCidade(ds.bCid)}
  else if(ds.bMarca){fecharLoja();filtro.marca=ds.bMarca;cidadeSel=null;renderTudo();irAba('mapa');toast('Filtrando por '+marca(ds.bMarca).nome)}
  else if(ds.bDiv){fecharLoja();filtro[ds.bDiv]=ds.val;cidadeSel=null;renderTudo();irAba('mapa');toast('Filtrando por '+ds.val)}
  else if(ds.bPed){fecharLoja();editarPedido(+ds.bPed||ds.bPed)}
  else if(ds.bDesp){fecharLoja();editarDespesa(ds.bDesp)}
  else if(ds.forcarImp!==undefined)forcarImport(+ds.forcarImp);
  else if('salvarNome' in ds){NOME=$('#nomeUsu').value.trim();salvar();renderTudo();toast('Nome salvo')}
  else if(ds.addDiv)adicionarDiv(ds.addDiv);
  else if(ds.delDiv)excluirDiv(ds.delDiv,+ds.idx,t);
  else if('irLoja' in ds){fecharLoja();abrirCadastro()}
});
// início: dados salvos no celular primeiro (rápido e funciona sem internet), depois a conta, se houver
(()=>{const local=lerLocal();if(local)aplicar(local);marcarStatus(local&&local.atualizado?'local':'vazio')})();
preencherForm();renderTudo();carregarMapa();conectarNuvem();
