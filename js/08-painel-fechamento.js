function show(id){document.querySelectorAll(".section").forEach(s=>s.classList.remove("active")); document.getElementById(id).classList.add("active"); document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.sec===id)); const t={painel:["Painel de controle","Resumo geral e alertas."],fechamento:["Fechamento mensal","Lançar, conferir e travar eventos por funcionário."],relatorio:["Relatório de lançamento","Exportação para digitar no outro programa."],empresas:["Empresas/Códigos","Empresas, sindicatos e eventos permitidos por empresa."],sindicatos:["Sindicatos","Cadastro de sindicato, contato, data-base e benefícios."],guias:["Guias","Controle mensal de guias por empresa: geração, envio e pagamento."],funcionarios:["Funcionários","Cadastro, observações e eventos vinculados ao funcionário."],eventos:["Códigos/Eventos","Eventos permitidos para lançamento."],regras:["Regras especiais","Horas fixas por dia da semana — cálculo automático por competência."],asos:["ASO Periódicos","Controle de vencimentos dos exames periódicos."],laudos:["Laudos SST","Controle de PCMSO, PGR, LTCAT e laudos SST."],ferias:["Férias","Controle de períodos aquisitivos e vencimentos."],facilitador:["Facilitador","Ferramentas auxiliares do DP."],backup:["Backup","Salvar e restaurar dados locais."]}[id]; titulo.textContent=t[0]; sub.textContent=t[1]; renderAll()}
function flatFuncs(){let a=[]; const c=comp(); empresasAtivas().forEach(e=>(e.funcionarios||[]).forEach(f=>{if(!funcionarioAtivoNaCompetencia(f,c))return; a.push({e,f,fs:fs(e,f)})})); return a}
function filtrados(){
  const sec=document.querySelector(".section.active")?.id||"painel"
  const busca=((sec==="fechamento"?busca2.value:busca1.value)||"").toLowerCase()
  const st=status1.value
  const arr=[]
  const competenciaAtual=comp()
  empSelecionadas().forEach(e=>(e.funcionarios||[]).forEach(f=>{
    if(!funcionarioAtivoNaCompetencia(f,competenciaAtual))return
    const x=fs(e,f)
    const txt=[e.nome,e.codigo,f.nome,f.codigo,f.funcao,x.status,x.obs,...(x.eventos||[]).flatMap(ev=>[ev.desc,ev.valor,ev.obs,ev.status])].join(" ").toLowerCase()
    if(busca&&!txt.includes(busca))return
    if(st&&x.status!==st)return
    arr.push({e,f,fs:x})
  }))
  return arr
}
function renderKpis(){const funcs=filtrados(); const conf=funcs.filter(x=>x.fs.status==="Conferido").length; kEmp.textContent=empSelecionadas().length; kFun.textContent=funcs.length; kEv.textContent=state.eventos.length; kPend.textContent=funcs.length-conf; kPerc.textContent=funcs.length?Math.round(conf/funcs.length*100)+"%":"0%"}
function mesDataBaseNumeroValor(valor){
  const db=String(valor||"").toLowerCase().trim()
  const mapa={1:["jan","janeiro"],2:["fev","fevereiro"],3:["mar","março","marco"],4:["abr","abril"],5:["mai","maio"],6:["jun","junho"],7:["jul","julho"],8:["ago","agosto"],9:["set","setembro"],10:["out","outubro"],11:["nov","novembro"],12:["dez","dezembro"]}
  for(const n in mapa){if(mapa[n].some(x=>db.includes(x)))return Number(n)}
  const num=parseInt(db); return isNaN(num)?0:num
}
function dataBaseNoMesValor(valor){
  const db=String(valor||"").toLowerCase().trim()
  const mes=mesNome().toLowerCase()
  const mesNum=(comp().split("-")[1]||"")
  const mapa={"01":["jan","janeiro"],"02":["fev","fevereiro"],"03":["mar","março","marco"],"04":["abr","abril"],"05":["mai","maio"],"06":["jun","junho"],"07":["jul","julho"],"08":["ago","agosto"],"09":["set","setembro"],"10":["out","outubro"],"11":["nov","novembro"],"12":["dez","dezembro"]}
  return db.includes(mes) || (mapa[mesNum]||[]).some(x=>db.includes(x))
}
function statusDBSindicatoAdicional(item){
  const fonte=sindicatoStatusReferencia(item.nome)
  if(fonte)item={...item,dataBase:fonte.dataBase||item.dataBase,statusDataBase:fonte.statusDataBase,dataBaseEmDiaAno:fonte.dataBaseEmDiaAno}
  const manual=item.statusDataBase||"Em dia"
  if(manual==="Aguardando")return "Aguardando"
  const mdb=mesDataBaseNumeroValor(item.dataBase)
  const matual=Number((comp()||"").split("-")[1]||0)
  const anoAtual=anoCompetencia()
  const anoEmDia=Number(item.dataBaseEmDiaAno||0)
  if(!mdb)return manual==="Vencida"?"Em dia":manual
  if(manual==="Em dia"){
    if(anoEmDia && anoAtual<=anoEmDia)return "Em dia"
    if(!anoEmDia)return "Em dia"
  }
  if(mdb<matual)return "Vencida"
  return "Em dia"
}
function confirmarAlternarStatusDBAdicional(empCod, idx, statusAtual, nomeEmp){
  const emp=state.empresas.find(e=>String(e.codigo)===String(empCod)); if(!emp)return
  const lista=sindicatoAdicionalDetalhesNormalizados(emp)
  const item=lista[idx]; if(!item)return
  const novo=statusAtual==="Em dia"?"Aguardando":"Em dia"
  if(!confirm(`Alterar status de "${statusAtual}" → "${novo}"?\n\nEmpresa: ${nomeEmp}\nSindicato: ${item.nome}`))return
  item.statusDataBase=novo
  if(novo==="Em dia")item.dataBaseEmDiaAno=anoCompetencia(); else delete item.dataBaseEmDiaAno
  emp.sindicatosAdicionaisDetalhes=normalizarListaSindicatosAdic(lista,emp.sindicato)
  emp.sindicatosAdicionais=emp.sindicatosAdicionaisDetalhes.map(x=>x.nome)
  saved()
}
function statusDataBasePainel(status,dataBase,anoEmDia){
  const mes=mesDataBaseNumeroValor(dataBase)
  const atual=Number((comp()||"").split("-")[1]||0)
  const confirmada=status==="Em dia"&&Number(anoEmDia)>=anoCompetencia()
  if(!mes||confirmada)return status
  if(mes===atual)return "Aguardando"
  if(mes<atual&&(status==="Aguardando"||status==="Vencida"))return "Vencida"
  return status
}
function renderAlertas(){
  const verTodas=document.getElementById("verTodasDatabases")?.checked
  const grupos=[]
  empSelecionadas().forEach(e=>{
    const itens=[{principal:true,nome:e.sindicato||"",dataBase:dataBaseReferencia(e),status:statusDB(e),dissidio:e.dissidio||"",idx:-1}]
      .concat(sindicatoAdicionalDetalhesNormalizados(e).map((x,idx)=>({principal:false,nome:x.nome,dataBase:x.dataBase,status:statusDBSindicatoAdicional(x),dissidio:x.dissidio||"",idx})))
    const linhas=[]
    itens.forEach(it=>{
      const cadastro=it.principal?e:sindicatoAdicionalDetalhesNormalizados(e)[it.idx]
      const st=statusDataBasePainel(it.status,it.dataBase,cadastro?.dataBaseEmDiaAno)
      const noMes=dataBaseNoMesValor(it.dataBase)
      let tipo=""
      let mostrar=false
      if(st==="Vencida"){
        tipo=it.principal?"Data-base vencida":"Data-base vencida · Sindicato adicional"
        mostrar=true
      }else if(st==="Aguardando"){
        tipo=it.principal?"Data-base aguardando":"Data-base aguardando · Sindicato adicional"
        mostrar=true
      }else if(st==="Em dia"){
        tipo=it.principal?"Data-base em dia":"Data-base em dia · Sindicato adicional"
        mostrar=verTodas||noMes||_filtroAlerta==="emdia"
      }
      if(mostrar){
        linhas.push({tipo,emp:`${e.codigo} - ${e.nome}`,empCod:e.codigo,sind:it.nome||"",status:st,noMes,det:`${it.dataBase||"Sem data-base"} · ${it.nome||"Sem sindicato"} · ${st}`,dissidio:it.dissidio||"",principal:it.principal,idx:it.idx})
      }
    })
    let filtradas=linhas
    if(_filtroAlerta==="emdia")filtradas=linhas.filter(x=>x.status==="Em dia")
    else if(_filtroAlerta==="aguardando")filtradas=linhas.filter(x=>x.status==="Aguardando")
    else if(_filtroAlerta==="vencido")filtradas=linhas.filter(x=>x.status==="Vencida")
    if(filtradas.length)grupos.push({emp:`${e.codigo} - ${e.nome}`,linhas:filtradas})
  })

  alertas.innerHTML=grupos.length?grupos.map(g=>{
    const pior=g.linhas.some(x=>x.status==="Vencida")?"Vencida":(g.linhas.some(x=>x.status==="Aguardando")?"Aguardando":"Em dia")
    const titulo=pior==="Vencida"?"Data-base vencida":(pior==="Aguardando"?"Data-base aguardando":"Data-base em dia")
    const rows=g.linhas.map(x=>`<div class="alert-sind-row">
      <div class="alert-sind-top">
        <span class="badge ${dbClass(x.status)}" style="cursor:pointer" title="Clique para alternar o status" onclick="${x.principal?`confirmarAlternarStatusDB('${esc(x.empCod)}','${esc(x.status)}','${esc(x.emp)}')`:`confirmarAlternarStatusDBAdicional('${esc(x.empCod)}',${x.idx},'${esc(x.status)}','${esc(x.emp)}')`}">${esc(x.status)}${x.principal?"":" · adicional"}</span>
        <button class="btn small out" style="font-size:11px;padding:2px 8px" onclick="abrirSindicatoPainel('${esc(x.sind)}')">Ver sindicato →</button>
      </div>
      <div class="alert-sind-info">${esc(x.det)}</div>
      ${x.dissidio?`<div class="alert-sind-dissidio">${esc(x.dissidio)}</div>`:""}
    </div>`).join("")
    return `<div class="alert"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span class="badge ${dbClass(pior)}">${esc(titulo)}</span></div><div><strong>${esc(g.emp)}</strong></div><div class="alert-sind-list">${rows}</div></div>`
  }).join(""):'<div class="alert"><strong>Nenhuma data-base para exibir'+((_filtroAlerta!=="todos")?" com este filtro":"")+'.</strong><div class="muted">Em dia: convenção regularizada. Aguardando: data-base do mês. Vencida: data-base passada ainda pendente. Marque "Ver todas as datas-base" para ampliar a lista.</div></div>'
}
function renderPainelDetalhes(){}
function salvarEventoLinha(e,f,i,row){
  const item=find(e,f)
  if(!item)return aviso("Não localizei este funcionário no fechamento.")
  if(!item.x.eventos)item.x.eventos=[]
  const idx=Number(i)
  if(idx<0 || idx>=item.x.eventos.length)return aviso("Não localizei este evento para salvar.")
  if(!confirm("Salvar alterações deste evento?"))return
  const campos=row.querySelectorAll("select,input")
  const evAtual=item.x.eventos[idx]
  const origem=evAtual.origem || (evAtual.auto===true?"automatico":"manual")
  const novoDesc=campos[0].value
  const novoValor=valorPadrao(campos[1].value)
  const novaObs=campos[2].value
  const novoInicio=parseMesAnoCurto(campos[3].value)
  const novoFim=parseMesAnoCurto(campos[4].value)
  const novoStatus=campos[5].value
  const temPrazo=!!(novoInicio||novoFim)

  // Evento manual simples com prazo preenchido: vira evento com prazo (recorrente),
  // guardado no funcionário, para aparecer em todos os meses do período.
  if(origem==="manual" && temPrazo){
    if(!Array.isArray(item.fun.eventosManuais))item.fun.eventosManuais=[]
    item.fun.eventosManuais.push({desc:novoDesc,valor:novoValor,obs:novaObs,inicio:novoInicio,fim:novoFim,status:"Pendente"})
    item.x.eventos.splice(idx,1)
    save(); renderFechamento(); renderRel()
    if(novoInicio && comp()<novoInicio){
      aviso("Evento com prazo salvo.\n\nEle começa a aparecer a partir de "+fmtMesAnoCurtoFechamento(novoInicio)+", por isso ainda não aparece neste mês.")
    }
    return
  }

  // Evento com prazo já existente.
  if(origem==="manual-recorrente"){
    const def=acharDefManual(item.fun,evAtual)
    if(!temPrazo){
      // Removeu os dois prazos: volta a ser evento só do mês atual.
      if(def)item.fun.eventosManuais.splice(item.fun.eventosManuais.indexOf(def),1)
      item.x.eventos[idx]={desc:novoDesc,valor:novoValor,obs:novaObs,inicio:"",fim:"",status:novoStatus,origem:"manual"}
      save(); renderFechamento(); renderRel(); return
    }
    // Edita a definição: valor/observação/prazo valem para a série toda. Status fica por mês.
    if(def){def.desc=novoDesc; def.valor=novoValor; def.obs=novaObs; def.inicio=novoInicio; def.fim=novoFim}
    evAtual.status=novoStatus
    save(); renderFechamento(); renderRel(); return
  }

  // Demais casos (manual sem prazo, padrão e automático): comportamento original.
  item.x.eventos[idx].desc=novoDesc
  item.x.eventos[idx].valor=novoValor
  item.x.eventos[idx].obs=novaObs
  item.x.eventos[idx].inicio=novoInicio
  item.x.eventos[idx].fim=novoFim
  item.x.eventos[idx].status=novoStatus
  if(!item.x.eventos[idx].origem)item.x.eventos[idx].origem="manual"
  save()
  renderFechamento()
  renderRel()
}
function rowEvento(empCod,funCod,ev,i){
  const st=ev.status||"Pendente"
  const origem=ev.origem || (ev.auto===true ? "automatico" : "manual")
  const recorrente=origem==="manual-recorrente"
  const podeExcluir=origem==="manual"||recorrente
  const tituloProtegido=origem==="automatico" ? "Automático" : "Padrão"
  return `<div class="event-row">
    <div class="event-order"><button class="btn small out" title="Mover evento para cima" aria-label="Mover evento para cima" onclick="moverEventoFechamento('${empCod}','${funCod}',${i},-1)">▲</button><button class="btn small out" title="Mover evento para baixo" aria-label="Mover evento para baixo" onclick="moverEventoFechamento('${empCod}','${funCod}',${i},1)">▼</button></div>
    <select title="A lista mostra só eventos permitidos para esta empresa">${optsEventosEmpresa(empCod,ev.desc||"")}</select>
    <input value="${esc(ev.valor??"")}" placeholder="Valor/qtd">
    <input value="${esc(ev.obs??"")}" placeholder="Observação">
    <input class="input-mes-curto ${ev.inicio?'':'sem-data'}" type="text" value="${esc(fmtMesAnoCurtoFechamento(ev.inicio||""))}" placeholder="-" onfocus="if(this.value==='-')this.value=''" onblur="if(!this.value.trim())this.value='-'">
    <input class="input-mes-curto ${ev.fim?'':'sem-data'}" type="text" value="${esc(fmtMesAnoCurtoFechamento(ev.fim||""))}" placeholder="-" onfocus="if(this.value==='-')this.value=''" onblur="if(!this.value.trim())this.value='-'">
    <select class="status-select ${statusClass(st)}" onchange="updStatusEvento('${empCod}','${funCod}',${i},this.value,this)">
      <option ${st==="Pendente"?"selected":""}>Pendente</option>
      <option ${st==="Lançado"?"selected":""}>Lançado</option>
      <option ${st==="Conferido"?"selected":""}>Conferido</option>
      <option ${st==="Com observação"?"selected":""}>Com observação</option>
      <option ${st==="Não lançar"?"selected":""}>Não lançar</option>
    </select>
    <div class="event-actions">
      <button class="btn small green" onclick="salvarEventoLinha('${empCod}','${funCod}',${i},this.closest('.event-row'))">Salvar</button>
      ${podeExcluir
        ? `<button class="btn small red" onclick="delEvento('${empCod}','${funCod}',${i})">Excluir</button>`
        : `<span class="badge blue" title="Evento ${tituloProtegido.toLowerCase()} só pode ser excluído no cadastro do funcionário">${tituloProtegido}</span>`}
    </div>
  </div>`
}

