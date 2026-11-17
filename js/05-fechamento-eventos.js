function fechamento(){
  const c=comp()
  if(!state.fechamentos[c]){
    const ant=state.fechamentos[competenciaAnterior(c)]
    state.fechamentos[c]=ant?clone(ant):{funcionarios:{},calendario:calcCalendarioMes(c),notaPainel:""}
    state.fechamentos[c].calendario=calcCalendarioMes(c)
    state.fechamentos[c].notaPainel=""
  }
  if(!state.fechamentos[c].calendario)state.fechamentos[c].calendario=calcCalendarioMes(c)
  if(state.fechamentos[c].notaPainel===undefined)state.fechamentos[c].notaPainel=""
  return state.fechamentos[c]
}
function fs(emp,fun){
  const f=fechamento()
  const k=emp.codigo+"|"+fun.codigo
  if(!f.funcionarios[k]){
    f.funcionarios[k]={status:"Pendente",obs:"",eventos:[]}
  }else{
    if(!Array.isArray(f.funcionarios[k].eventos))f.funcionarios[k].eventos=[]
    if(Array.isArray(f.funcionarios[k].autoEventos))f.funcionarios[k].autoEventos=f.funcionarios[k].autoEventos.map(a=>({...a,inicio:a.inicio||"",fim:a.fim||""}))
  }
  sincronizarEventosCadastroFuncionario(emp,fun,f.funcionarios[k])
  aplicarAutoFuncionario(emp,fun,f.funcionarios[k])
  aplicarManuaisRecorrentes(emp,fun,f.funcionarios[k])
  atualizarObservacoesValoresRegras(fun,f.funcionarios[k],comp())
  normalizarOrdemEventosFechamento(f.funcionarios[k])
  return f.funcionarios[k]
}
function find(empCod, funCod){
  const emp = state.empresas.find(e => String(e.codigo) === String(empCod))
  if(!emp)return null
  const fun = (emp.funcionarios||[]).find(f => String(f.codigo) === String(funCod))
  if(!fun)return null
  const x = fs(emp, fun)
  if(!x.eventos)x.eventos=[]
  return {emp, fun, x}
}
function chaveEvento(ev){
  return [ev.desc||"",ev.valor||"",ev.obs||"",ev.inicio||"",ev.fim||""].join("||")
}
function chaveEventoMes(empCod,funCod,ev){
  return [empCod,funCod,chaveEvento(ev)].join("##")
}
function exclusoesCompetencia(cRef){
  const c=cRef||comp()
  if(!state.fechamentos[c])state.fechamentos[c]={funcionarios:{},calendario:calcCalendarioMes(c),notaPainel:""}
  const f=state.fechamentos[c]
  if(!Array.isArray(f.excluidosCadastro))f.excluidosCadastro=[]
  return f.excluidosCadastro
}
function chaveAutoMes(empCod,funCod,desc){
  return [empCod,funCod,desc||""].join("##")
}
function exclusoesAutomaticosCompetencia(cRef){
  const c=cRef||comp()
  if(!state.fechamentos[c])state.fechamentos[c]={funcionarios:{},calendario:calcCalendarioMes(c),notaPainel:""}
  const f=state.fechamentos[c]
  if(!Array.isArray(f.excluidosAutomaticos))f.excluidosAutomaticos=[]
  return f.excluidosAutomaticos
}
function exclusoesManuaisCompetencia(cRef){
  const c=cRef||comp()
  if(!state.fechamentos[c])state.fechamentos[c]={funcionarios:{},calendario:calcCalendarioMes(c),notaPainel:""}
  const f=state.fechamentos[c]
  if(!Array.isArray(f.excluidosManuais))f.excluidosManuais=[]
  return f.excluidosManuais
}
function marcarExclusaoManualNaCompetencia(c,empCod,funCod,ev){
  const chave=chaveEventoMes(empCod,funCod,ev)
  const exc=exclusoesManuaisCompetencia(c)
  if(!exc.includes(chave))exc.push(chave)
}
function acharDefManual(fun,evRef){
  if(!fun||!Array.isArray(fun.eventosManuais))return null
  const alvo=chaveEvento(evRef)
  return fun.eventosManuais.find(d=>chaveEvento(d)===alvo)||null
}

function eventoVigenteNaCompetencia(ev,cRef){
  const c = cRef || comp()
  const ini = ev.inicio || ""
  const fim = ev.fim || ""
  if(ini && c < ini)return false
  if(fim && c > fim)return false
  return true
}

