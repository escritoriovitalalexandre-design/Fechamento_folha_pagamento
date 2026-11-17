const FERIADOS_NACIONAIS={
  "01-01":"Confraternização Universal","04-21":"Tiradentes","05-01":"Dia do Trabalho",
  "09-07":"Independência do Brasil","10-12":"Nossa Sra. Aparecida","11-02":"Finados",
  "11-15":"Proclamação da República","12-25":"Natal"
}
const DIAS_SEMANA_LABEL=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
const DIAS_SEMANA_IDS=["rDiaDom","rDiaSeg","rDiaTer","rDiaQua","rDiaQui","rDiaSex","rDiaSab"]

function regraComp(){return document.getElementById("regraComp")?.value||comp()}
function feriadosCompetencia(c){
  const cRef=c||regraComp()
  if(!state.fechamentos[cRef])state.fechamentos[cRef]={funcionarios:{},calendario:calcCalendarioMes(cRef),notaPainel:""}
  const f=state.fechamentos[cRef]
  if(!Array.isArray(f.feriadosExtras))f.feriadosExtras=[]
  return f.feriadosExtras
}
function todosFeriadosMes(c){
  const cRef=c||regraComp()
  const [ano,mes]=String(cRef).split("-").map(Number)
  const nacionais=Object.entries(FERIADOS_NACIONAIS)
    .filter(([k])=>Number(k.split("-")[0])===mes)
    .map(([k,v])=>({data:`${String(ano).padStart(4,"0")}-${k}`,nome:v,tipo:"Nacional"}))
  const fixos=getFeriadosFixos()
    .filter(f=>{const mm=Number((f.data||"").split("/")[1]);return mm===mes})
    .map(f=>{const [dd,mm]=f.data.split("/");return{data:`${ano}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`,nome:f.nome,tipo:f.tipo||"Municipal"}})
  const extras=feriadosCompetencia(cRef).map(f=>({...f,tipo:"Avulso"}))
  const vistos=new Set()
  return [...nacionais,...fixos,...extras].filter(f=>{if(vistos.has(f.data))return false;vistos.add(f.data);return true}).sort((a,b)=>a.data.localeCompare(b.data))
}
function datasFeriadosMes(c){
  return new Set(todosFeriadosMes(c).map(f=>f.data))
}
function calcDiasSemanaNoMes(c,desconsiderarFeriados){
  const cRef=c||regraComp()
  const [ano,mes]=String(cRef).split("-").map(Number)
  const feriados=desconsiderarFeriados?new Set():datasFeriadosMes(cRef)
  const contagem=[0,0,0,0,0,0,0]
  const d=new Date(ano,mes-1,1)
  while(d.getMonth()===mes-1){
    const iso=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")
    if(!feriados.has(iso))contagem[d.getDay()]++
    d.setDate(d.getDate()+1)
  }
  return contagem
}
function calcResumoCalMes(c,desconsiderarFeriados){
  const cRef=c||regraComp()
  const contagem=calcDiasSemanaNoMes(cRef,desconsiderarFeriados)
  const feriados=todosFeriadosMes(cRef)
  return {
    uteis:contagem[1]+contagem[2]+contagem[3]+contagem[4]+contagem[5],
    sabados:contagem[6],domingos:contagem[0],feriados:feriados.length,
    porDia:contagem
  }
}
function minParaHHMM(min){
  const h=Math.floor(Math.abs(min)/60)
  const m=Math.abs(min)%60
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")
}
function hhmmParaMin(hh,mm){return (parseInt(hh)||0)*60+(parseInt(mm)||0)}
function calcRegraFuncionario(regra,c,desconsiderarFeriados){
  const cRef=c||regraComp()
  const contagem=calcDiasSemanaNoMes(cRef,desconsiderarFeriados)
  const resumo=calcResumoCalMes(cRef,desconsiderarFeriados)
  let totalMin=0, totalValor=0
  const linhasCalc=(regra.linhas||[]).map(l=>{
    const diasMin=hhmmParaMin(l.hh,l.mm)
    let qtdDias=0
    const diasNomes=[]
    ;(l.dias||[]).forEach(d=>{qtdDias+=contagem[d];diasNomes.push(DIAS_SEMANA_LABEL[d])})
    const subMin=diasMin*qtdDias
    totalMin+=subMin
    const subValor=Number(l.valorDia||0)*qtdDias
    totalValor+=subValor
    return {subValor,valorDia:Number(l.valorDia||0),label:`${minParaHHMM(diasMin)} × ${qtdDias} dias (${diasNomes.join("/")})`,total:minParaHHMM(subMin),subMin,qtdDias}
  })
  let fictaMin=0
  let fictaLabel=""
  // Verifica se o evento é marcado como noturno — aplica ficta automática fator 1/7
  const evtLabel=regra.evento||""
  const evtObj=state.eventos.find(e=>labelEventoObj(e)===evtLabel)
  const isNoturno=!!(evtObj?.noturno)
  if(isNoturno && totalMin>0){
    fictaMin=Math.round(totalMin/7)
    totalMin+=fictaMin
    fictaLabel=`Hora ficta noturna (${minParaHHMM(Math.round(totalMin-fictaMin))} × 1/7)`
  }else if(regra.fictaHH||regra.fictaMM){
    fictaMin=hhmmParaMin(regra.fictaHH,regra.fictaMM)*resumo.uteis
    totalMin+=fictaMin
    fictaLabel=`Ficta ${minParaHHMM(hhmmParaMin(regra.fictaHH,regra.fictaMM))} × ${resumo.uteis} dias úteis`
  }
  return {linhasCalc,fictaMin,fictaLabel,totalMin,totalHHMM:minParaHHMM(totalMin),totalValor,isNoturno}
}
function normalizarRegrasFuncionario(fun){
  if(!Array.isArray(fun.regrasDiaSemana))fun.regrasDiaSemana=[]
}

