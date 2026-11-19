// ---------- planilha Excel dos pedidos (para o administrativo lançar no ERP) ----------
// Gera um .xlsx de verdade, sem biblioteca: XML da planilha dentro de um zip sem compressão.

const CRC_TAB=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_TAB[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function zipArquivos(arqs){
  const enc=new TextEncoder(),partes=[],centro=[];let pos=0;
  const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  for(const a of arqs){
    const nome=enc.encode(a.nome),dados=typeof a.dados==='string'?enc.encode(a.dados):a.dados,crc=crc32(dados);
    const cab=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(dados.length),...u32(dados.length),...u16(nome.length),...u16(0)]);
    partes.push(cab,nome,dados);
    centro.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(dados.length),...u32(dados.length),...u16(nome.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(pos)]),nome);
    pos+=cab.length+nome.length+dados.length;
  }
  const tamCentro=centro.reduce((s,p)=>s+p.length,0);
  const fim=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(arqs.length),...u16(arqs.length),...u32(tamCentro),...u32(pos),...u16(0)]);
  return new Blob([...partes,...centro,fim],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
const xmlEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
// colunas: [{t:'Título',tipo:'texto'|'data'|'num'|'moeda',w:largura}]
function xlsxBlob(aba,colunas,linhas){
  const col=i=>{let s='';i++;while(i){const r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26)}return s};
  const estilo={texto:0,data:2,num:3,moeda:4};
  const cel=(v,c,r)=>{const ref=col(c)+r,tp=colunas[c].tipo;
    if(v===null||v===undefined||v==='')return'';
    if(tp==='data'&&v instanceof Date){const n=(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate())-Date.UTC(1899,11,30))/864e5;return`<c r="${ref}" s="2"><v>${n}</v></c>`}
    if((tp==='num'||tp==='moeda')&&typeof v==='number'&&isFinite(v))return`<c r="${ref}" s="${estilo[tp]}"><v>${tp==='num'?Math.round(v*1000)/1000:Math.round(v*100)/100}</v></c>`;
    return`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`};
  const cab=`<row r="1">${colunas.map((c,i)=>`<c r="${col(i)}1" t="inlineStr" s="1"><is><t>${xmlEsc(c.t)}</t></is></c>`).join('')}</row>`;
  const corpo=linhas.map((l,k)=>`<row r="${k+2}">${l.map((v,c)=>cel(v,c,k+2)).join('')}</row>`).join('');
  const ult=col(colunas.length-1)+(linhas.length+1);
  const folha=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${colunas.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c.w||14}" customWidth="1"/>`).join('')}</cols><sheetData>${cab}${corpo}</sheetData><autoFilter ref="A1:${ult}"/></worksheet>`;
  const estilos=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00"/><numFmt numFmtId="166" formatCode="#,##0.###"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EBFB"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const nomeAba=xmlEsc(String(aba).replace(/[\\/?*[\]:]/g,' ').slice(0,31)||'Pedidos');
  return zipArquivos([
    {nome:'[Content_Types].xml',dados:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'},
    {nome:'_rels/.rels',dados:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {nome:'xl/workbook.xml',dados:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nomeAba}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${nomeAba}'!$A$1:$${ult.replace(/\d+$/,'')}$${linhas.length+1}</definedName></definedNames></workbook>`},
    {nome:'xl/_rels/workbook.xml.rels',dados:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {nome:'xl/worksheets/sheet1.xml',dados:folha},
    {nome:'xl/styles.xml',dados:estilos}
  ]);
}

// ---------- CNPJ ----------
const soDigitos=s=>String(s||'').replace(/\D/g,'');
function cnpjValido(s){const d=soDigitos(s);if(d.length!==14||/^(\d)\1+$/.test(d))return false;
  const dv=n=>{let soma=0,p=n-7;for(let i=0;i<n;i++){soma+=+d[i]*p--;if(p<2)p=9}const r=soma%11;return r<2?0:11-r};
  return dv(12)===+d[12]&&dv(13)===+d[13]}
const cnpjBR=s=>{const d=soDigitos(s);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):d};
function mascaraCnpj(inp){const d=soDigitos(inp.value).slice(0,14);let v=d;
  if(d.length>12)v=d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/,'$1.$2.$3/$4-$5');
  else if(d.length>8)v=d.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/,'$1.$2.$3/$4');
  else if(d.length>5)v=d.replace(/^(\d{2})(\d{3})(\d{0,3})$/,'$1.$2.$3');
  else if(d.length>2)v=d.replace(/^(\d{2})(\d{0,3})$/,'$1.$2');
  inp.value=v}