function renderInfoDataBaseFechamento(){
  const box=document.getElementById("infoDataBaseFechamento")
  if(!box)return
  const cod=emp2.value || emp1.value || ""
  const emp=state.empresas.find(e=>String(e.codigo)===String(cod))
  if(!emp){
    box.innerHTML='<strong>Data-base:</strong> selecione uma empresa para visualizar o sindicato vinculado.'
    return
  }
  const sind=(state.sindicatos||[]).find(s=>String(s.nome||"").trim().toLowerCase()===String(emp.sindicato||"").trim().toLowerCase())
  const dataBase=(sind&&sind.dataBase) || emp.dataBase || "Sem data-base informada"
  const sindicato=emp.sindicato || "Sem sindicato vinculado"
  const status=statusDB(emp)
  const obs=(sind&&sind.obs) || emp.dissidio || ""
  const sindicatoHtml=sind
    ? `<button class="link-btn" onclick="abrirSindicato('${esc(sind.nome).replaceAll("'","&#39;")}')" title="Abrir informações, resumo e anexos do sindicato">${esc(sindicato)}</button>`
    : esc(sindicato)
  box.innerHTML=`<strong>Data-base da empresa:</strong> ${esc(dataBase)} &nbsp; <span class="badge ${dbClass(status)}">${esc(status)}</span><br><span class="muted"><b>Sindicato:</b> ${sindicatoHtml}${obs?" · "+esc(obs):""}</span>`
}