function observacaoValorRegra(regra,calc){
  const linhas=calc.linhasCalc.map((l,i)=>{
    if(!l.subValor)return ""
    const dias=(regra.linhas[i]?.dias||[]).map(d=>DIAS_SEMANA_LABEL[d]).join("/")
    return dias+": "+l.qtdDias+" dias × R$ "+money(l.valorDia)+" por dia"
  }).filter(Boolean)
  return linhas.join("; ")
}
function valorNumericoRegra(valor){
  const texto=String(valor??"").trim()
  if(!texto||texto.includes(":"))return NaN
  return Number(texto.includes(",")?texto.replaceAll(".","").replace(",","."):texto)
}
function atualizarObservacoesValoresRegras(fun,fsObj,c){
  ;(fun.regrasDiaSemana||[]).forEach(regra=>{
    if((regra.inativa&&!regra.fim)||!eventoVigenteNaCompetencia(regra,c))return
    const calc=calcRegraFuncionario(regra,c,!!regra.desconsiderarFeriados?.[c])
    if(!calc.totalValor)return
    ;(fsObj.eventos||[]).forEach(ev=>{
      if(ev.origem==="regra-especial"&&ev.desc===regra.evento&&!String(ev.valor??"").includes(":")&&(ev.inicio||"")===(regra.inicio||"")&&(ev.fim||"")===(regra.fim||""))ev.obs=observacaoValorRegra(regra,calc)
    })
  })
}
function aplicarRegrasDiaSemana(emp,fun,fsObj,c){
  const cRef=c||comp()
  normalizarRegrasFuncionario(fun)
  if(!fun.regrasDiaSemana.length)return
  if(!Array.isArray(fsObj.eventos))fsObj.eventos=[]
  fun.regrasDiaSemana.forEach(regra=>{
    if(regra.inativa&&!regra.fim)return
    if(!eventoVigenteNaCompetencia(regra,cRef))return
    const desconsiderar=!!(regra.desconsiderarFeriados&&regra.desconsiderarFeriados[cRef])
    const calc=calcRegraFuncionario(regra,cRef,desconsiderar)
    if(!calc.totalMin&&!calc.totalValor)return
    const label=regra.evento||""
    const partes=calc.linhasCalc.map(l=>{
      const diasAbr=(l.label.match(/\(([^)]+)\)/)||["",""])[1].split("/").map(d=>d.slice(0,2)).join("/")
      const horas=(l.label.match(/^([\d:]+)/)||["",""])[1]
      const qtd=(l.label.match(/× (\d+) dias/)||["",""])[1]
      return horas+"×"+qtd+"d("+diasAbr+")="+l.total
    })
    if(calc.fictaLabel)partes.push("Fic="+minParaHHMM(calc.fictaMin))
    partes.push("Tot="+calc.totalHHMM)
    if(calc.totalValor)partes.push("Valor=R$"+money(calc.totalValor))
    const obs="RE:"+partes.join("|")
    if(calc.totalMin)fsObj.eventos.push({desc:label,valor:calc.totalHHMM,obs,inicio:regra.inicio||"",fim:regra.fim||"",status:"Pendente",origem:"regra-especial",auto:false})
    if(calc.totalValor)fsObj.eventos.push({desc:label,valor:money(calc.totalValor),obs:observacaoValorRegra(regra,calc),inicio:regra.inicio||"",fim:regra.fim||"",status:"Pendente",origem:"regra-especial",auto:false})
  })
}