// ---------- linhas da planilha ----------
const COLS_PEDIDO=[
  {t:'Data',tipo:'data',w:12},{t:'Pedido',tipo:'texto',w:16},{t:'Cliente',tipo:'texto',w:32},{t:'CNPJ',tipo:'texto',w:20},
  {t:'Cidade',tipo:'texto',w:20},{t:'UF',tipo:'texto',w:6},{t:'Marca',tipo:'texto',w:20},{t:'Campanha',tipo:'texto',w:16},
  {t:'Referência',tipo:'texto',w:14},{t:'Produto',tipo:'texto',w:36},{t:'Quantidade',tipo:'num',w:12},{t:'Unidade',tipo:'texto',w:10},{t:'Preço unitário',tipo:'moeda',w:14},
  {t:'Total do item',tipo:'moeda',w:14},{t:'Valor do pedido',tipo:'moeda',w:16},{t:'Comissão (%)',tipo:'num',w:12},{t:'Comissão (R$)',tipo:'moeda',w:14},{t:'Representante',tipo:'texto',w:20}];
function linhasPedido(o){
  const l=loja(o.loja)||{},m=marca(o.marca)||{},cnpj=l.cnpj?cnpjBR(l.cnpj):'';
  const base=[o.data,String(o.id||''),l.nome||'',cnpj,l.cidade||'',l.uf||'',m.nome||'',o.colecao||''];
  const its=(o.itens||[]).filter(i=>i&&i.qtd>0);
  const tx=o.taxa!=null?o.taxa:taxaDe(o.loja,o.marca),cv=[Math.round(tx*100000)/1000,Math.round((o.valor||0)*tx*100)/100];
  if(!its.length)return[[...base,'','',null,'',null,null,o.valor||0,...cv,NOME||'']];
  return its.map(i=>[...base,i.ref||'',i.nome||'',i.qtd,unCurta(i.un)||'un',i.preco||0,(i.preco||0)*i.qtd,o.valor||0,...cv,NOME||'']);
}
const nomeArqPlan=t=>norm(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'pedidos';
async function entregarPlanilha(blob,nome,texto){
  const f=new File([blob],nome,{type:blob.type});
  if(navigator.canShare&&navigator.canShare({files:[f]})){
    try{await navigator.share({files:[f],title:nome,text:texto});return}catch(e){if(e&&e.name==='AbortError')return}
  }
  const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=nome;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
  toast('Planilha baixada');
}
// pedido do formulário (novo ou em edição), sem precisar salvar antes
function pedidoDoForm(){
  const l=loja($('#pLoja').value),mid=marcaForm(),v=num($('#pValor').value)>0?Math.round(num($('#pValor').value)*100)/100:0;
  return{id:pedEdit?pedEdit.id:'',loja:l?l.id:'',marca:mid,data:deIso($('#pData').value||isoD(HOJE)),valor:v||(itensForm.length?totalItens(itensForm):0),colecao:$('#pColecao').value||'',taxa:taxaForm()||taxaDe(l?l.id:'',mid),itens:itensForm.map(i=>({...i}))};
}
async function planilhaDoPedido(){
  const o=pedidoDoForm();
  if(!o.loja){erroPed('Escolha a loja para gerar a planilha.');return}
  if(!o.marca){erroPed('Escolha a marca para gerar a planilha.');return}
  if(!o.valor&&!o.itens.length){erroPed('Digite o valor ou escolha os produtos para gerar a planilha.');return}
  $('#pErro').hidden=true;const l=loja(o.loja),m=marca(o.marca);
  const nome=`pedido-${nomeArqPlan(l.nome)}-${isoD(o.data)}.xlsx`;
  await entregarPlanilha(xlsxBlob('Pedido',COLS_PEDIDO,linhasPedido(o)),nome,`Pedido ${m?m.nome:''} · ${l.nome}`);
}
async function exportarPedidos(){
  const ps=filtrados().slice().sort((a,b)=>a.data-b.data);
  if(!ps.length)return toast('Nenhum pedido no período escolhido');
  const linhas=ps.flatMap(linhasPedido);
  await entregarPlanilha(xlsxBlob('Pedidos',COLS_PEDIDO,linhas),`pedidos-${isoD(ps[0].data)}-a-${isoD(ps[ps.length-1].data)}.xlsx`,`${ps.length} pedidos`);
}
function blocoExportar(){const n=filtrados().length;
  return`<h2>Exportar pedidos <small>planilha Excel para o administrativo ou o ERP</small></h2><div class="list" style="padding:var(--s3)"><p class="s" style="margin:0 0 var(--s2)">Uma linha por produto, com cliente, CNPJ, referência, quantidade e preço. Usa o período e os filtros escolhidos no topo.</p><button type="button" class="btn ghost" data-exportar-ped ${n?'':'disabled'}>${n?`Baixar ${n} ${n===1?'pedido':'pedidos'} em Excel`:'Nenhum pedido no período'}</button></div>`}

document.addEventListener('click',e=>{
  if(e.target.closest('#pPlanilha'))planilhaDoPedido();
  else if(e.target.closest('[data-exportar-ped]'))exportarPedidos();
});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='lCnpj')mascaraCnpj(e.target)});