function moverEventoFechamento(empCod,funCod,idx,direcao){
  const item=find(empCod,funCod)
  if(!item)return
  const eventos=item.x.eventos
  const destino=idx+direcao
  if(destino<0||destino>=eventos.length)return
  ;[eventos[idx],eventos[destino]]=[eventos[destino],eventos[idx]]
  item.x.ordemEventos={}
  eventos.forEach((ev,i)=>{ev.ordemManual=i+1;item.x.ordemEventos[chaveEvento(ev)]=i+1})
  save(); renderFechamento(); renderRel()
}
function renderFechamento(){
  renderInfoDataBaseFechamento()
  let arr=filtrados()
  const filtroStatus=status1.value
  const mostrarConferidos=document.getElementById("mostrarConferidosFechamento")?.checked||false
  if(!mostrarConferidos && filtroStatus!=="Conferido")arr=arr.filter(x=>x.fs.status!=="Conferido")
  listaFechamento.innerHTML=arr.length?arr.map(({e,f,fs})=>{
    const low=fs.status==="Conferido"&&filtroStatus==="Conferido"?" low-priority":""
    return `<div class="emp-card${low}"><div class="emp-head"><div><div class="emp-name">${esc(f.codigo)} - ${esc(f.nome)} <span style="display:inline-block;margin-left:10px;font-size:12px;font-weight:700;background:#eaf2ff;color:#173b70;padding:4px 9px;border-radius:12px;white-space:nowrap">Admissão: ${esc(fmtDataBR(f.admissao||"")||"não informada")}</span> <span style="display:inline-block;margin-left:4px;font-size:12px;font-weight:700;background:#edf3fb;color:#173b70;padding:4px 9px;border-radius:12px">${esc(f.funcao||"Sem função")}</span></div><div class="emp-sub">${esc(e.codigo)} - ${esc(e.nome)}</div></div><div><label>Salário</label><b>R$ ${money(f.salario)}</b></div><div><label>Detectado</label><span class="badge ${f.statusDetectado==="Ativo"?"ok":f.statusDetectado.includes("Rescis")?"red":"pend"}">${esc(f.statusDetectado||"Ativo")}</span></div><div><label>Status</label><select class="status-select ${statusClass(fs.status)}" onchange="updStatus('${e.codigo}','${f.codigo}',this.value)"><option ${fs.status==="Pendente"?"selected":""}>Pendente</option><option ${fs.status==="Lançado"?"selected":""}>Lançado</option><option ${fs.status==="Conferido"?"selected":""}>Conferido</option></select></div><div><button class="btn small green" onclick="updStatus('${e.codigo}','${f.codigo}','Conferido')">Conferir</button> <button class="btn small out" onclick="addEventoFunc('${e.codigo}','${f.codigo}')">+ Evento</button></div></div><div class="events">${(fs.eventos||[]).map((ev,i)=>rowEvento(e.codigo,f.codigo,ev,i)).join("")}<label>Observação de conferência</label><textarea onchange="updObs('${e.codigo}','${f.codigo}',this.value)">${esc(fs.obs||"")}</textarea></div></div>`
  }).join(""):'<div class="card"><b>Nenhum funcionário pendente para este filtro.</b><p class="muted">Os conferidos ficam ocultos por padrão. Marque “Mostrar funcionários já conferidos” para visualizar novamente.</p></div>'
}
function updStatus(e,f,v){find(e,f).x.status=v; saved()}
function updStatusEvento(e,f,i,v,el){
  const item=find(e,f)
  if(!item || !item.x || !Array.isArray(item.x.eventos) || !item.x.eventos[i])return aviso("Não localizei este evento no fechamento.")
  item.x.eventos[i].status=v
  if(el){
    el.className="status-select "+statusClass(v)
  }
  const eventos=item.x.eventos||[]
  const eventosValidos=eventos.filter(ev=>ev.desc||ev.valor||ev.obs||ev.inicio||ev.fim)
  if(eventosValidos.length && eventosValidos.every(ev=>(ev.status||"Pendente")==="Conferido" || (ev.status||"")==="Não lançar")){
    item.x.status="Conferido"
  }else if(item.x.status==="Conferido" && eventosValidos.some(ev=>(ev.status||"Pendente")!=="Conferido" && (ev.status||"")!=="Não lançar")){
    item.x.status="Pendente"
  }
  save()
  renderFechamento()
  renderRel()
  renderKpis()
}

