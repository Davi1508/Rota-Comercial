// ---------- dados de exemplo (só quando a pessoa pede para ver) ----------
function gerarExemplo(){
  const R=rng(20261111);
  MARCAS=[
   {id:'mare',nome:'Maré Alta',taxa:.08,cor:'#14A0A8'},
   {id:'urb',nome:'Urbano Jeans',taxa:.10,cor:'#2F6FED'},
   {id:'flor',nome:'Flor de Lis',taxa:.12,cor:'#E5487F'},
   {id:'kids',nome:'Sol Kids',taxa:.07,cor:'#F5A524'}];
  const BASE=[['Boutique Ondina','Salvador'],['Empório da Barra','Salvador'],['Vitrine Pituba','Salvador'],['Casa Bela Modas','Feira de Santana'],['Feira Fashion','Feira de Santana'],['Conquista Jeans Store','Vitória da Conquista'],['Ateliê Serra','Vitória da Conquista'],['Loja Cacau','Itabuna'],['Ilhéus Moda Praia','Ilhéus'],['Sertão Chic','Juazeiro'],['Oeste Modas','Barreiras'],['Cerrado Store','Luís Eduardo Magalhães'],['Extremo Sul Modas','Teixeira de Freitas'],['Porto Verão','Porto Seguro'],['Jequié Center Modas','Jequié'],['Alagoinhas Kids','Alagoinhas'],['Recôncavo Moda','Santo Antônio de Jesus'],['Cachoeira Modas','Paulo Afonso'],['Guanambi Fashion','Guanambi'],['Bonfim Boutique','Senhor do Bonfim'],['Irecê Moda Center','Irecê'],['Lapa Modas','Bom Jesus da Lapa'],['Eunápolis Jeans','Eunápolis'],['Camaçari Look','Camaçari'],['Valença Praia & Cia','Valença'],['Chapada Estilo','Jacobina']];
  lojas=BASE.map(([nome,cidade],i)=>{
    const p=R(),perfil=p<.45?'forte':p<.78?'media':'parada';
    const ids=MARCAS.map(m=>m.id).sort(()=>R()-.5);
    return {id:'L'+i,nome,cidade,uf:'BA',perfil,marcas:ids.slice(0,1+Math.floor(R()*3))};
  });
  pedidos=[];pid=1;
  lojas.forEach(l=>{
    const freq={forte:.8,media:.45,parada:.5}[l.perfil],ticket={forte:6500,media:3600,parada:3000}[l.perfil];
    const corte=l.perfil==='parada'?80+R()*120:l.perfil==='media'?18+R()*45:R()*22;
    l.marcas.forEach(mid=>{
      for(let d=360;d>=corte;d-=24+R()*22){
        if(R()<freq){const v=Math.round(ticket*(.5+R())/10)*10,age=Math.round(d);
          addPedido(l.id,mid,v,new Date(HOJE-age*DAY),age>30&&!(age<75&&R()<.2))}
      }
    });
    const age=Math.max(1,Math.round(corte));addPedido(l.id,l.marcas[0],Math.round(ticket*(.6+R()*.6)/10)*10,new Date(HOJE-age*DAY),age>30);
    delete l.perfil;
  });
  const OESTE=['Barreiras','Luís Eduardo Magalhães','Juazeiro','Guanambi','Irecê','Bom Jesus da Lapa','Senhor do Bonfim','Santa Maria da Vitória'];
  REGIOES=[...REGIOES_PADRAO];COLECOES=[...COLECOES_PADRAO];
  const SUL_EXT=['Teixeira de Freitas','Porto Seguro','Eunápolis','Mucuri','Prado','Canavieiras','Itacaré','Ilhéus','Itabuna'];
  lojas.forEach(l=>l.regiao=OESTE.includes(l.cidade)?'Oeste':SUL_EXT.includes(l.cidade)?'Extremo Sul':'Baixo Sul');
  pedidos.forEach(o=>{const m=o.data.getMonth();o.colecao=m>=2&&m<=4?'Outono':m>=5&&m<=7?'Inverno':m>=8&&m<=10?'Primavera':'Verão'});
  DESPESAS=[['Gasolina',180,2,'Combustível'],['Almoço',42.5,1,'Alimentação'],['Hotel',260,3,'Hospedagem']].map(([d,v,a,c],i)=>({id:'ex'+i,data:new Date(HOJE-a*DAY),valor:v,categoria:c,descricao:d}));
  let sx=11;const rx=()=>{sx=(sx*16807)%2147483647;return sx/2147483647};
  pedidos.forEach(o=>{if((HOJE-o.data)/DAY<240&&rx()<.5)o.previsto=Math.round(o.valor*(.75+rx()*.5)/50)*50||o.valor});
  lojas.slice(0,3).forEach((l,i)=>{const o=addPedido(l.id,l.marcas[0],0,new Date(HOJE-(i*3+1)*DAY),false);o.pendente=true;o.previsto=[4500,2800,6200][i];o.colecao='Verão'});
  sugestoes=[];exemplo=true;atualizado=0;
}
