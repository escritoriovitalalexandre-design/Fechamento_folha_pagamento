function renderEmp(){
  // (TRAVADO) Cadastro Empresas/Códigos: usar lista própria para permitir exibir todos os clientes sem mexer no fechamento mensal.
  const busca=(document.getElementById("empBuscaLista")?.value||"").toLowerCase().trim()
  const competenciaAtual=comp()
  const lista=empresasCadastroVisiveis().filter(e=>{
    if(!busca)return true
    return [e.codigo,e.nome,e.cnpj||""].join(" ").toLowerCase().includes(busca)
  })
  tabEmp.innerHTML="<thead><tr><th>Cód.</th><th>Empresa</th><th>Cliente</th><th>Tipo</th><th>Sindicato</th><th>Vínculo</th><th>Data-base</th><th>Status data-base</th><th>Dissídio/Obs.</th><th>Códigos</th><th>Ação</th></tr></thead><tbody>"+lista.map((e)=>{
    const excluidaAgora=empresaExcluidaNaCompetencia(e,competenciaAtual)
    const inativaAgora=empresaInativaNaCompetencia(e,competenciaAtual)
    const statusCliente=excluidaAgora
      ? `Excluída${e.excluidoApartir?" desde "+fmtMesAnoCurto(e.excluidoApartir):""}${e.restauradoApartir?" até "+fmtMesAnoCurto(e.restauradoApartir):""}`
      : (inativaAgora?`Inativo${e.inativoApartir?" desde "+fmtMesAnoCurto(e.inativoApartir):""}`:"Ativo")
    const statusClass=excluidaAgora||inativaAgora?"red":"ok"
    const codSafe=String(e.codigo).replaceAll("'","\\'")
    const botoes=excluidaAgora
      ? `<button class="btn small green" onclick="restaurarEmpresaCadastro('${codSafe}')">Restaurar</button><button class="btn small out" onclick="carregarEmpresaCadastroPorCodigo('${codSafe}')">Editar</button>`
      : `<button class="btn small out" onclick="carregarEmpresaCadastroPorCodigo('${codSafe}')">Editar</button><button class="btn small red" onclick="excluirEmpresaCadastro('${codSafe}')">Excluir</button>`
    return `<tr><td><b>${esc(e.codigo)}</b></td><td>${esc(e.nome)}</td><td><span class="badge ${statusClass}">${esc(statusCliente)}</span></td><td>${esc(e.tipo||"")}</td><td>${esc(sindicatoPrincipalEAdicionais(e).join(" / ")||"")}</td><td><span class="${(e.vinculoSindicato||"Normal")==="Especial"?"badge-red-strong":""}">${esc(e.vinculoSindicato||"Normal")}</span></td><td>${esc(e.dataBase||"")}</td><td><span class="${dbClass(statusDB(e))}" style="padding:4px 10px;border-radius:12px">${esc(statusDB(e))}</span></td><td>${(e.contribuicaoSindicatoStatus||"OK")==="NAO"?'<span class="obs-sind-status nao">Não quer contribuir</span>':'<span class="obs-sind-status ok">OK</span>'} ${e.naoContribuiSindicatoObs?`<button class="tri-obs" title="${esc(e.naoContribuiSindicatoObs)}" onclick="alert('${esc(e.naoContribuiSindicatoObs).replaceAll("'","&#39;")}')">▲</button> `:""}${esc(e.dissidio||"")}</td><td>${(e.eventosPermitidos||[]).length}</td><td><div class="action-line">${botoes}</div></td></tr>`
  }).join("")+"</tbody>"
}
function removerEmpresaDosFechamentos(empCod,competenciaInicio){
  Object.keys(state.fechamentos||{}).forEach(c=>{
    if(competenciaInicio && c<competenciaInicio)return
    const fe=state.fechamentos[c]
    if(!fe||!fe.funcionarios)return
    Object.keys(fe.funcionarios).forEach(ch=>{if(String(ch).startsWith(String(empCod)+"|"))delete fe.funcionarios[ch]})
  })
}
function excluirEmpresaCadastro(codEmp){
  const emp=state.empresas.find(e=>String(e.codigo)===String(codEmp))
  if(!emp)return alert("Empresa não localizada.")
  const sugerida=comp()||SEED.competenciaBase
  const qtdFunc=(emp.funcionarios||[]).length
  let inicio=prompt(`Excluir/ocultar a empresa ${emp.codigo} - ${emp.nome} a partir de qual competência?

Informe no formato AAAA-MM.
Exemplo: ${sugerida}

A empresa será removida da competência informada em diante.
Competências anteriores serão preservadas.
Funcionários cadastrados nesta empresa: ${qtdFunc}.`,sugerida)
  if(inicio===null)return
  inicio=String(inicio).trim()
  if(!/^\d{4}-\d{2}$/.test(inicio))return alert("Informe a competência no formato AAAA-MM. Exemplo: 2026-04.")
  if(!confirm(`Confirmar exclusão/ocultação da empresa ${emp.codigo} - ${emp.nome} a partir de ${inicio}?

O sistema vai remover dos fechamentos de ${inicio} em diante.
Competências anteriores não serão alteradas.`))return
  emp.excluidoApartir=inicio
  delete emp.restauradoApartir
  removerEmpresaDosFechamentos(emp.codigo,inicio)
  if(empresaEditando&&String(empresaEditando)===String(emp.codigo))limparEmpresaForm()
  saved()
}