function updObs(e,f,v){find(e,f).x.obs=v; save(); renderRel()}
function updEvento(e,f,i,p,v){if(p==="valor")v=valorPadrao(v); const item=find(e,f); if(!item||!item.x.eventos[i])return; item.x.eventos[i][p]=v; save(); renderFechamento(); renderRel()}
function addEventoFunc(e,f){
  const item=find(e,f)
  if(!item)return aviso("Não localizei este funcionário no fechamento.")
  const permitidos=eventosEmpresa(e)
  if(!permitidos.length)return aviso("Nenhum evento vinculado a esta empresa. Cadastre/vincule os códigos na aba Empresas/Códigos.")
  if(!Array.isArray(item.x.eventos))item.x.eventos=[]
  item.x.eventos.push({desc:"",valor:"",obs:"",inicio:"",fim:"",status:"Pendente",origem:"manual"})
  normalizarOrdemEventosFechamento(item.x)
  save()
  renderFechamento()
  renderRel()
}

function marcarExclusaoEventoNaCompetencia(c,empCod,funCod,ev){
  if(ev.origem==="cadastro-funcionario"){
    const chave=chaveEventoMes(empCod,funCod,ev)
    const exc=exclusoesCompetencia(c)
    if(!exc.includes(chave))exc.push(chave)
  }
  if(ev.auto===true || ev.origem==="automatico"){
    const chaveAuto=chaveAutoMes(empCod,funCod,ev.desc||"")
    const excAuto=exclusoesAutomaticosCompetencia(c)
    if(!excAuto.includes(chaveAuto))excAuto.push(chaveAuto)
  }
}
function mesmoEventoFechamento(a,b){
  if(!a||!b)return false
  if((a.desc||"")!== (b.desc||""))return false
  const origemA=a.origem|| (a.auto?"automatico":"manual")
  const origemB=b.origem|| (b.auto?"automatico":"manual")
  if(origemA!==origemB)return false
  if(origemA==="automatico")return true
  return chaveEvento(a)===chaveEvento(b)
}
function excluirEventoProximasCompetencias(empCod,funCod,ev){
  const compAtual=comp()
  const chaveFunc=empCod+"|"+funCod
  Object.keys(state.fechamentos||{}).forEach(c=>{
    if(!compAtual || c<=compAtual)return
    const fsObj=state.fechamentos[c]?.funcionarios?.[chaveFunc]
    if(!fsObj || fsObj.status==="Conferido")return
    marcarExclusaoEventoNaCompetencia(c,empCod,funCod,ev)
    if(Array.isArray(fsObj.eventos)){
      fsObj.eventos=fsObj.eventos.filter(x=>!mesmoEventoFechamento(x,ev))
    }
  })
}
function delEvento(e,f,i){
  const item=find(e,f)
  if(!item)return aviso("Não localizei este funcionário no fechamento.")
  if(!Array.isArray(item.x.eventos))item.x.eventos=[]
  const idx=Number(i)
  if(idx<0 || idx>=item.x.eventos.length)return aviso("Não localizei este evento para excluir.")
  const ev=clone(item.x.eventos[idx])
  const origem=ev.origem || (ev.auto===true ? "automatico" : "manual")
  if(origem==="manual-recorrente"){
    if(confirm("Excluir este evento com prazo SOMENTE deste mês?\n\nOs outros meses continuam com o evento normalmente.")){
      marcarExclusaoManualNaCompetencia(comp(),e,f,ev)
      save(); renderFechamento(); renderRel(); return
    }
    if(confirm("Deseja excluir a SÉRIE INTEIRA (todos os meses) deste evento com prazo?\n\nEsta ação não pode ser desfeita.")){
      const def=acharDefManual(item.fun,ev)
      if(def)item.fun.eventosManuais.splice(item.fun.eventosManuais.indexOf(def),1)
      save(); renderFechamento(); renderRel()
    }
    return
  }
  if(origem!=="manual"){
    return aviso("Este evento é automático ou padrão do funcionário. Para excluir, acesse o cadastro do funcionário e remova o evento por lá.")
  }
  if(!confirm(`Excluir este evento manual da competência atual?

As competências anteriores não serão alteradas.`))return

  item.x.eventos.splice(idx,1)

  if(confirm(`Deseja excluir este mesmo evento manual também das próximas competências ainda não conferidas?

As competências anteriores nunca serão alteradas automaticamente.`)){
    excluirEventoProximasCompetencias(e,f,ev)
  }

  save()
  renderFechamento()
  renderRel()
}

