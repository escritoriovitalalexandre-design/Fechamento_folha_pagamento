function normalizarCompetenciaPrompt(valor){
  const v=String(valor||"").trim()
  if(/^\d{4}-\d{2}$/.test(v))return v
  return ""
}
function competenciaBasePrompt(){return comp()||SEED.competenciaBase||""}
function funcionarioInativoCadastro(fun){return !!(fun&&(fun.funcionarioInativo===true||fun.statusDetectado==="Inativo"))}
function funcionarioInativoNaCompetencia(fun,c){
  if(!funcionarioInativoCadastro(fun))return false
  const inicio=String(fun.inativoApartir||fun.inativaApartir||"").trim()
  if(inicio)return !c || c>=inicio
  return true
}
function funcionarioExcluidoNaCompetencia(fun,c){
  const inicioExclusao=String(fun?.excluidoApartir||"").trim()
  const inicioRestauracao=String(fun?.restauradoApartir||"").trim()
  return !!(inicioExclusao && (!c || c>=inicioExclusao) && (!inicioRestauracao || (c && c<inicioRestauracao)))
}
function funcionarioAtivoNaCompetencia(fun,c){
  if(!fun)return false
  if(funcionarioExcluidoNaCompetencia(fun,c))return false
  if(funcionarioInativoNaCompetencia(fun,c))return false
  return true
}
function funcionarioVisivelCadastro(fun,c,mostrarInativos,mostrarExcluidos){
  if(!fun)return false
  if(funcionarioExcluidoNaCompetencia(fun,c))return !!mostrarExcluidos
  if(funcionarioAtivoNaCompetencia(fun,c))return true
  return !!mostrarInativos && funcionarioInativoNaCompetencia(fun,c)
}
async function pedirCompetenciaInativacaoFuncionario(fun){
  const sugerida=String(fun?.inativoApartir||competenciaBasePrompt()||"")
  let inicio=await perguntar(`A partir de qual competência o funcionário ${fun?.codigo||""} - ${fun?.nome||""} ficará INATIVO?

Informe no formato AAAA-MM.
Exemplo: ${sugerida||"2026-05"}

Ele não aparecerá no fechamento mensal nem no relatório da competência informada em diante.
Competências anteriores serão preservadas.`,sugerida)
  if(inicio===null)return null
  inicio=normalizarCompetenciaPrompt(inicio)
  if(!inicio){aviso("Informe a competência no formato AAAA-MM. Exemplo: 2026-05.");return null}
  return inicio
}
async function aplicarStatusFuncionarioInativo(fun,novoStatus){
  if(novoStatus==="Inativo"){
    if(!normalizarCompetenciaPrompt(fun.inativoApartir)){
      const inicio=await pedirCompetenciaInativacaoFuncionario(fun)
      if(!inicio)return false
      fun.inativoApartir=inicio
    }
    fun.funcionarioInativo=true
    fun.statusDetectado="Inativo"
  }else{
    fun.funcionarioInativo=false
    delete fun.inativoApartir
    delete fun.inativaApartir
    fun.statusDetectado=novoStatus||"Ativo"
  }
  return true
}
function removerFuncionarioDosFechamentos(empCod,funCod,competenciaInicio){
  const chave=empCod+"|"+funCod
  Object.keys(state.fechamentos||{}).forEach(c=>{
    if(competenciaInicio && c<competenciaInicio)return
    const fe=state.fechamentos[c]
    if(fe&&fe.funcionarios&&fe.funcionarios[chave])delete fe.funcionarios[chave]
  })
}
function empresaInativaCadastro(e){return !!(e&&(e.clienteInativo===true||e.statusCliente==="Inativo"||e.statusCliente==="Cliente inativo"))}
function empresaInativaNaCompetencia(e,c){
  if(!empresaInativaCadastro(e))return false
  const inicio=String(e.inativoApartir||e.inativaApartir||"").trim()
  if(inicio)return !c || c>=inicio
  return true
}
function empresaExcluidaNaCompetencia(e,c){
  const inicioExclusao=String(e?.excluidoApartir||"").trim()
  const inicioRestauracao=String(e?.restauradoApartir||"").trim()
  return !!(inicioExclusao && (!c || c>=inicioExclusao) && (!inicioRestauracao || (c && c<inicioRestauracao)))
}
function empresaAtivaNaCompetencia(e,c){
  if(!e)return false
  if(empresaExcluidaNaCompetencia(e,c))return false
  if(empresaInativaNaCompetencia(e,c))return false
  return true
}
async function pedirCompetenciaInativacaoEmpresa(emp){
  const sugerida=String(emp?.inativoApartir||competenciaBasePrompt()||"")
  let inicio=await perguntar(`A partir de qual competência a empresa ${emp?.codigo||""} - ${emp?.nome||""} ficará INATIVA?

Informe no formato AAAA-MM.
Exemplo: ${sugerida||"2026-05"}

Ela não aparecerá no fechamento mensal, relatório de lançamento, painel nem nas listas operacionais da competência informada em diante.
Competências anteriores serão preservadas.`,sugerida)
  if(inicio===null)return null
  inicio=normalizarCompetenciaPrompt(inicio)
  if(!inicio){aviso("Informe a competência no formato AAAA-MM. Exemplo: 2026-05.");return null}
  return inicio
}
async function aplicarStatusEmpresaInativa(emp,novoStatus){
  if(novoStatus==="Inativo"){
    if(!normalizarCompetenciaPrompt(emp.inativoApartir)){
      const inicio=await pedirCompetenciaInativacaoEmpresa(emp)
      if(!inicio)return false
      emp.inativoApartir=inicio
    }
    emp.statusCliente="Inativo"
    emp.clienteInativo=true
  }else{
    emp.statusCliente="Ativo"
    emp.clienteInativo=false
    delete emp.inativoApartir
    delete emp.inativaApartir
  }
  return true
}
function empresasAtivas(){const c=comp(); return state.empresas.filter(e=>empresaAtivaNaCompetencia(e,c)&&(e.funcionarios||[]).some(f=>funcionarioAtivoNaCompetencia(f,c)))}
function empresasCadastroVisiveis(){
  // TRAVADO: na aba Empresas/Códigos, empresa nova ativa deve aparecer mesmo sem funcionário.
  // Inativas/excluídas só aparecem quando marcado; competências anteriores continuam preservadas.
  const c=comp()
  const mostrarTodos=!!document.getElementById("mostrarTodosClientesEmpresas")?.checked
  const mostrarExcluidas=!!document.getElementById("mostrarEmpresasExcluidas")?.checked
  const base=state.empresas.filter(e=>{
    if(empresaExcluidaNaCompetencia(e,c))return mostrarExcluidas
    if(empresaInativaNaCompetencia(e,c))return mostrarTodos
    return true
  })
  return [...base].sort((a,b)=>Number(a.codigo)-Number(b.codigo)||String(a.nome||"").localeCompare(String(b.nome||"")))
}
function empresasFuncionarioVisiveis(){
  // TRAVADO: para cadastrar funcionário, listar empresas ativas mesmo sem funcionário.
  // Empresas inativas/excluídas só entram se o usuário marcar o checkbox próprio desta aba.
  const c=comp()
  const mostrarInativas=!!document.getElementById("mostrarEmpresasInativasFuncionario")?.checked
  const mostrarExcluidas=!!document.getElementById("mostrarEmpresasExcluidasFuncionario")?.checked
  return state.empresas.filter(e=>{
    if(empresaExcluidaNaCompetencia(e,c))return mostrarExcluidas
    if(empresaInativaNaCompetencia(e,c))return mostrarInativas
    return true
  }).sort((a,b)=>Number(a.codigo)-Number(b.codigo)||String(a.nome||"").localeCompare(String(b.nome||"")))
}
function popularEmpresas(){
  const opts=['<option value="">Todas as empresas</option>'].concat(empresasAtivas().map(e=>`<option value="${esc(e.codigo)}">${esc(e.codigo)} - ${esc(e.nome)}</option>`)).join("")
  emp1.innerHTML=opts; emp2.innerHTML=opts; emp1.onchange=()=>renderAll(); emp2.onchange=()=>renderAll()
  const ev=document.getElementById("evEmp")
  if(ev){
    const atual=ev.value
    const listaCadastro=empresasCadastroVisiveis()
    ev.innerHTML=listaCadastro.map(e=>`<option value="${esc(e.codigo)}">${esc(e.codigo)} - ${esc(e.nome)}${empresaInativaCadastro(e)?" (INATIVO)":""}</option>`).join("")
    if(atual&&listaCadastro.some(e=>String(e.codigo)===String(atual)))ev.value=atual
  }
  popularEventosEmpresaSelect()
  popularSindicatos()
  popularFunSelects()
  renderSindicatos()
}
function empresaFiltroAtual(){
  const sec=document.querySelector(".section.active")?.id||"painel"
  if(sec==="painel")return emp1.value
  if(sec==="fechamento"||sec==="relatorio")return emp2.value||emp1.value
  return emp2.value||emp1.value
}
function empSelecionadas(){const v=empresaFiltroAtual(); return empresasAtivas().filter(e=>!v||e.codigo===v)}
function optsEventos(sel){return '<option value="">Selecione...</option>'+state.eventos.map(e=>{const v=labelEventoObj(e);return `<option value="${esc(v)}" ${v===sel?"selected":""}>${esc(v)}</option>`}).join("")}
function eventosEmpresa(empCod){const emp=state.empresas.find(e=>e.codigo===empCod); if(!emp)return []; if(!Array.isArray(emp.eventosPermitidos))emp.eventosPermitidos=[]; return emp.eventosPermitidos}
function optsEventosEmpresa(empCod,sel){
  let arr=[...eventosEmpresa(empCod)]
  if(sel&&sel.trim()&&!arr.includes(sel))arr=[sel,...arr]
  return '<option value="">Selecione...</option>'+arr.map(v=>`<option value="${esc(v)}" ${v===sel?"selected":""}>${esc(v)}</option>`).join("")
}
function popularEventosEmpresaSelect(){
  const sel=document.getElementById("evCodEmpresa")
  if(!sel)return
  sel.innerHTML=optsEventos("")
}
function popularEventosEmpresaSelectFormCad(){
  const sel=document.getElementById("empEvtVincSelect")
  if(!sel)return
  const codEmp=empresaEditando
  const emp=codEmp?state.empresas.find(e=>String(e.codigo)===String(codEmp)):null
  const vinculadosSet=new Set(emp?(emp.eventosPermitidos||[]):[])
  sel.innerHTML='<option value="">Selecionar evento...</option>'+state.eventos.filter(e=>!vinculadosSet.has(labelEventoObj(e))).map(e=>{const v=labelEventoObj(e);return `<option value="${esc(v)}">${esc(v)}</option>`}).join("")
}