function restaurarEmpresaCadastro(codEmp){
  const emp=state.empresas.find(e=>String(e.codigo)===String(codEmp))
  if(!emp)return alert("Empresa não localizada.")
  if(!String(emp.excluidoApartir||"").trim())return alert("Esta empresa não está marcada como excluída.")
  const sugerida=comp()||SEED.competenciaBase
  let inicio=prompt(`A partir de qual competência deseja RESTAURAR a empresa ${emp.codigo} - ${emp.nome}?

Informe no formato AAAA-MM.
Exemplo: ${sugerida}

Ela voltará a aparecer da competência informada em diante.
As competências anteriores continuarão preservadas.`,sugerida)
  if(inicio===null)return
  inicio=String(inicio).trim()
  if(!/^\d{4}-\d{2}$/.test(inicio))return alert("Informe a competência no formato AAAA-MM. Exemplo: 2026-04.")
  if(!confirm(`Confirmar restauração da empresa ${emp.codigo} - ${emp.nome} a partir de ${inicio}?`))return
  emp.restauradoApartir=inicio
  saved()
}
function atualizarVisibilidadeCadastroFuncionario(){
  const box=document.getElementById("funCadastroDetalhes")
  if(box)box.style.display=document.getElementById("funEmpCad")?.value?"block":"none"
}
function popularFunSelects(){
  const lista=empresasFuncionarioVisiveis()
  const opts=lista.map(e=>`<option value="${esc(e.codigo)}">${esc(e.codigo)} - ${esc(e.nome)}${empresaInativaCadastro(e)?" (INATIVO)":""}</option>`).join("")
  ;["funEmpCad","funEmpFiltro"].forEach(id=>{const s=document.getElementById(id); if(s){const v=s.value; s.innerHTML=(id==="funEmpFiltro"?'<option value="">Todas</option>':'<option value="">Selecione a empresa...</option>')+opts; if(v&&lista.some(e=>String(e.codigo)===String(v)))s.value=v}})
  atualizarVisibilidadeCadastroFuncionario()
  const auto=document.getElementById("funAutoEvento"); if(auto){const v=auto.value; auto.innerHTML='<option value="">Sem automático</option>'+optsEventos(""); if(v)auto.value=v}
  const pad=document.getElementById("funEventoPadrao"); if(pad){const v=pad.value; pad.innerHTML=optsEventos(""); if(v)pad.value=v}
}
function renderFun(){
  popularFunSelects()
  const empF=document.getElementById("funEmpFiltro")?.value||""
  const b=(document.getElementById("funBusca")?.value||"").toLowerCase()
  const competenciaAtual=comp()
  const mostrarFuncInativos=!!document.getElementById("mostrarFuncionariosInativos")?.checked
  const mostrarFuncExcluidos=!!document.getElementById("mostrarFuncionariosExcluidos")?.checked
  let rows=[]; empresasFuncionarioVisiveis().forEach(e=>{if(empF&&String(e.codigo)!==String(empF))return; (e.funcionarios||[]).forEach(f=>{if(!funcionarioVisivelCadastro(f,competenciaAtual,mostrarFuncInativos,mostrarFuncExcluidos))return; const txt=[e.nome,e.codigo,f.nome,f.codigo,f.funcao,f.statusDetectado,(f.observacoes||[]).join(" ")].join(" ").toLowerCase(); if(b&&!txt.includes(b))return; rows.push({e,f})})})
  tabFun.innerHTML="<thead><tr><th>Empresa</th><th>Cód.</th><th>Funcionário</th><th>Função</th><th>Admissão</th><th class='fun-salario-col'>Salário</th><th>Status</th><th>Automático</th><th>Exclusão</th><th>Observações</th><th>Ação</th></tr></thead><tbody>"+rows.map(x=>{
    const empInativa=empresaInativaNaCompetencia(x.e,competenciaAtual)
    const empExcluida=empresaExcluidaNaCompetencia(x.e,competenciaAtual)
    const funInativo=funcionarioInativoNaCompetencia(x.f,competenciaAtual)
    const funExcluido=funcionarioExcluidoNaCompetencia(x.f,competenciaAtual)
    const empBadge=empExcluida?' <span class="badge red">Empresa excluída '+esc(fmtMesAnoCurto(x.e.excluidoApartir||''))+'</span>':(empInativa?' <span class="badge red">Empresa inativa '+esc(fmtMesAnoCurto(x.e.inativoApartir||''))+'</span>':'')
    const funBadge=funExcluido?' <span class="badge red">Excluído '+esc(fmtMesAnoCurto(x.f.excluidoApartir||''))+'</span>':(funInativo?' <span class="badge red">Inativo '+esc(fmtMesAnoCurto(x.f.inativoApartir||''))+'</span>':'')
    const excluirInfo=x.f.excluidoApartir?'<span class="badge red">Exclui a partir de '+esc(fmtMesAnoCurto(x.f.excluidoApartir))+'</span>'+(x.f.restauradoApartir?'<br><span class="badge ok">Restaura em '+esc(fmtMesAnoCurto(x.f.restauradoApartir))+'</span>':''):'-'
    const empCodSafe=String(x.e.codigo).replaceAll("'","\\'")
    const funCodSafe=String(x.f.codigo).replaceAll("'","\\'")
    const botoes=funExcluido
      ? `<button class="btn small green" onclick="restaurarFuncionarioCadastro('${empCodSafe}','${funCodSafe}')">Restaurar</button><button class="btn small out" onclick="carregarFuncionarioCadastro('${empCodSafe}','${funCodSafe}')">Editar</button>`
      : `<button class="btn small out" onclick="carregarFuncionarioCadastro('${empCodSafe}','${funCodSafe}')">Editar</button><button class="btn small red" onclick="excluirFuncionarioCadastro('${empCodSafe}','${funCodSafe}')">Excluir</button>`
    return `<tr><td>${esc(x.e.nome)}${empBadge}</td><td>${esc(x.f.codigo)}</td><td><b>${esc(x.f.nome)}</b></td><td>${esc(x.f.funcao)}</td><td>${esc(fmtDataBR(x.f.admissao||""))}</td><td class="fun-salario-col"><b>R$ ${money(x.f.salario)}</b></td><td>${esc(x.f.statusDetectado)}${funBadge}</td><td>${(x.f.autoEventos||[]).map(a=>esc(a.evento+" x "+a.qtd)).join("<br>")}</td><td>${excluirInfo}</td><td>${esc((x.f.observacoes||[]).join(" | "))}</td><td><div class="action-line">${botoes}</div></td></tr>`
  }).join("")+"</tbody>"
}
function excluirFuncionarioCadastro(empCod,funCod){
  const emp=state.empresas.find(e=>String(e.codigo)===String(empCod))
  if(!emp)return alert("Empresa não localizada.")
  const f=(emp.funcionarios||[]).find(f=>String(f.codigo)===String(funCod))
  if(!f)return alert("Funcionário não localizado.")
  const sugerida=comp()||SEED.competenciaBase
  let inicio=prompt(`A partir de qual competência deseja excluir o funcionário ${f.codigo} - ${f.nome}?

Informe no formato AAAA-MM.
Exemplo: ${sugerida}

As competências anteriores a esse mês serão preservadas.`,sugerida)
  if(inicio===null)return
  inicio=String(inicio).trim()
  if(!/^\d{4}-\d{2}$/.test(inicio))return alert("Informe a competência no formato AAAA-MM. Exemplo: 2026-04.")
  if(!confirm(`Confirmar exclusão do funcionário ${f.codigo} - ${f.nome} a partir de ${inicio}?

O sistema vai remover dos fechamentos de ${inicio} em diante.
Competências anteriores não serão alteradas.`))return
  f.excluidoApartir=inicio
  delete f.restauradoApartir
  removerFuncionarioDosFechamentos(emp.codigo,funCod,inicio)
  if(funcionarioEditando&&String(funcionarioEditando.empCod)===String(emp.codigo)&&String(funcionarioEditando.funCod)===String(funCod))limparFuncionarioForm()
  saved()
}

function restaurarFuncionarioCadastro(empCod,funCod){
  const emp=state.empresas.find(e=>String(e.codigo)===String(empCod))
  if(!emp)return alert("Empresa não localizada.")
  const f=(emp.funcionarios||[]).find(f=>String(f.codigo)===String(funCod))
  if(!f)return alert("Funcionário não localizado.")
  if(!String(f.excluidoApartir||"").trim())return alert("Este funcionário não está marcado como excluído.")
  const sugerida=comp()||SEED.competenciaBase
  let inicio=prompt(`A partir de qual competência deseja RESTAURAR o funcionário ${f.codigo} - ${f.nome}?

Informe no formato AAAA-MM.
Exemplo: ${sugerida}

Ele voltará a aparecer da competência informada em diante.
As competências anteriores continuarão preservadas.`,sugerida)
  if(inicio===null)return
  inicio=String(inicio).trim()
  if(!/^\d{4}-\d{2}$/.test(inicio))return alert("Informe a competência no formato AAAA-MM. Exemplo: 2026-04.")
  if(!confirm(`Confirmar restauração do funcionário ${f.codigo} - ${f.nome} a partir de ${inicio}?`))return
  f.restauradoApartir=inicio
  saved()
}
