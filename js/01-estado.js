const DAY=864e5;
const HOJE=new Date();HOJE.setHours(12,0,0,0);
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const COR={ok:'var(--ok)',warn:'var(--warn)',bad:'var(--bad)'};
const PALETA=['#2F6FED','#E5487F','#14A0A8','#F5A524','#8B5CF6','#16A34A','#EA580C','#0EA5E9','#B45309','#DB2777'];
const CIDADES={'Salvador':[-38.50,-12.97],'Feira de Santana':[-38.97,-12.27],'Vitória da Conquista':[-40.84,-14.86],'Camaçari':[-38.32,-12.70],'Itabuna':[-39.28,-14.79],'Ilhéus':[-39.05,-14.79],'Juazeiro':[-40.50,-9.42],'Barreiras':[-45.00,-12.15],'Luís Eduardo Magalhães':[-45.79,-12.10],'Teixeira de Freitas':[-39.74,-17.54],'Porto Seguro':[-39.06,-16.45],'Jequié':[-40.08,-13.86],'Alagoinhas':[-38.42,-12.14],'Santo Antônio de Jesus':[-39.26,-12.97],'Paulo Afonso':[-38.21,-9.41],'Guanambi':[-42.78,-14.22],'Senhor do Bonfim':[-40.19,-10.46],'Irecê':[-41.86,-11.30],'Bom Jesus da Lapa':[-43.42,-13.25],'Eunápolis':[-39.58,-16.37],'Valença':[-39.07,-13.37],'Jacobina':[-40.52,-11.18]};
// Estado do app: começa vazio e é carregado do celular (ou da conta, quando disponível)
let MARCAS=[],lojas=[],pedidos=[],sugestoes=[],pid=1,exemplo=false,atualizado=0;
// Divisões que a própria pessoa cria (ex.: regiões das lojas, coleções dos pedidos)
const REGIOES_PADRAO=['Extremo Sul','Baixo Sul','Oeste'],COLECOES_PADRAO=['Outono','Inverno','Primavera','Verão'];
let REGIOES=[],COLECOES=[...COLECOES_PADRAO];
// Despesas de viagem (separadas das comissões) e nome de quem usa o app
let DESPESAS=[],NOME='',desEdit=null;
let METAS=[];
// Cada pedido guarda a taxa da marca no dia em que foi registrado
// Id de pedido que não colide entre aparelhos (necessário com a conta sincronizada)
// sempre crescente neste aparelho (nunca repete) e com parte aleatória (não colide com outro aparelho)
let ultimoIdPedido=0;
const novoIdPedido=()=>(ultimoIdPedido=Math.max(ultimoIdPedido+1,Date.now()*1000+Math.floor(Math.random()*1000)));
function addPedido(loja,marca,valor,data,pago){const m=MARCAS.find(x=>x.id===marca);const o={id:novoIdPedido(),loja,marca,valor,data,pago:!!pago,taxa:m?m.taxa:0};pedidos.push(o);return o}