function aplicarRegrasEspeciaisGlobal(){
  const c=comp()
  const chaveStatusRegra=ev=>[ev.desc||"",ev.valor||"",ev.inicio||"",ev.fim||""].join("||")
  empresasAtivas().forEach(emp=>{
    ;(emp.funcionarios||[]).forEach(fun=>{
      if(!funcionarioAtivoNaCompetencia(fun,c))return
      normalizarRegrasFuncionario(fun)
      if(!fun.regrasDiaSemana.length)return
      const x=fs(emp,fun)
      const statusAnterior=new Map(x.eventos.filter(ev=>ev.origem==="regra-especial").map(ev=>[chaveStatusRegra(ev),ev.status||"Pendente"]))
      x.eventos=x.eventos.filter(ev=>ev.origem!=="regra-especial")
      aplicarRegrasDiaSemana(emp,fun,x,c)
      x.eventos.forEach(ev=>{if(ev.origem==="regra-especial"&&statusAnterior.has(chaveStatusRegra(ev)))ev.status=statusAnterior.get(chaveStatusRegra(ev))})
    })
  })
}

let regraLinhasTemp=[]
let regraEditandoEmp=null
let regraEditandoFun=null
let regraEditandoIdx=null

function addFeriadoMes(){
  const data=prompt("Data do feriado (DD/MM):\nEx: 15/07","")
  if(!data)return
  const m=String(data).trim().match(/^(\d{2})\/(\d{2})$/)
  if(!m)return aviso("Informe a data no formato DD/MM.")
  const nome=prompt("Nome do feriado:","")
  if(!nome)return
  const c=regraComp()
  const ano=c.split("-")[0]
  const isoData=`${ano}-${m[2]}-${m[1]}`
  const lista=feriadosCompetencia(c)
  if(lista.find(f=>f.data===isoData))return aviso("Esta data já está cadastrada.")
  lista.push({data:isoData,nome:nome.trim()})
  lista.sort((a,b)=>a.data.localeCompare(b.data))
  save()
  aplicarRegrasEspeciaisGlobal()
  renderRegras()
  renderFechamento()
}
function removerFeriadoMes(data){
  if(!confirm("Remover este feriado?"))return
  const c=regraComp()
  const lista=feriadosCompetencia(c)
  const idx=lista.findIndex(f=>f.data===data)
  if(idx>=0)lista.splice(idx,1)
  save()
  aplicarRegrasEspeciaisGlobal()
  renderRegras()
  renderFechamento()
}
function renderRegraCalBox(){
  const c=regraComp()
  const resumo=calcResumoCalMes(c,false)
  const box=document.getElementById("regraCalBox")
  if(!box)return
  const itens=[
    {v:resumo.uteis,l:"Úteis"},{v:resumo.sabados,l:"Sábados"},{v:resumo.domingos,l:"Domingos"},{v:resumo.feriados,l:"Feriados"},
    {v:resumo.porDia[1],l:"Segundas"},{v:resumo.porDia[2],l:"Terças"},{v:resumo.porDia[3],l:"Quartas"},
    {v:resumo.porDia[4],l:"Quintas"},{v:resumo.porDia[5],l:"Sextas"},{v:resumo.porDia[6],l:"Sábados"},{v:resumo.porDia[0],l:"Domingos"}
  ]
  box.innerHTML=itens.map(i=>`<div style="background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:8px 12px;text-align:center;min-width:58px"><b style="display:block;font-size:18px;color:var(--pri)">${i.v}</b><span style="font-size:11px;color:var(--muted);text-transform:uppercase">${i.l}</span></div>`).join("")
}
function renderRegraFeriadosLista(){
  const c=regraComp()
  const lista=document.getElementById("regraFeriadosLista")
  if(!lista)return
  const todos=todosFeriadosMes(c)
  if(!todos.length){lista.innerHTML='<span style="font-size:12px;color:var(--muted)">Nenhum feriado neste mês.</span>';return}
  lista.innerHTML=todos.map(f=>{
    const dia=f.data.split("-")[2]+"/"+f.data.split("-")[1]
    const bg=f.tipo==="Nacional"?"#fee2e2":f.tipo==="Móvel"?"#fef3c7":"#dbeafe"
    const cl=f.tipo==="Nacional"?"#991b1b":f.tipo==="Móvel"?"#92400e":"#1e40af"
    const remBtn=f.tipo==="Avulso"?` <button onclick="removerFeriadoMes('${f.data}')" style="background:transparent;border:none;cursor:pointer;color:inherit;font-size:13px;padding:0 0 0 4px">×</button>`:""
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${bg};color:${cl};border-radius:999px;padding:2px 10px;font-size:12px">${dia} — ${esc(f.nome)}${remBtn}</span>`
  }).join("")
}
function renderRegras(){
  const c=regraComp()
  if(!c)return
  renderRegraCalBox()
  renderRegraFeriadosLista()
  const container=document.getElementById("regraCards")
  if(!container)return
  // Agrupa por funcionário
  const grupos=[]
  const chaveVista=new Set()
  empresasAtivas().forEach(emp=>{
    ;(emp.funcionarios||[]).forEach(fun=>{
      normalizarRegrasFuncionario(fun)
      if(!(fun.regrasDiaSemana||[]).length)return
      const chave=emp.codigo+"|"+fun.codigo
      if(chaveVista.has(chave))return
      chaveVista.add(chave)
      grupos.push({emp,fun,regras:fun.regrasDiaSemana.map((regra,idx)=>({regra,idx}))})
    })
  })
  const mostrarIn=document.getElementById("mostrarInativas")?.checked
  grupos.forEach(g=>{g.regras=g.regras.filter(({regra})=>mostrarIn||!regra.inativa)})
  const gruposVisiveis=grupos.filter(g=>g.regras.length)
  if(!gruposVisiveis.length){
    container.innerHTML='<div class="card"><p class="muted">Nenhuma regra especial'+(mostrarIn?"":" ativa")+' cadastrada. Clique em "+ Nova regra" para começar.</p></div>'
    return
  }
  function htmlRegra(emp,fun,regra,idx){
    const desc=!!(fun.regrasDiaSemana[idx]?.desconsiderarFeriados?.[c])
    const calc=calcRegraFuncionario(regra,c,desc)
    const tags=(regra.linhas||[]).map(l=>{
      const diasNomes=(l.dias||[]).map(d=>DIAS_SEMANA_LABEL[d]).join("/")
      return `<span style="background:#dbeafe;color:#1e40af;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;margin-right:4px;display:inline-block;margin-bottom:3px">${diasNomes} = ${minParaHHMM(hhmmParaMin(l.hh,l.mm))}${Number(l.valorDia||0)?" · R$ "+money(l.valorDia)+"/dia":""}</span>`
    }).join("")
    const fictaTag=(regra.fictaHH||regra.fictaMM)?`<span style="background:#fef3c7;color:#92400e;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;margin-right:4px;display:inline-block;margin-bottom:3px">+ Ficta ${minParaHHMM(hhmmParaMin(regra.fictaHH,regra.fictaMM))}/dia</span>`:""
    const linhasCalcHtml=calc.linhasCalc.map(l=>`<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);padding:3px 0;border-bottom:0.5px solid var(--line)"><span>${esc(l.label)}${l.subValor?" · "+esc((regra.linhas[calc.linhasCalc.indexOf(l)]?.dias||[]).map(d=>DIAS_SEMANA_LABEL[d]).join("/"))+": "+l.qtdDias+" dias × R$ "+money(l.valorDia)+" por dia":""}</span><span style="font-weight:700;color:var(--ink)">${l.total}${l.subValor?" · R$ "+money(l.subValor):""}</span></div>`).join("")
    const fictaHtml=calc.fictaLabel?`<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);padding:3px 0;border-bottom:0.5px solid var(--line)"><span>${esc(calc.fictaLabel)}</span><span style="font-weight:700;color:var(--ink)">${minParaHHMM(calc.fictaMin)}</span></div>`:""
    const chkId=`chkDesc_${emp.codigo}_${fun.codigo}_${idx}`
    const periodoTag=regra.inicio||regra.fim?`<span style="background:#f1f5f9;color:var(--muted);border-radius:6px;padding:1px 8px;font-size:11px;margin-left:6px">${regra.inicio?fmtMesRefLocal(regra.inicio):"início"} → ${regra.fim?fmtMesRefLocal(regra.fim):"sem fim"}</span>`:""
    const evtBadge=`<span style="background:#f1f5f9;border:0.5px solid var(--line);border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;color:var(--ink)">${esc(regra.evento||"")}</span>`
    const inativaBadge=regra.inativa?`<span style="font-size:11px;padding:2px 8px;background:#f1f5f9;color:var(--muted);border-radius:999px;margin-left:4px">Inativa</span>`:""
    return `<div style="${regra.inativa?"opacity:0.5;":""}">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${evtBadge}${periodoTag}${inativaBadge}</div>
        <div style="display:flex;gap:6px">
          <button class="btn small out" onclick="abrirModalRegra('${esc(emp.codigo)}','${esc(fun.codigo)}',${idx})">Editar</button>
          <button class="btn small out" onclick="toggleInativarCard('${esc(emp.codigo)}','${esc(fun.codigo)}',${idx})">${regra.inativa?"Reativar":"Inativar"}</button>
        </div>
      </div>
      <div style="margin-bottom:8px">${tags}${fictaTag}</div>
      <div style="border-top:1px solid var(--line);padding-top:8px;margin-bottom:8px">${linhasCalcHtml}${fictaHtml}<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--ink);padding:6px 0;border-top:1.5px solid var(--line);margin-top:4px"><span>Total — lança automático</span><span>${calc.totalMin?calc.totalHHMM:""}${calc.totalMin&&calc.totalValor?" · ":""}${calc.totalValor?"R$ "+money(calc.totalValor):""}</span></div></div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="font-size:20px;font-weight:700;color:var(--pri)">${calc.totalMin?calc.totalHHMM:""}${calc.totalMin&&calc.totalValor?" · ":""}${calc.totalValor?"R$ "+money(calc.totalValor):""}</div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer">
          <input type="checkbox" id="${chkId}" ${desc?"checked":""} onchange="toggleDesconsiderarFeriado('${esc(emp.codigo)}','${esc(fun.codigo)}',${idx},this.checked)">
          Desconsiderar feriados este mês
        </label>
      </div>
    </div>`
  }
  container.innerHTML=gruposVisiveis.map(({emp,fun,regras})=>{
    const qtd=regras.length
    const regrasSep=regras.map(({regra,idx},i)=>{
      const sepHtml=i>0?`<div style="border:none;border-top:1.5px dashed var(--line);margin:14px 0"></div>`:""
      return sepHtml+htmlRegra(emp,fun,regra,idx)
    }).join("")
    return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--line)">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--pri)">${esc(fun.nome)} — ${esc(emp.nome)}</div>
          <div style="font-size:12px;color:var(--muted)">${esc(fun.funcao||"Sem função")} · ${qtd} regra${qtd>1?"s":""} especial${qtd>1?"is":""}</div>
        </div>
        <span style="font-size:11px;padding:3px 10px;background:var(--greenbg);color:var(--green);border-radius:999px">Calculado</span>
      </div>
      ${regrasSep}
    </div>`
  }).join("")
}
function toggleDesconsiderarFeriado(empCod,funCod,regraIdx,val){
  const emp=state.empresas.find(e=>e.codigo===empCod)
  const fun=emp?.funcionarios.find(f=>f.codigo===funCod)
  if(!fun)return
  normalizarRegrasFuncionario(fun)
  if(!fun.regrasDiaSemana[regraIdx])return
  if(!fun.regrasDiaSemana[regraIdx].desconsiderarFeriados)fun.regrasDiaSemana[regraIdx].desconsiderarFeriados={}
  const c=regraComp()
  fun.regrasDiaSemana[regraIdx].desconsiderarFeriados[c]=val
  save()
  aplicarRegrasEspeciaisGlobal()
  renderRegras()
  renderFechamento()
}
function atualizarCampoFictaModal(){
  const evtLabel=document.getElementById("regraEvtSel")?.value||""
  const evtObj=state.eventos.find(e=>labelEventoObj(e)===evtLabel)
  const isNoturno=!!(evtObj?.noturno)
  const box=document.getElementById("regraFictaBox")
  const aviso=document.getElementById("regraFictaAutoAviso")
  if(box)box.style.display=isNoturno?"none":"block"
  if(aviso)aviso.style.display=isNoturno?"block":"none"
  if(isNoturno){
    if(document.getElementById("regraFictaHH"))regraFictaHH.value=""
    if(document.getElementById("regraFictaMM"))regraFictaMM.value=""
  }
}
function popularRegraFunSelect(){
  const empCod=document.getElementById("regraEmpSel")?.value
  const sel=document.getElementById("regraFunSel")
  if(!sel)return
  const emp=state.empresas.find(e=>e.codigo===empCod)
  sel.innerHTML=(emp?.funcionarios||[]).map(f=>`<option value="${esc(f.codigo)}">${esc(f.codigo)} - ${esc(f.nome)}</option>`).join("")
}
function renderRegraLinhasList(){
  const box=document.getElementById("regraLinhasList")
  if(!box)return
  if(!regraLinhasTemp.length){box.innerHTML='<p style="font-size:13px;color:var(--muted)">Nenhuma linha adicionada.</p>';return}
  box.innerHTML=regraLinhasTemp.map((l,i)=>{
    const diasNomes=(l.dias||[]).map(d=>DIAS_SEMANA_LABEL[d]).join("/")
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:0.5px solid var(--line)"><b style="font-size:13px">${diasNomes} = ${minParaHHMM(hhmmParaMin(l.hh,l.mm))}/dia${Number(l.valorDia||0)?" · R$ "+money(l.valorDia)+"/dia":""}</b><button class="btn small red" onclick="regraLinhasTemp.splice(${i},1);renderRegraLinhasList()">Remover</button></div>`
  }).join("")
}
function addRegraLinha(){
  const dias=DIAS_SEMANA_IDS.map((id,i)=>document.getElementById(id)?.checked?i:null).filter(x=>x!==null)
  if(!dias.length)return aviso("Selecione pelo menos um dia da semana.")
  const hh=document.getElementById("rLinhaHH")?.value||"0"
  const mm=document.getElementById("rLinhaMM")?.value||"0"
  const valorTexto=(document.getElementById("rLinhaValor")?.value||"").trim()
  const valorDia=valorTexto?Number(valorTexto.includes(",")?valorTexto.replace(/\./g,"").replace(",","."):valorTexto):0
  if(valorTexto&&(!Number.isFinite(valorDia)||valorDia<0))return aviso("Informe um valor válido.")
  if(!parseInt(hh)&&!parseInt(mm)&&!valorDia)return aviso("Informe horas ou valor por dia.")
  regraLinhasTemp.push({dias,hh:String(parseInt(hh)||0),mm:String(parseInt(mm)||0),valorDia})
  DIAS_SEMANA_IDS.forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false})
  if(document.getElementById("rLinhaHH"))rLinhaHH.value=""
  if(document.getElementById("rLinhaMM"))rLinhaMM.value=""
  if(document.getElementById("rLinhaValor"))rLinhaValor.value=""
  renderRegraLinhasList()
}
function abrirModalRegra(empCod,funCod,regraIdx){
  regraLinhasTemp=[]
  regraEditandoEmp=empCod||null
  regraEditandoFun=funCod||null
  regraEditandoIdx=(regraIdx!==undefined&&regraIdx!==null)?regraIdx:null
  const modal=document.getElementById("modalRegra")
  if(!modal)return
  const empSel=document.getElementById("regraEmpSel")
  const listaCadastro=empresasCadastroVisiveis()
  empSel.innerHTML=listaCadastro.map(e=>`<option value="${esc(e.codigo)}">${esc(e.codigo)} - ${esc(e.nome)}</option>`).join("")
  const evtSel=document.getElementById("regraEvtSel")
  evtSel.innerHTML=state.eventos.map(e=>{const v=labelEventoObj(e);return `<option value="${esc(v)}">${esc(v)}</option>`}).join("")
  if(empCod&&funCod&&regraIdx!==null&&regraIdx!==undefined){
    const emp=state.empresas.find(e=>e.codigo===empCod)
    const fun=emp?.funcionarios.find(f=>f.codigo===funCod)
    if(fun){
      normalizarRegrasFuncionario(fun)
      const regra=fun.regrasDiaSemana[regraIdx]
      if(regra){
        empSel.value=empCod
        popularRegraFunSelect()
        document.getElementById("regraFunSel").value=funCod
        evtSel.value=regra.evento||""
        if(document.getElementById("regraFictaHH"))regraFictaHH.value=regra.fictaHH||""
        if(document.getElementById("regraFictaMM"))regraFictaMM.value=regra.fictaMM||""
        if(document.getElementById("regraInicio"))regraInicio.value=regra.inicio||""
        if(document.getElementById("regraFim"))regraFim.value=regra.fim||""
        atualizarCampoFictaModal()
        regraLinhasTemp=clone(regra.linhas||[])
        renderRegraLinhasList()
        document.getElementById("modalRegraTitulo").textContent="Editar regra especial"
        const btn=document.getElementById("btnExcluirRegra")
        if(btn)btn.style.display="inline-block"
        const btnIn=document.getElementById("btnInativarRegra")
        if(btnIn){btnIn.style.display="inline-block";btnIn.textContent=regra.inativa?"Reativar regra":"Inativar regra"}
        const pe=document.getElementById("painelExclusaoRegra")
        if(pe)pe.style.display="none"
        modal.classList.add("open")
        return
      }
    }
  }
  popularRegraFunSelect()
  if(document.getElementById("regraFictaHH"))regraFictaHH.value=""
  if(document.getElementById("regraFictaMM"))regraFictaMM.value=""
  if(document.getElementById("regraInicio"))regraInicio.value=""
  if(document.getElementById("regraFim"))regraFim.value=""
  atualizarCampoFictaModal()
  renderRegraLinhasList()
  document.getElementById("modalRegraTitulo").textContent="Cadastrar regra especial"
  const btn=document.getElementById("btnExcluirRegra")
  if(btn)btn.style.display="none"
  const btnIn=document.getElementById("btnInativarRegra")
  if(btnIn)btnIn.style.display="none"
  const pe=document.getElementById("painelExclusaoRegra")
  if(pe)pe.style.display="none"
  modal.classList.add("open")
}
function fecharModalRegra(){
  const modal=document.getElementById("modalRegra")
  if(modal)modal.classList.remove("open")
  regraLinhasTemp=[]
  regraEditandoEmp=null
  regraEditandoFun=null
  regraEditandoIdx=null
}
function salvarModalRegra(){
  const empCod=document.getElementById("regraEmpSel")?.value
  const funCod=document.getElementById("regraFunSel")?.value
  const evento=document.getElementById("regraEvtSel")?.value
  if(!empCod||!funCod||!evento)return aviso("Selecione empresa, funcionário e evento.")
  if(!regraLinhasTemp.length)return aviso("Adicione pelo menos uma linha de dias, horas ou valor.")
  const emp=state.empresas.find(e=>e.codigo===empCod)
  const fun=emp?.funcionarios.find(f=>f.codigo===funCod)
  if(!fun)return aviso("Funcionário não localizado.")
  normalizarRegrasFuncionario(fun)
  const regra={
    evento,
    linhas:clone(regraLinhasTemp),
    fictaHH:document.getElementById("regraFictaHH")?.value||"",
    fictaMM:document.getElementById("regraFictaMM")?.value||"",
    inicio:document.getElementById("regraInicio")?.value||"",
    fim:document.getElementById("regraFim")?.value||"",
    desconsiderarFeriados:{}
  }
  if(regra.inicio&&regra.fim&&regra.inicio>regra.fim)return aviso("O início não pode ser posterior ao fim.")
  if(fun.regrasDiaSemana.some((r,i)=>i!==regraEditandoIdx&&r.evento===evento&&periodosEventosSobrepostos(r,regra)))return aviso("Já existe regra deste código com período sobreposto. Informe início e fim fora do período anterior para preservar o histórico.")
  if(!confirm((regraEditandoIdx!==null?"Salvar alterações da":"Cadastrar nova")+" regra especial?"))return
  if(regraEditandoIdx!==null&&regraEditandoIdx!==undefined){
    const anterior=fun.regrasDiaSemana[regraEditandoIdx]
    regra.desconsiderarFeriados=anterior?.desconsiderarFeriados||{}
    fun.regrasDiaSemana[regraEditandoIdx]=regra
  }else{
    fun.regrasDiaSemana.push(regra)
  }
  save()
  aplicarRegrasEspeciaisGlobal()
  fecharModalRegra()
  renderRegras()
  renderFechamento()
}
function excluirRegraModal(){
  if(regraEditandoEmp===null||regraEditandoFun===null||regraEditandoIdx===null)return
  if(!confirm("Excluir esta regra especial? Os lançamentos automáticos dela serão removidos do fechamento."))return
  const emp=state.empresas.find(e=>e.codigo===regraEditandoEmp)
  const fun=emp?.funcionarios.find(f=>f.codigo===regraEditandoFun)
  if(!fun)return
  normalizarRegrasFuncionario(fun)
  fun.regrasDiaSemana.splice(regraEditandoIdx,1)
  Object.values(state.fechamentos||{}).forEach(fe=>{
    Object.values(fe.funcionarios||{}).forEach(fsObj=>{
      if(Array.isArray(fsObj.eventos))fsObj.eventos=fsObj.eventos.filter(ev=>ev.origem!=="regra-especial")
    })
  })
  save()
  aplicarRegrasEspeciaisGlobal()
  fecharModalRegra()
  renderRegras()
  renderFechamento()
}