function conferirEmpresa(){empSelecionadas().forEach(e=>e.funcionarios.forEach(f=>fs(e,f).status="Conferido")); saved()}
function relRows(cFiltro, empresasFiltro){
  const competenciaRel=cFiltro||comp()
  const listaEmpresas=empresasFiltro||empSelecionadas()
  return executarComCompetenciaRelatorio(competenciaRel,()=>{
    let rows=[]
    listaEmpresas.forEach(e=>(e.funcionarios||[]).forEach(f=>{
      if(!funcionarioAtivoNaCompetencia(f,competenciaRel))return
      const x=fs(e,f)
      ;(x.eventos||[]).forEach(ev=>{
        if(!ev.desc&&!ev.valor&&!ev.obs&&!ev.inicio&&!ev.fim)return
        const parsed=parseEventoLabel(ev.desc)
        rows.push({comp:competenciaRel,codEmp:e.codigo,empresa:e.nome,codFunc:f.codigo,func:f.nome,funcao:f.funcao||"",sal:f.salario,codEvento:parsed?parsed.codigo:"",evento:parsed?parsed.descricao:(ev.desc||""),eventoCompleto:ev.desc||"",valor:ev.valor??"",obs:ev.obs||"",obsConferencia:x.obs||"",inicio:ev.inicio||"",fim:ev.fim||"",statusFunc:x.status,statusEvento:ev.status||"Pendente",eventoPadrao:(ev.origem==="cadastro-funcionario"?"Sim":"Não"),sind:sindicatoPrincipalEAdicionais(e).join(" / "),db:e.dataBase||"",dbStatus:statusDB(e),dbObs:e.dataBaseObs||"",dissidio:e.dissidio||"",vinculoSindicato:e.vinculoSindicato||"Normal"})
      })
    }))
    return rows
  })
}
function editarObsDataBase(codEmp){
  const emp=state.empresas.find(e=>e.codigo===codEmp)
  if(!emp)return
  const atual=emp.dataBaseObs||""
  const txt=prompt("Anotação da data-base desta empresa:", atual)
  if(txt===null)return
  emp.dataBaseObs=txt
  saved()
}
function lerObsDataBase(codEmp){
  const emp=state.empresas.find(e=>e.codigo===codEmp)
  if(!emp)return
  aviso(emp.dataBaseObs||"Sem observação cadastrada para a data-base.")
}

