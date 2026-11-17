function sindicatoNomeFromItem(item){return typeof item==="string"?item:String(item?.nome||"")}
function sindicatoAdicionalDetalhesNormalizados(emp){
  const detalhes=Array.isArray(emp?.sindicatosAdicionaisDetalhes)?emp.sindicatosAdicionaisDetalhes:[]
  if(detalhes.length){
    return detalhes.map(x=>({
      nome:String(x.nome||"").trim(),
      dataBase:normalizarMesExtenso(x.dataBase||""),
      statusDataBase:x.statusDataBase||"Em dia",
      dissidio:x.dissidio||"",
      dataBaseEmDiaAno:x.dataBaseEmDiaAno||""
    })).filter(x=>x.nome)
  }
  return (Array.isArray(emp?.sindicatosAdicionais)?emp.sindicatosAdicionais:[]).map(nome=>{
    const s=(state.sindicatos||[]).find(si=>String(si.nome||"").trim()===String(nome||"").trim())||{}
    return {nome:String(nome||"").trim(),dataBase:normalizarMesExtenso(s.dataBase||""),statusDataBase:"Em dia",dissidio:s.obs||"",dataBaseEmDiaAno:""}
  }).filter(x=>x.nome)
}
function sindicatoPrincipalEAdicionais(emp){
  const arr=[emp?.sindicato||"",...sindicatoAdicionalDetalhesNormalizados(emp).map(x=>x.nome)].map(x=>String(x||"").trim()).filter(Boolean)
  return [...new Set(arr)]
}
function opcoesSindicatosHtml(valor, excluirPrincipal){
  const v=String(valor||"")
  const principal=String(excluirPrincipal||"")
  return '<option value="">Selecione...</option>'+(state.sindicatos||[]).filter(s=>String(s.nome||"")!==principal || String(s.nome||"")===v).map(s=>`<option value="${esc(s.nome)}"${String(s.nome)===v?' selected':''}>${esc(s.nome)}</option>`).join("")
}
function aplicarDadosSindicatoAdicional(obj){
  const s=(state.sindicatos||[]).find(x=>String(x.nome||"").trim()===String(obj.nome||"").trim())
  if(s){
    if(!obj.dataBase)obj.dataBase=normalizarMesExtenso(s.dataBase||"")
    if(!obj.dissidio)obj.dissidio=s.obs||""
  }
  if(!obj.statusDataBase)obj.statusDataBase="Em dia"
  return obj
}
function renderTabelaSindicatosAdicionais(idBody, lista, prefix, sindicatoPrincipal){
  const body=document.getElementById(idBody); if(!body)return
  if(!lista.length){
    body.innerHTML='<tr><td colspan="5" style="padding:10px;color:var(--muted)">Nenhum sindicato adicional incluído.</td></tr>'
    return
  }
  body.innerHTML=lista.map((it,i)=>`<tr>
    <td><select onchange="${prefix}SindAdicChange(${i},'nome',this.value)">${opcoesSindicatosHtml(it.nome,sindicatoPrincipal)}</select></td>
    <td><select onchange="${prefix}SindAdicChange(${i},'dataBase',this.value)">${mesesOptions(it.dataBase||"")}</select></td>
    <td><select class="${dbClass(it.statusDataBase||'Em dia')}" onchange="this.className=dbClass(this.value);${prefix}SindAdicChange(${i},'statusDataBase',this.value)"><option${(it.statusDataBase||'Em dia')==='Em dia'?' selected':''}>Em dia</option><option${it.statusDataBase==='Aguardando'?' selected':''}>Aguardando</option></select></td>
    <td><input class="sind-adic-obs" value="${esc(it.dissidio||"")}" placeholder="Dissídio/observação" oninput="${prefix}SindAdicChange(${i},'dissidio',this.value)"></td>
    <td><button type="button" class="btn small red" onclick="${prefix}SindAdicRemove(${i})">Remover</button></td>
  </tr>`).join("")
}
function toggleMultiSindCad(){
  const chk=document.getElementById("empMultiSindCad")
  const box=document.getElementById("empSindicatosAdicBox")
  if(box)box.classList.toggle("hidden",!chk?.checked)
  if(chk?.checked)renderCadSindicatosAdic()
}
function cadSindAdicAdd(){empSindicatosAdicTemp.push({nome:"",dataBase:"",statusDataBase:"Em dia",dissidio:""}); renderCadSindicatosAdic()}
function cadSindAdicRemove(i){empSindicatosAdicTemp.splice(i,1); renderCadSindicatosAdic()}
function cadSindAdicChange(i,campo,valor){
  if(!empSindicatosAdicTemp[i])return
  empSindicatosAdicTemp[i][campo]=campo==="dataBase"?normalizarMesExtenso(valor):valor
  // TRAVADO: não renderizar a tabela a cada letra digitada no campo observação, para não perder o foco.
  if(campo==="nome"){aplicarDadosSindicatoAdicional(empSindicatosAdicTemp[i]); renderCadSindicatosAdic()}
}
function renderCadSindicatosAdic(){renderTabelaSindicatosAdicionais("empSindicatosAdicBody",empSindicatosAdicTemp,"cad",document.getElementById("empSindCad")?.value||"")}
function mEmpSindAdicAdd(){meSindicatosAdicTemp.push({nome:"",dataBase:"",statusDataBase:"Em dia",dissidio:""}); renderModalSindicatosAdic()}
function mEmpSindAdicRemove(i){meSindicatosAdicTemp.splice(i,1); renderModalSindicatosAdic()}
function mEmpSindAdicChange(i,campo,valor){
  if(!meSindicatosAdicTemp[i])return
  meSindicatosAdicTemp[i][campo]=campo==="dataBase"?normalizarMesExtenso(valor):valor
  // TRAVADO: não renderizar a tabela a cada letra digitada no campo observação, para não perder o foco.
  if(campo==="nome"){aplicarDadosSindicatoAdicional(meSindicatosAdicTemp[i]); renderModalSindicatosAdic()}
}
function renderModalSindicatosAdic(){renderTabelaSindicatosAdicionais("meSindicatosAdicBody",meSindicatosAdicTemp,"mEmp",document.getElementById("meSind")?.value||"")}
function normalizarListaSindicatosAdic(lista, principal){
  const usados=new Set([String(principal||"").trim()].filter(Boolean))
  return (Array.isArray(lista)?lista:[]).map(x=>aplicarDadosSindicatoAdicional({...x,nome:String(x.nome||"").trim(),dataBase:normalizarMesExtenso(x.dataBase||""),statusDataBase:x.statusDataBase||"Em dia",dissidio:x.dissidio||""})).filter(x=>{
    if(!x.nome || usados.has(x.nome))return false
    usados.add(x.nome); return true
  })
}
function novaEmpresaCadastro(){
  empresaEditando="__novo__"
  empresaNaoContribuiSindicatoObsTemp=""
  meSindicatosAdicTemp=[]
  abrirModalEmpresa({codigo:"",nome:"",tipo:"",statusCliente:"Ativo",clienteInativo:false,sindicato:"",vinculoSindicato:"Normal",dataBase:"",statusDataBase:"Em dia",dissidio:"",contribuicaoSindicatoStatus:"OK",naoContribuiSindicatoObs:"",possuiMaisDeUmSindicato:false,sindicatosAdicionaisDetalhes:[],funcionarios:[],eventosPermitidos:[],__novo:true})
}
function money(v){if(v===""||v==null||isNaN(Number(String(v).replace(",","."))))return esc(v); return Number(String(v).replace(",",".")).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
function valorPadrao(v){
  v=String(v??"").trim()
  if(!v)return ""
  if(v.includes(":")){
    const p=v.split(":"); const h=String(parseInt(p[0]||0)).padStart(2,"0"); const m=String(parseInt(p[1]||0)).padStart(2,"0"); return `${h}:${m}`
  }
  if(v.includes(",")){
    const n=Number(v.replaceAll(".","").replace(",","."))
    return isNaN(n)?v:n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})
  }
  if(v.includes("."))return v.replace(",",".")
  return v
}
function formatMoneyInput(v){
  v=String(v??"").trim()
  if(!v)return ""
  let n
  if(v.includes(",")) n=Number(v.replaceAll(".","").replace(",","."))
  else n=Number(v.replaceAll(".",""))
  if(isNaN(n))return v
  return n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})
}
function statusClass(v){return v==="Conferido"?"status-conferido":v==="Lançado"?"status-lancado":v==="Com observação"?"status-observacao":v==="Não lançar"?"status-nao":"status-pendente"}
function dbClass(v){v=String(v||"Aguardando").toLowerCase(); if(v.includes("em dia"))return "db-em-dia"; if(v.includes("vencida"))return "db-vencida"; return "db-aguardando"}
function sindicatoStatusReferencia(nome){
  return (state.sindicatos||[]).find(s=>String(s.nome||"").trim()===String(nome||"").trim()&&s.statusDataBase)
}
function sincronizarStatusSindicato(s){
  if(!s||!s.statusDataBase)return
  const aplicar=item=>{item.statusDataBase=s.statusDataBase; if(s.dataBaseEmDiaAno)item.dataBaseEmDiaAno=s.dataBaseEmDiaAno; else delete item.dataBaseEmDiaAno}
  ;(state.empresas||[]).forEach(emp=>{
    if(String(emp.sindicato||"").trim()===String(s.nome||"").trim())aplicar(emp)
    ;(emp.sindicatosAdicionaisDetalhes||[]).forEach(item=>{if(String(item.nome||"").trim()===String(s.nome||"").trim())aplicar(item)})
  })
}
function salvarStatusSindicato(s,valor){
  if(!valor)return
  s.statusDataBase=valor
  if(valor==="Em dia")s.dataBaseEmDiaAno=anoCompetencia(); else delete s.dataBaseEmDiaAno
  sincronizarStatusSindicato(s)
}
function dataBaseReferencia(emp){
  const sind=(state.sindicatos||[]).find(s=>String(s.nome||"").trim()===String(emp.sindicato||"").trim())
  return (sind&&sind.dataBase)?sind.dataBase:(emp.dataBase||"")
}
function dataBaseNoMes(emp){
  const db=String(dataBaseReferencia(emp)||"").toLowerCase().trim()
  const mes=mesNome().toLowerCase()
  const mesNum=(comp().split("-")[1]||"")
  const mapa={"01":["jan","janeiro"],"02":["fev","fevereiro"],"03":["mar","março","marco"],"04":["abr","abril"],"05":["mai","maio"],"06":["jun","junho"],"07":["jul","julho"],"08":["ago","agosto"],"09":["set","setembro"],"10":["out","outubro"],"11":["nov","novembro"],"12":["dez","dezembro"]}
  return db.includes(mes) || (mapa[mesNum]||[]).some(x=>db.includes(x))
}
function mesDataBaseNumero(emp){
  const db=String(dataBaseReferencia(emp)||"").toLowerCase().trim()
  const mapa={1:["jan","janeiro"],2:["fev","fevereiro"],3:["mar","março","marco"],4:["abr","abril"],5:["mai","maio"],6:["jun","junho"],7:["jul","julho"],8:["ago","agosto"],9:["set","setembro"],10:["out","outubro"],11:["nov","novembro"],12:["dez","dezembro"]}
  for(const n in mapa){if(mapa[n].some(x=>db.includes(x)))return Number(n)}
  const num=parseInt(db); return isNaN(num)?0:num
}
function statusDB(emp){
  const fonte=sindicatoStatusReferencia(emp.sindicato)
  if(fonte)emp={...emp,statusDataBase:fonte.statusDataBase,dataBaseEmDiaAno:fonte.dataBaseEmDiaAno}
  const manual=emp.statusDataBase||"Em dia"

  // "Aguardando" é escolha manual da empresa e deve prevalecer.
  if(manual==="Aguardando")return "Aguardando"

  const mdb=mesDataBaseNumero(emp)
  const matual=Number((comp()||"").split("-")[1]||0)
  const anoAtual=anoCompetencia()
  const anoEmDia=Number(emp.dataBaseEmDiaAno||0)

  if(!mdb)return manual==="Vencida"?"Em dia":manual

  // Se a empresa foi marcada como "Em dia", mantém assim até virar o próximo ano.
  // Ex.: data-base janeiro/2026 saiu e foi marcada Em dia. Em fevereiro/2026 continua Em dia.
  // Só em 2027, ao passar do mês da data-base, volta a aparecer como Vencida se não for atualizada.
  if(manual==="Em dia"){
    if(anoEmDia && anoAtual<=anoEmDia)return "Em dia"
    if(!anoEmDia)return "Em dia"
  }

  if(mdb<matual)return "Vencida"
  return "Em dia"
}
function calendario(){const f=fechamento(); if(!f.calendario)f.calendario=calcCalendarioMes(comp()); const calc=calcCalendarioMes(comp()); ["uteis","sabados","domingos","feriados"].forEach(k=>{if(f.calendario[k]===""||f.calendario[k]===undefined||f.calendario[k]===null)f.calendario[k]=calc[k]}); return f.calendario}
function calcCalendarioMes(c){
  const [ano,mes]=String(c||"").split("-").map(Number)
  const out={uteis:0,sabados:0,domingos:0,feriados:0}
  if(!ano||!mes)return {uteis:"",sabados:"",domingos:"",feriados:""}
  const d=new Date(ano,mes-1,1)
  while(d.getMonth()===mes-1){
    const dia=d.getDay()
    if(dia===0)out.domingos++
    else if(dia===6)out.sabados++
    else out.uteis++
    d.setDate(d.getDate()+1)
  }
  return out
}
function competenciaAnterior(c){
  const [a,m]=String(c||"").split("-").map(Number)
  if(!a||!m)return ""
  const d=new Date(a,m-2,1)
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")
}
function updCalendario(campo,valor){calendario()[campo]=valor; aplicarEventosAutomaticos(); saved()}
function renderCalendario(){const c=calendario(); if(typeof calUteis!=="undefined"){calUteis.value=c.uteis??""; calSabados.value=c.sabados??""; calDomingos.value=c.domingos??""; calFeriados.value=c.feriados??""} if(typeof painelNotas!=="undefined")painelNotas.value=fechamento().notaPainel||""}
function updNotaPainel(v){fechamento().notaPainel=v; save()}
function comp(){return document.getElementById("comp1").value||SEED.competenciaBase}
function mesNome(){return ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][Number((comp()||"").split("-")[1])]||""}
function anoCompetencia(){return Number((comp()||"").split("-")[0]||new Date().getFullYear())}