function togglePainelFeriadosFixos(){
  const p=document.getElementById("painelFeriadosFixos")
  if(!p)return
  const aberto=p.style.display==="block"
  p.style.display=aberto?"none":"block"
  if(!aberto)renderTabFeriadosFixos()
}
function getFeriadosFixos(){
  if(!Array.isArray(state.feriadosFixos))state.feriadosFixos=[]
  return state.feriadosFixos
}
function renderTabFeriadosFixos(){
  const tab=document.getElementById("tabFeriadosFixos")
  if(!tab)return
  const lista=getFeriadosFixos()
  if(!lista.length){tab.innerHTML="<tbody><tr><td colspan='4' style='padding:10px;color:var(--muted)'>Nenhum feriado fixo cadastrado.</td></tr></tbody>";return}
  tab.innerHTML="<thead><tr><th>Data</th><th>Nome</th><th>Tipo</th><th></th></tr></thead><tbody>"+lista.map((f,i)=>{
    const bg=f.tipo==="Móvel"?"#fef3c7":f.tipo==="Estadual"?"#dbeafe":"#dcfce7"
    const cl=f.tipo==="Móvel"?"#92400e":f.tipo==="Estadual"?"#1e40af":"#166534"
    return `<tr><td style="padding:7px 10px;color:var(--muted)">${esc(f.data)}</td><td style="padding:7px 10px">${esc(f.nome)}</td><td style="padding:7px 10px"><span style="font-size:11px;background:${bg};color:${cl};border-radius:999px;padding:2px 8px">${esc(f.tipo||"Municipal")}</span></td><td style="padding:7px 10px;text-align:right"><button class="btn small red" onclick="delFeriadoFixo(${i})">Excluir</button></td></tr>`
  }).join("")+"</tbody>"
}
function addFeriadoFixo(){
  const dataRaw=(document.getElementById("ffData")?.value||"").trim()
  const nome=(document.getElementById("ffNome")?.value||"").trim()
  const tipo=document.getElementById("ffTipo")?.value||"Municipal"
  if(!dataRaw.match(/^\d{2}\/\d{2}$/))return aviso("Informe a data no formato DD/MM.")
  if(!nome)return aviso("Informe o nome do feriado.")
  const lista=getFeriadosFixos()
  if(lista.find(f=>f.data===dataRaw))return aviso("Já existe um feriado nesta data.")
  lista.push({data:dataRaw,nome,tipo})
  lista.sort((a,b)=>a.data.localeCompare(b.data))
  if(document.getElementById("ffData"))document.getElementById("ffData").value=""
  if(document.getElementById("ffNome"))document.getElementById("ffNome").value=""
  save()
  renderTabFeriadosFixos()
  aplicarRegrasEspeciaisGlobal()
  renderRegras()
  renderFechamento()
}
function delFeriadoFixo(i){
  if(!confirm("Excluir este feriado fixo?"))return
  getFeriadosFixos().splice(i,1)
  save()
  renderTabFeriadosFixos()
  aplicarRegrasEspeciaisGlobal()
  renderRegras()
  renderFechamento()
}
function inativarRegraModal(){
  if(regraEditandoEmp===null||regraEditandoFun===null||regraEditandoIdx===null)return
  const emp=state.empresas.find(e=>e.codigo===regraEditandoEmp)
  const fun=emp?.funcionarios.find(f=>f.codigo===regraEditandoFun)
  if(!fun)return
  normalizarRegrasFuncionario(fun)
  const regra=fun.regrasDiaSemana[regraEditandoIdx]
  if(!regra)return
  regra.inativa=!regra.inativa
  save()
  aplicarRegrasEspeciaisGlobal()
  fecharModalRegra()
  renderRegras()
  renderFechamento()
}
function toggleInativarCard(empCod,funCod,idx){
  const emp=state.empresas.find(e=>e.codigo===empCod)
  const fun=emp?.funcionarios.find(f=>f.codigo===funCod)
  if(!fun)return
  normalizarRegrasFuncionario(fun)
  const regra=fun.regrasDiaSemana[idx]
  if(!regra)return
  regra.inativa=!regra.inativa
  save()
  aplicarRegrasEspeciaisGlobal()
  renderRegras()
  renderFechamento()
}
function mostrarPainelExclusao(){
  const p=document.getElementById("painelExclusaoRegra")
  if(!p)return
  const de=document.getElementById("dataEfeitoExclusao")
  if(de)de.value=regraComp()
  p.style.display="block"
}
function confirmarExclusaoRegra(){
  if(regraEditandoEmp===null||regraEditandoFun===null||regraEditandoIdx===null)return
  const dataEfeito=document.getElementById("dataEfeitoExclusao")?.value
  if(!dataEfeito)return aviso("Informe a competência a partir da qual excluir.")
  if(!confirm("Confirmar exclusão a partir de "+fmtMesRefLocal(dataEfeito)+"?"))return
  const emp=state.empresas.find(e=>e.codigo===regraEditandoEmp)
  const fun=emp?.funcionarios.find(f=>f.codigo===regraEditandoFun)
  if(!fun)return
  normalizarRegrasFuncionario(fun)
  fun.regrasDiaSemana.splice(regraEditandoIdx,1)
  Object.entries(state.fechamentos||{}).forEach(([comp,fe])=>{
    if(comp>=dataEfeito){
      Object.values(fe.funcionarios||{}).forEach(fsObj=>{
        if(Array.isArray(fsObj.eventos))fsObj.eventos=fsObj.eventos.filter(ev=>ev.origem!=="regra-especial")
      })
    }
  })
  save()
  aplicarRegrasEspeciaisGlobal()
  fecharModalRegra()
  renderRegras()
  renderFechamento()
}

function confirmarAlternarStatusDB(empCod, statusAtual, nomeEmp){
  const novo=statusAtual==="Em dia"?"Aguardando":"Em dia"
  if(!confirm(`Alterar status de "${statusAtual}" → "${novo}"?\n\nEmpresa: ${nomeEmp}`))return
  alternarStatusDB(empCod)
}
function alternarStatusDB(empCod){
  const emp=state.empresas.find(e=>String(e.codigo)===String(empCod))
  if(!emp)return
  const atual=statusDB(emp)
  const novo=atual==="Em dia"?"Aguardando":"Em dia"
  emp.statusDataBase=novo
  if(novo==="Em dia")emp.dataBaseEmDiaAno=anoCompetencia()
  save()
  renderAlertas()
  renderRel()
}
let _filtroAlerta="todos"
function setFiltroAlerta(f){
  _filtroAlerta=f
  ;["todos","emdia","aguardando","vencido"].forEach(k=>{
    const btn=document.getElementById("filtroAlerta_"+k)
    if(btn)btn.className=k===f?"btn small pri":"btn small out"
  })
  renderAlertas()
}
function abrirSindicatoPainel(nomeSind){
  if(!nomeSind)return
  abrirSindicato(nomeSind)
}