function sincronizarEventosCadastroFuncionario(emp,fun,fsObj){
  if(!Array.isArray(fsObj.eventos))fsObj.eventos=[]
  const excluidos=exclusoesCompetencia()
  // Preserva o status alterado no fechamento mensal antes de recriar os eventos padrão do cadastro.
  // Sem isso, ao mudar o status e renderizar a tela, o evento padrão voltava para "Pendente".
  const statusAnterior={}
  fsObj.eventos.forEach(ev=>{
    if(ev.origem==="cadastro-funcionario")statusAnterior[chaveEvento(ev)]=ev.status||"Pendente"
  })
  // Remove eventos antigos vindos do cadastro do funcionário.
  // Mantém os eventos manuais lançados diretamente no fechamento.
  fsObj.eventos=fsObj.eventos.filter(ev=>ev.origem!=="cadastro-funcionario")
  ;(fun.eventos||[]).forEach(ev=>{
    if(!eventoVigenteNaCompetencia(ev))return
    if(excluidos.includes(chaveEventoMes(emp.codigo,fun.codigo,ev)))return
    const st=statusAnterior[chaveEvento(ev)] || ev.status || "Pendente"
    fsObj.eventos.push({...clone(ev),origem:"cadastro-funcionario",status:st})
    if(ev.desc){
      // FIX v2.4b: NÃO forçar vínculo do evento na empresa ao sincronizar funcionário.
      // O vínculo é gerenciado manualmente pelo usuário na aba Empresas/Códigos.
    }
  })
}
function aplicarAutoFuncionario(emp,fun,fsObj){
  const uteis=Number(calendario().uteis||0)
  if(!Array.isArray(fsObj.eventos))fsObj.eventos=[]
  const excluidosAuto=exclusoesAutomaticosCompetencia()
  const lista=Array.isArray(fun.autoEventos)?fun.autoEventos:[]
  const validos=lista.filter(a=>a&&a.evento&&a.qtd&&eventoVigenteNaCompetencia(a)&&!excluidosAuto.includes(chaveAutoMes(emp.codigo,fun.codigo,a.evento)))
  const chavesValidas=new Set(validos.map(a=>a.evento))
  // Remove do fechamento os automáticos que não existem mais no cadastro ou não estão vigentes nesta competência.
  // Mantém eventos manuais e eventos padrão.
  fsObj.eventos=fsObj.eventos.filter(ev=>{
    if(!(ev.auto===true || ev.origem==="automatico"))return true
    return chavesValidas.has(ev.desc||"")
  })
  // Remove duplicidade de automático já gravada no fechamento, mantendo apenas um por evento.
  const autosVistos=new Set()
  fsObj.eventos=fsObj.eventos.filter(ev=>{
    if(!(ev.auto===true || ev.origem==="automatico"))return true
    const k=ev.desc||""
    if(!k)return true
    if(autosVistos.has(k))return false
    autosVistos.add(k)
    return true
  })
  if(!uteis)return
  validos.forEach(a=>{
    let total=""
    if(String(a.qtd).includes(":")){
      const [h,m]=String(a.qtd).split(":").map(x=>parseInt(x||0))
      const min=(h*60+(m||0))*uteis
      total=String(Math.floor(min/60)).padStart(2,"0")+":"+String(min%60).padStart(2,"0")
    }else{
      total=String(Number(String(a.qtd).replace(",","."))*uteis).replace(".",",")
    }
    const existente=(fsObj.eventos||[]).find(ev=>(ev.auto===true || ev.origem==="automatico") && ev.desc===a.evento)
    if(existente){
      existente.valor=total
      existente.obs=`Automático: ${a.qtd} por dia útil x ${uteis} dias úteis`
      existente.inicio=a.inicio||""
      existente.fim=a.fim||""
      existente.auto=true
      existente.origem="automatico"
      existente.status=existente.status||"Pendente"
    }else{
      fsObj.eventos.push({desc:a.evento,valor:total,obs:`Automático: ${a.qtd} por dia útil x ${uteis} dias úteis`,inicio:a.inicio||"",fim:a.fim||"",status:"Pendente",auto:true,origem:"automatico"})
    }
  })
}
function aplicarManuaisRecorrentes(emp,fun,fsObj){
  // Eventos manuais lançados no fechamento COM prazo (início/fim) se repetem por competência.
  // Reaproveita a mesma lógica de vigência e exclusão por mês, sem tocar em padrão/automático.
  if(!Array.isArray(fsObj.eventos))fsObj.eventos=[]
  if(!Array.isArray(fun.eventosManuais))fun.eventosManuais=[]
  const excluidos=exclusoesManuaisCompetencia()
  // Preserva o status alterado no mês antes de reconstruir.
  const statusAnterior={}
  fsObj.eventos.forEach(ev=>{
    if(ev.origem==="manual-recorrente")statusAnterior[chaveEvento(ev)]=ev.status||"Pendente"
  })
  fsObj.eventos=fsObj.eventos.filter(ev=>ev.origem!=="manual-recorrente")
  ;(fun.eventosManuais||[]).forEach(ev=>{
    if(!eventoVigenteNaCompetencia(ev))return
    if(excluidos.includes(chaveEventoMes(emp.codigo,fun.codigo,ev)))return
    const st=statusAnterior[chaveEvento(ev)]||ev.status||"Pendente"
    fsObj.eventos.push({...clone(ev),origem:"manual-recorrente",status:st})
  })
}
function aplicarEventosAutomaticos(){empresasAtivas().forEach(emp=>emp.funcionarios.forEach(fun=>{const x=fs(emp,fun); aplicarAutoFuncionario(emp,fun,x)}))}
function ordemEventoFechamento(ev){
  const origem=ev.origem || (ev.auto===true ? "automatico" : "manual")
  if(origem==="cadastro-funcionario")return 1
  if(origem==="automatico")return 2
  return 3
}
function normalizarOrdemEventosFechamento(fsObj){
  if(!fsObj || !Array.isArray(fsObj.eventos))return
  const ordemSalva=fsObj.ordemEventos||{}
  fsObj.eventos.forEach(ev=>{
    const pos=ordemSalva[chaveEvento(ev)]
    if(Number.isInteger(pos))ev.ordemManual=pos
  })
  fsObj.eventos=fsObj.eventos
    .map((ev,idx)=>({ev,idx}))
    .sort((a,b)=>{
      if(Number.isInteger(a.ev.ordemManual)&&Number.isInteger(b.ev.ordemManual))return a.ev.ordemManual-b.ev.ordemManual
      if(Number.isInteger(a.ev.ordemManual))return -1
      if(Number.isInteger(b.ev.ordemManual))return 1
      const oa=ordemEventoFechamento(a.ev)
      const ob=ordemEventoFechamento(b.ev)
      if(oa!==ob)return oa-ob
      return a.idx-b.idx
    })
    .map(x=>x.ev)
}
async function limparEventosFuturosNaoConferidos(emp,fun){
  const chave=emp.codigo+"|"+fun.codigo
  const compAtual=comp()
  const eventosPadraoValidos=new Set((fun.eventos||[]).map(ev=>chaveEvento(ev)))
  const autosValidos=new Set((fun.autoEventos||[]).map(a=>a.evento).filter(Boolean))
  const deveRemover=function(ev){
    if(ev.origem==="cadastro-funcionario")return !eventosPadraoValidos.has(chaveEvento(ev))
    if(ev.auto===true || ev.origem==="automatico")return !autosValidos.has(ev.desc||"")
    return false
  }
  let temFuturo=false
  Object.keys(state.fechamentos||{}).forEach(c=>{
    if(compAtual && c<=compAtual)return
    const fsObj=state.fechamentos[c]?.funcionarios?.[chave]
    if(!fsObj || fsObj.status==="Conferido" || !Array.isArray(fsObj.eventos))return
    if(fsObj.eventos.some(deveRemover))temFuturo=true
  })
  const excluirFuturas=temFuturo?await confirmar(`Você removeu evento automático/padrão do funcionário.

Ele será excluído desta competência.

Deseja excluir também das próximas competências ainda não conferidas?

As competências anteriores não serão alteradas.`):false
  Object.keys(state.fechamentos||{}).forEach(c=>{
    if(compAtual && c<compAtual)return
    if(compAtual && c>compAtual && !excluirFuturas)return
    const fsObj=state.fechamentos[c]?.funcionarios?.[chave]
    if(!fsObj || fsObj.status==="Conferido")return
    if(Array.isArray(fsObj.eventos)){
      fsObj.eventos=fsObj.eventos.filter(ev=>!deveRemover(ev))
    }
  })
}
