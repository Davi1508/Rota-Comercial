// ---------- registro de erros ----------
// Guarda erros inesperados (só texto técnico, sem dados de pedidos) e envia para a tabela "erros" quando a conta estiver disponível.
const ERROS={fila:[],enviados:0,vistos:new Set(),MAX:8,VERSAO:'rc-v8'};
function registrarErro(msg,onde,pilha){
  try{
    msg=String(msg||'erro').slice(0,500);
    if(/ResizeObserver loop|Script error\.?$|Failed to fetch|NetworkError|Load failed/i.test(msg))return; // ruído de rede/navegador
    const chave=msg;
    if(ERROS.vistos.has(chave)||ERROS.enviados+ERROS.fila.length>=ERROS.MAX)return;
    ERROS.vistos.add(chave);
    ERROS.fila.push({mensagem:msg,onde:String(onde||'').slice(0,300),pilha:String(pilha||'').slice(0,2000),
      tela:(location.pathname+location.hash).slice(0,200),navegador:navigator.userAgent.slice(0,300),versao:ERROS.VERSAO});
    setTimeout(enviarErros,1500);
  }catch(e){}
}
async function enviarErros(){
  try{
    if(!ERROS.fila.length||typeof sb==='undefined'||!sb||!navigator.onLine)return;
    if(/^(localhost|127\.)/.test(location.hostname)&&!/[?&]erros=1/.test(location.search))return; // não registra testes locais
    const lote=ERROS.fila.splice(0);ERROS.enviados+=lote.length;
    const uid=typeof conta!=='undefined'&&conta?conta.id:null;
    await sb.from('erros').insert(lote.map(e=>({...e,user_id:uid})));
  }catch(e){}
}
addEventListener('error',e=>registrarErro(e.message,(e.filename||'').split('/').pop()+':'+e.lineno+':'+e.colno,e.error&&e.error.stack));
addEventListener('unhandledrejection',e=>{const r=e.reason||{};registrarErro(r.message||String(r),'promise',r.stack)});
addEventListener('online',()=>setTimeout(enviarErros,2000));
