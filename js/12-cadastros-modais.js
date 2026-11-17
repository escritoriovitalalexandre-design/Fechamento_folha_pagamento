function renderAutoTemp(){
  const box=document.getElementById("funAutoLista")
  if(box)box.innerHTML=funAutoTemp.length?funAutoTemp.map((a,i)=>`<div class="action-line"><b>${esc(a.evento)}</b><span>${esc(a.qtd)} por dia útil</span><span>${a.inicio? "Início: "+esc(fmtMesRefLocal(a.inicio)):""}</span><span>${a.fim? "Fim: "+esc(fmtMesRefLocal(a.fim)):""}</span><button class="btn small out" onclick="editarAutoEventoTemp(${i})">Alterar</button><button class="btn small red" onclick="if(confirm('Excluir este evento automático?')){funAutoTemp.splice(${i},1);funAutoEditIndex=null;renderAutoTemp()}">Excluir</button></div>`).join(""):"Nenhum evento automático vinculado."
  const bx=document.getElementById("funEventoLista")
  if(bx)bx.innerHTML=funEventoTemp.length?funEventoTemp.map((a,i)=>`<div class="action-line"><b>${esc(a.desc)}</b><span>${esc(a.valor||"")}</span><span>${a.inicio? "Início: "+esc(fmtMesRefLocal(a.inicio)):""}</span><span>${a.fim? "Fim: "+esc(fmtMesRefLocal(a.fim)):""}</span><span>${esc(a.obs||"")}</span><button class="btn small out" onclick="editarEventoPadraoTemp(${i})">Alterar</button><button class="btn small red" onclick="if(confirm('Excluir este evento padrão do funcionário?')){funEventoTemp.splice(${i},1);funEventoEditIndex=null;renderAutoTemp()}">Excluir</button></div>`).join(""):"Nenhum evento padrão vinculado."
}
function addAutoEventoTemp(){
  if(!funAutoEvento.value||!funAutoQtd.value)return alert("Informe evento e quantidade.")
  const obj={evento:funAutoEvento.value,qtd:funAutoQtd.value,inicio:(document.getElementById("funAutoInicio")?.value||""),fim:(document.getElementById("funAutoFim")?.value||"")}
  if(funAutoEditIndex!==null){
    if(!confirm("Salvar alteração deste evento automático do funcionário?"))return
    funAutoTemp[funAutoEditIndex]=obj
    funAutoEditIndex=null
  }else{
    const idx=funAutoTemp.findIndex(a=>a.evento===obj.evento)
    if(idx>=0){
      if(!confirm("Este evento automático já existe para o funcionário. Deseja alterar o cadastro existente?"))return
      funAutoTemp[idx]=obj
    }else{
      if(!confirm("Cadastrar este evento automático no funcionário?"))return
      funAutoTemp.push(obj)
    }
  }
  funAutoEvento.value=""; funAutoQtd.value=""; if(document.getElementById("funAutoInicio"))funAutoInicio.value=""; if(document.getElementById("funAutoFim"))funAutoFim.value=""; renderAutoTemp()
}
function editarAutoEventoTemp(i){
  const ev=funAutoTemp[i]; if(!ev)return
  funAutoEditIndex=i
  funAutoEvento.value=ev.evento||""; funAutoQtd.value=ev.qtd||""; if(document.getElementById("funAutoInicio"))funAutoInicio.value=ev.inicio||""; if(document.getElementById("funAutoFim"))funAutoFim.value=ev.fim||""
}
function periodosEventosSobrepostos(a,b){
  return (!a.fim||!b.inicio||a.fim>=b.inicio)&&(!b.fim||!a.inicio||b.fim>=a.inicio)
}
function addEventoPadraoTemp(){
  if(!funEventoPadrao.value)return alert("Selecione o evento padrão.")
  const obj={desc:funEventoPadrao.value,valor:valorPadrao(funEventoValor.value||""),obs:funEventoObs.value||"",inicio:funEventoInicio.value||"",fim:funEventoFim.value||"",status:"Pendente"}
  if(funEventoEditIndex!==null){
    if(!confirm("Salvar alteração deste evento padrão do funcionário?"))return
    funEventoTemp[funEventoEditIndex]=obj
    funEventoEditIndex=null
  }else{
    if(obj.inicio&&obj.fim&&obj.inicio>obj.fim)return alert("O início não pode ser posterior ao fim.")
    if(funEventoTemp.some(a=>a.desc===obj.desc&&periodosEventosSobrepostos(a,obj)))return alert("Já existe este evento padrão em um período sobreposto. Use Alterar para editar o período anterior.")
    if(!confirm("Cadastrar este evento padrão no funcionário?"))return
    funEventoTemp.push(obj)
  }
  funEventoPadrao.value=""; funEventoValor.value=""; funEventoObs.value=""; funEventoInicio.value=""; funEventoFim.value=""; renderAutoTemp()
}
function editarEventoPadraoTemp(i){
  const ev=funEventoTemp[i]; if(!ev)return
  funEventoEditIndex=i
  funEventoPadrao.value=ev.desc||""; funEventoValor.value=ev.valor||""; funEventoObs.value=ev.obs||""; funEventoInicio.value=ev.inicio||""; funEventoFim.value=ev.fim||""
}
function limparFuncionarioForm(){
  funcionarioEditando=null
  if(typeof funcionarioFormModo!=="undefined")funcionarioFormModo.textContent="Novo cadastro"
  if(typeof funcionarioFormCard!=="undefined")funcionarioFormCard.classList.remove("editing")
  funCodCad.value=funNomeCad.value=funFuncaoCad.value=funSalCad.value=funObsCad.value=funAutoQtd.value=""
  funAutoEvento.value=""; if(document.getElementById("funAutoInicio"))funAutoInicio.value=""; if(document.getElementById("funAutoFim"))funAutoFim.value=""; funEventoPadrao.value=""; funEventoValor.value=""; funEventoObs.value=""; funEventoInicio.value=""; funEventoFim.value=""; if(document.getElementById("funStatusCad"))funStatusCad.value="Ativo"
  funAutoTemp=[]; funEventoTemp=[]; funEventoEditIndex=null; funAutoEditIndex=null; renderAutoTemp()
}
function cancelarFuncionarioCadastro(){
  if((funAutoTemp.length||funEventoTemp.length||funCodCad.value||funNomeCad.value)&&!confirm("Cancelar a inclusão/alteração do funcionário e limpar os itens?"))return
  funcionarioEditando=null
  if(typeof funcionarioFormModo!=="undefined")funcionarioFormModo.textContent="Novo cadastro"
  if(typeof funcionarioFormCard!=="undefined")funcionarioFormCard.classList.remove("editing")
  funCodCad.value=funNomeCad.value=funFuncaoCad.value=funSalCad.value=funObsCad.value=funAutoQtd.value=""
  funAutoEvento.value=""; if(document.getElementById("funAutoInicio"))funAutoInicio.value=""; if(document.getElementById("funAutoFim"))funAutoFim.value=""; funEventoPadrao.value=""; funEventoValor.value=""; funEventoObs.value=""; funEventoInicio.value=""; funEventoFim.value=""; funEventoInicio.value=""; funEventoFim.value=""
  funAutoTemp=[]; funEventoTemp=[]; funEventoEditIndex=null; funAutoEditIndex=null; renderAutoTemp()
}

function limparEmpresaForm(){
  empCodCad.value=empNomeCad.value=empTipoCad.value=empSindCad.value=empDbCad.value=empDissCad.value=""
  empresaNaoContribuiSindicatoObsTemp=""
  if(document.getElementById("empContribSindStatusCad"))empContribSindStatusCad.value="OK"
  atualizarTriObsNaoContribuiSindicato()
  if(document.getElementById("empClienteStatusCad"))empClienteStatusCad.value="Ativo"
  if(document.getElementById("empMultiSindCad"))empMultiSindCad.checked=false
  empSindicatosAdicTemp=[]; toggleMultiSindCad(); renderCadSindicatosAdic()
  empVinculoSindCad.value="Normal"; empDbStatusCad.value="Em dia"; empDbStatusCad.className=dbClass("Em dia")
  empresaEditando=null
  if(typeof empresaFormModo!=="undefined")empresaFormModo.textContent="Novo cadastro"
  const body=document.getElementById("empEvtVincBody")
  if(body)body.innerHTML='<tr><td colspan="4" style="padding:10px;color:var(--muted);font-size:13px">Carregue uma empresa para gerenciar os eventos vinculados.</td></tr>'
  const sel=document.getElementById("empEvtVincSelect")
  if(sel)sel.innerHTML='<option value="">Selecionar evento...</option>'
  // sem destaque visual no card inteiro da empresa
}
function salvarEmpresaCadastro(){
  const cod=empCodCad.value.trim()
  if(!cod)return alert("Informe o código da empresa.")

  // Ao editar, localizar a empresa pelo código original salvo em empresaEditando,
  // e não pelo índice. Isso evita abrir/salvar a empresa errada quando outra empresa foi excluída/ocultada.
  let emp=null
  if(empresaEditando!==null){
    emp=state.empresas.find(e=>String(e.codigo)===String(empresaEditando))
  }
  if(!emp){
    emp=state.empresas.find(e=>String(e.codigo)===String(cod))
  }

  const jaExisteOutro=state.empresas.some(e=>e!==emp && String(e.codigo)===String(cod))
  if(jaExisteOutro)return alert("Já existe outra empresa cadastrada com este código.")

  if(!confirm((emp?"Salvar alterações da":"Cadastrar nova")+" empresa?"))return
  if(!emp){emp={codigo:cod,nome:"",tipo:"",statusCliente:"Ativo",clienteInativo:false,sindicato:"",vinculoSindicato:"Normal",dataBase:"",statusDataBase:"Em dia",dissidio:"",dataBaseObs:"",naoContribuiSindicatoObs:"",contribuicaoSindicatoStatus:"OK",possuiMaisDeUmSindicato:false,sindicatosAdicionais:[],funcionarios:[],eventosPermitidos:[]}; state.empresas.push(emp)}
  emp.codigo=cod; emp.nome=empNomeCad.value.trim(); emp.tipo=empTipoCad.value.trim(); const novoStatusEmpresa=(document.getElementById("empClienteStatusCad")?.value||"Ativo"); if(!aplicarStatusEmpresaInativa(emp,novoStatusEmpresa))return; emp.sindicato=empSindCad.value.trim(); emp.vinculoSindicato=empVinculoSindCad.value; emp.dataBase=normalizarMesExtenso(empDbCad.value); emp.statusDataBase=empDbStatusCad.value; if(emp.statusDataBase==="Em dia")emp.dataBaseEmDiaAno=anoCompetencia(); else if(emp.statusDataBase==="Aguardando")delete emp.dataBaseEmDiaAno; emp.dissidio=empDissCad.value.trim(); emp.contribuicaoSindicatoStatus=(document.getElementById("empContribSindStatusCad")?.value||"OK"); emp.naoContribuiSindicatoObs=empresaNaoContribuiSindicatoObsTemp; emp.possuiMaisDeUmSindicato=!!document.getElementById("empMultiSindCad")?.checked; emp.sindicatosAdicionaisDetalhes=emp.possuiMaisDeUmSindicato?normalizarListaSindicatosAdic(empSindicatosAdicTemp,emp.sindicato):[]; emp.sindicatosAdicionais=emp.sindicatosAdicionaisDetalhes.map(x=>x.nome)
  state.empresas.sort((a,b)=>Number(a.codigo)-Number(b.codigo)||a.nome.localeCompare(b.nome))
  limparEmpresaForm()
  saved()
}
function carregarEmpresaCadastro(i){
  // Compatibilidade com versões antigas: se receber índice, converte para código da empresa no state original.
  const e=state.empresas[i]
  if(e)return carregarEmpresaCadastroPorCodigo(e.codigo)
}
function carregarEmpresaCadastroPorCodigo(codEmp){
  const e=state.empresas.find(emp=>String(emp.codigo)===String(codEmp))
  if(!e)return alert("Empresa não localizada para edição.")
  empresaEditando=e.codigo
  // FIX v2.4: abre modal com HTML próprio — sem clonar o form, sem IDs duplicados
  abrirModalEmpresa(e)
}
function abrirModalEmpresa(e){
  const body=document.getElementById("modalEmpresaBody")
  const modal=document.getElementById("modalEmpresa")
  if(!body||!modal)return
  const optsSind='<option value="">Selecione...</option>'+(state.sindicatos||[]).map(s=>`<option value="${esc(s.nome)}"${s.nome===(e.sindicato||"")?' selected':""}>${esc(s.nome)}</option>`).join("")
  meSindicatosAdicTemp=sindicatoAdicionalDetalhesNormalizados(e)
  const vinculados=e.eventosPermitidos||[]
  const vinSet=new Set(vinculados)
  const optsEvt='<option value="">Selecionar evento...</option>'+state.eventos.filter(ev=>!vinSet.has(labelEventoObj(ev))).map(ev=>{const v=labelEventoObj(ev);return `<option value="${esc(v)}">${esc(v)}</option>`}).join("")
  const rowsVinc=vinculados.length?vinculados.map((lbl,idx)=>{const p=parseEventoLabel(lbl);if(!p)return"";const ev=state.eventos.find(x=>x.codigo===p.codigo);return`<tr style="border-bottom:1px solid #edf1f7"><td style="padding:6px 10px;color:var(--muted);width:70px">${esc(p.codigo)}</td><td style="padding:6px 10px;font-weight:700">${esc(p.descricao||lbl)}</td><td style="padding:6px 10px;width:90px"><span style="font-size:11px;background:#f1f5f9;color:var(--muted);padding:2px 7px;border-radius:999px">${esc(ev?.tipo||"Valor")}</span></td><td style="padding:6px 10px;width:80px;text-align:center"><button class="btn small red" onclick="mEmpRemoverEvento(${idx})">Remover</button></td></tr>`}).join(""):'<tr><td colspan="4" style="padding:10px;color:var(--muted)">Nenhum evento vinculado.</td></tr>'
  const obsLabel=empresaNaoContribuiSindicatoObsTemp?'Anotação ▲':'Anotação'
  body.innerHTML=`
<div class="row">
  <div class="emp-cod"><label>Código</label><input id="meCod" value="${esc(e.codigo)}"></div>
  <div class="emp-nome me-nome-largo"><label>Nome</label><input id="meNome" value="${esc(e.nome||"")}"></div>
  <div class="emp-small"><label>Tipo</label><select id="meTipo"><option value="">Selecione...</option><option${e.tipo==="MEI"?" selected":""}>MEI</option><option${e.tipo==="Doméstica"?" selected":""}>Doméstica</option><option${e.tipo==="Simples"?" selected":""}>Simples</option><option${e.tipo==="Lucro Presumido"?" selected":""}>Lucro Presumido</option><option${e.tipo==="Lucro Real"?" selected":""}>Lucro Real</option><option${e.tipo==="Outro"?" selected":""}>Outro</option></select></div>
</div>
<div class="row" style="margin-top:8px">
  <div class="emp-sind"><label>Sindicato</label><select id="meSind" onchange="mEmpAplicarSind()">${optsSind}</select></div>
  <div class="emp-small"><label>Vínculo</label><select id="meVinculo"><option${(e.vinculoSindicato||"Normal")==="Normal"?" selected":""}>Normal</option><option${e.vinculoSindicato==="Especial"?" selected":""}>Especial</option></select></div>
  <div class="emp-small"><label>Data-base</label><select id="meDb">${mesesOptions(e.dataBase||"")}</select></div>
  <div class="emp-small"><label>Status data-base</label><select id="meDbStatus" onchange="this.className=dbClass(this.value)" class="${dbClass(e.statusDataBase||'Em dia')}"><option${(e.statusDataBase||"Em dia")==="Em dia"?" selected":""}>Em dia</option><option${e.statusDataBase==="Aguardando"?" selected":""}>Aguardando</option></select></div>
  <div class="emp-nome"><label>Dissídio/observação</label><input id="meDiss" value="${esc(e.dissidio||"")}"></div>
</div>
<div class="row" style="margin-top:8px">
  <div class="emp-small"><label>Contribuição sindicato</label><select id="meContrib"><option value="OK"${(e.contribuicaoSindicatoStatus||"OK")==="OK"?" selected":""}>OK - quer contribuir</option><option value="NAO"${e.contribuicaoSindicatoStatus==="NAO"?" selected":""}>Não quer contribuir</option></select></div>
  <div class="emp-small"><label>Anotação sindicato</label><button type="button" id="meObsBtn" class="btn out obs-sind-btn" onclick="mEmpAnotacao()">${obsLabel}</button></div>
  <div class="emp-small"><label>Cliente</label><select id="meCliente"><option value="Ativo"${!empresaInativaCadastro(e)?" selected":""}>Ativo</option><option value="Inativo"${empresaInativaCadastro(e)?" selected":""}>Inativo</option></select></div>
  <div class="emp-small"><label>Possui mais de um sindicato?</label><div style="height:38px;display:flex;align-items:center;gap:8px"><input id="meMultiSind" type="checkbox" style="width:auto" ${(e.possuiMaisDeUmSindicato||((e.sindicatosAdicionais||[]).length))?"checked":""} onchange="document.getElementById('meSindicatosAdicBox').classList.toggle('hidden',!this.checked); if(this.checked)renderModalSindicatosAdic()"><span class="muted">Sim</span></div></div>
  <div class="sind-adic-box ${((e.possuiMaisDeUmSindicato||((e.sindicatosAdicionais||[]).length)||((e.sindicatosAdicionaisDetalhes||[]).length)))?"":"hidden"}" id="meSindicatosAdicBox">
    <div class="sind-adic-head"><b style="color:var(--pri)">Sindicatos adicionais</b><button type="button" class="btn small pri" onclick="mEmpSindAdicAdd()">+ Adicionar sindicato</button></div>
    <table class="sind-adic-table"><thead><tr><th>Sindicato</th><th>Data-base</th><th>Status</th><th>Dissídio/observação</th><th>Ação</th></tr></thead><tbody id="meSindicatosAdicBody"></tbody></table>
  </div>
  <div class="emp-small"><label>&nbsp;</label><button class="btn pri" onclick="mEmpSalvar()">💾 Salvar empresa</button></div>
  <div class="emp-small"><label>&nbsp;</label><button class="btn out" onclick="fecharModalEmpresa()">Cancelar</button></div>
</div>
<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <b style="color:var(--pri);font-size:14px">🏷️ Eventos vinculados à empresa</b>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select id="meEvtSel" style="font-size:13px;min-width:200px">${optsEvt}</select>
      <button class="btn small pri" onclick="mEmpVincular()">+ Vincular</button>
      <button class="btn small out" onclick="mEmpSugerir()">Sugerir pelos funcionários</button>
    </div>
  </div>
  <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">Cód.</th><th style="text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">Descrição</th><th style="text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">Tipo</th><th style="border-bottom:1px solid var(--line)"></th></tr></thead>
      <tbody id="meEvtBody">${rowsVinc}</tbody>
    </table>
  </div>
</div>`
  modal.classList.add("open")
  document.body.classList.add("modal-aberto")
  renderModalSindicatosAdic()
}
function fecharModalEmpresa(){
  document.getElementById("modalEmpresa")?.classList.remove("open")
  document.body.classList.remove("modal-aberto")
  limparEmpresaForm()
}
function mEmpAplicarSind(){
  const nome=document.getElementById("meSind")?.value
  const s=(state.sindicatos||[]).find(x=>x.nome===nome); if(!s)return
  const db=document.getElementById("meDb"); if(db)db.value=normalizarMesExtenso(s.dataBase||"")
  const diss=document.getElementById("meDiss"); if(diss)diss.value=s.obs||""
  const vinc=document.getElementById("meVinculo"); if(vinc)vinc.value=(s.beneficio==="Especial")?"Especial":"Normal"
  renderModalSindicatosAdic()
}
function mEmpAnotacao(){
  const atual=empresaNaoContribuiSindicatoObsTemp||""
  const txt=prompt("Anotação — empresa não vai contribuir com sindicato:\n\nEscreva a observação ou deixe em branco para apagar.",atual)
  if(txt===null)return
  empresaNaoContribuiSindicatoObsTemp=String(txt||"").trim()
  const btn=document.getElementById("meObsBtn"); if(btn)btn.textContent=empresaNaoContribuiSindicatoObsTemp?"Anotação ▲":"Anotação"
}
function mEmpRenderEventos(){
  const e=state.empresas.find(emp=>String(emp.codigo)===String(empresaEditando)); if(!e){const body=document.getElementById("meEvtBody"); if(body)body.innerHTML='<tr><td colspan="4" style="padding:10px;color:var(--muted)">Salve a empresa para gerenciar eventos vinculados.</td></tr>'; return}
  const vinculados=e.eventosPermitidos||[]
  const vinSet=new Set(vinculados)
  const body=document.getElementById("meEvtBody")
  if(body)body.innerHTML=vinculados.length?vinculados.map((lbl,idx)=>{const p=parseEventoLabel(lbl);if(!p)return"";const ev=state.eventos.find(x=>x.codigo===p.codigo);return`<tr style="border-bottom:1px solid #edf1f7"><td style="padding:6px 10px;color:var(--muted);width:70px">${esc(p.codigo)}</td><td style="padding:6px 10px;font-weight:700">${esc(p.descricao||lbl)}</td><td style="padding:6px 10px;width:90px"><span style="font-size:11px;background:#f1f5f9;color:var(--muted);padding:2px 7px;border-radius:999px">${esc(ev?.tipo||"Valor")}</span></td><td style="padding:6px 10px;width:80px;text-align:center"><button class="btn small red" onclick="mEmpRemoverEvento(${idx})">Remover</button></td></tr>`}).join(""):'<tr><td colspan="4" style="padding:10px;color:var(--muted)">Nenhum evento vinculado.</td></tr>'
  const sel=document.getElementById("meEvtSel")
  if(sel)sel.innerHTML='<option value="">Selecionar evento...</option>'+state.eventos.filter(ev=>!vinSet.has(labelEventoObj(ev))).map(ev=>{const v=labelEventoObj(ev);return`<option value="${esc(v)}">${esc(v)}</option>`}).join("")
}
function mEmpVincular(){
  const label=document.getElementById("meEvtSel")?.value; if(!label)return alert("Selecione um evento.")
  const e=state.empresas.find(emp=>String(emp.codigo)===String(empresaEditando)); if(!e)return alert("Salve a empresa antes de vincular eventos.")
  if(!Array.isArray(e.eventosPermitidos))e.eventosPermitidos=[]
  if(e.eventosPermitidos.includes(label))return alert("Este evento já está vinculado.")
  e.eventosPermitidos.push(label)
  e.eventosPermitidos.sort((a,b)=>Number((a.match(/^\d+/)||[999999])[0])-Number((b.match(/^\d+/)||[999999])[0])||a.localeCompare(b))
  save(); mEmpRenderEventos(); renderEventosEmpresa(); renderEmpEvtVincFormCad()
}
function mEmpRemoverEvento(idx){
  const e=state.empresas.find(emp=>String(emp.codigo)===String(empresaEditando)); if(!e)return
  if(!confirm("Desvincular este evento da empresa?"))return
  e.eventosPermitidos.splice(idx,1)
  salvarAgora(); mEmpRenderEventos(); renderEventosEmpresa(); renderEmpEvtVincFormCad(); renderEmp()
}
function mEmpSugerir(){
  const e=state.empresas.find(emp=>String(emp.codigo)===String(empresaEditando)); if(!e)return
  const set=new Set(e.eventosPermitidos||[])
  ;(e.funcionarios||[]).forEach(f=>(f.eventos||[]).forEach(ev=>{const p=parseEventoLabel(ev.desc);if(p)set.add(`${p.codigo} - ${p.descricao}`)}))
  e.eventosPermitidos=[...set].sort((a,b)=>Number((a.match(/^\d+/)||[999999])[0])-Number((b.match(/^\d+/)||[999999])[0])||a.localeCompare(b))
  save(); mEmpRenderEventos(); renderEventosEmpresa(); renderEmpEvtVincFormCad()
  alert("Eventos sugeridos adicionados com base nos funcionários desta empresa.")
}
function mEmpSalvar(){
  const codNovo=(document.getElementById("meCod")?.value||"").trim()
  if(!codNovo)return alert("Informe o código da empresa.")
  let emp=state.empresas.find(e=>String(e.codigo)===String(empresaEditando))
  const novo=!emp
  if(state.empresas.some(e=>e!==emp&&String(e.codigo)===String(codNovo)))return alert("Já existe outra empresa com este código.")
  if(!confirm((novo?"Cadastrar nova":"Salvar alterações da")+" empresa?"))return
  if(novo){
    emp={codigo:codNovo,nome:"",tipo:"",statusCliente:"Ativo",clienteInativo:false,sindicato:"",vinculoSindicato:"Normal",dataBase:"",statusDataBase:"Em dia",dissidio:"",dataBaseObs:"",naoContribuiSindicatoObs:"",contribuicaoSindicatoStatus:"OK",possuiMaisDeUmSindicato:false,sindicatosAdicionais:[],sindicatosAdicionaisDetalhes:[],funcionarios:[],eventosPermitidos:[]}
    state.empresas.push(emp)
  }
  emp.codigo=codNovo
  emp.nome=(document.getElementById("meNome")?.value||"").trim()
  emp.tipo=document.getElementById("meTipo")?.value||""
  const novoStatusEmpresa=document.getElementById("meCliente")?.value||"Ativo"
  if(!aplicarStatusEmpresaInativa(emp,novoStatusEmpresa))return
  emp.sindicato=(document.getElementById("meSind")?.value||"").trim()
  emp.vinculoSindicato=document.getElementById("meVinculo")?.value||"Normal"
  emp.dataBase=normalizarMesExtenso(document.getElementById("meDb")?.value||"")
  emp.statusDataBase=document.getElementById("meDbStatus")?.value||"Em dia"
  if(emp.statusDataBase==="Em dia")emp.dataBaseEmDiaAno=anoCompetencia()
  else if(emp.statusDataBase==="Aguardando")delete emp.dataBaseEmDiaAno
  emp.dissidio=(document.getElementById("meDiss")?.value||"").trim()
  emp.contribuicaoSindicatoStatus=document.getElementById("meContrib")?.value||"OK"
  emp.naoContribuiSindicatoObs=empresaNaoContribuiSindicatoObsTemp
  emp.possuiMaisDeUmSindicato=!!document.getElementById("meMultiSind")?.checked
  emp.sindicatosAdicionaisDetalhes=emp.possuiMaisDeUmSindicato?normalizarListaSindicatosAdic(meSindicatosAdicTemp,emp.sindicato):[]
  emp.sindicatosAdicionais=emp.sindicatosAdicionaisDetalhes.map(x=>x.nome)
  if(!Array.isArray(emp.funcionarios))emp.funcionarios=[]
  if(!Array.isArray(emp.eventosPermitidos))emp.eventosPermitidos=[]
  state.empresas.sort((a,b)=>Number(a.codigo)-Number(b.codigo)||a.nome.localeCompare(b.nome))
  empresaEditando=emp.codigo
  fecharModalEmpresa()
  saved()
}
function cancelarEmpresaCadastro(){if((empCodCad.value||empNomeCad.value)&&!confirm("Cancelar edição/cadastro da empresa?"))return; limparEmpresaForm()}
function salvarFuncionarioCadastro(){
  const empCod=funEmpCad.value, cod=funCodCad.value.trim()
  if(!empCod||!cod)return alert("Informe empresa e código do funcionário.")
  const emp=state.empresas.find(e=>e.codigo===empCod); if(!emp)return

  // Se houver evento preenchido na tela e ele estiver em modo ALTERAÇÃO, atualiza o item editado.
  // Assim, mudar o fim de Ago/2026 para Mai/2026 altera o lançamento existente, sem criar outro 9750.
  if(funEventoPadrao.value){
    const obj={desc:funEventoPadrao.value,valor:valorPadrao(funEventoValor.value||""),obs:funEventoObs.value||"",inicio:funEventoInicio.value||"",fim:funEventoFim.value||"",status:"Pendente"}
    if(funEventoEditIndex!==null && funEventoTemp[funEventoEditIndex]){
      funEventoTemp[funEventoEditIndex]=obj
      funEventoEditIndex=null
    }else if(confirm("Existe um evento padrão preenchido que ainda não foi adicionado. Deseja incluir antes de salvar?")){
      if(obj.inicio&&obj.fim&&obj.inicio>obj.fim)return alert("O início não pode ser posterior ao fim.")
      if(funEventoTemp.some(a=>a.desc===obj.desc&&periodosEventosSobrepostos(a,obj)))return alert("Este evento padrão já existe em um período sobreposto. Use Alterar para editar o período anterior.")
      funEventoTemp.push(obj)
    }
  }
  if(funAutoEvento.value&&funAutoQtd.value){
    const obj={evento:funAutoEvento.value,qtd:funAutoQtd.value,inicio:(document.getElementById("funAutoInicio")?.value||""),fim:(document.getElementById("funAutoFim")?.value||"")}
    if(funAutoEditIndex!==null && funAutoTemp[funAutoEditIndex]){
      funAutoTemp[funAutoEditIndex]=obj
      funAutoEditIndex=null
    }else if(confirm("Existe um evento automático preenchido que ainda não foi adicionado. Deseja incluir antes de salvar?")){
      const idx=funAutoTemp.findIndex(a=>a.evento===obj.evento)
      if(idx>=0)funAutoTemp[idx]=obj
      else funAutoTemp.push(obj)
    }
  }
  // Preserva todos os períodos do mesmo evento padrão ao salvar o funcionário.
  funAutoTemp=normalizarTempPorChave(funAutoTemp,"evento")

  let f=emp.funcionarios.find(x=>x.codigo===cod)
  const novo=!f
  if(!confirm((novo?"Cadastrar":"Salvar alterações deste")+" funcionário?"))return
  if(!f){f={codigo:cod,nome:"",funcao:"",salario:"",statusDetectado:"Ativo",observacoes:[],eventos:[],autoEventos:[]}; emp.funcionarios.push(f)}
  funSalCad.value=formatMoneyInput(funSalCad.value); f.nome=funNomeCad.value.trim(); f.funcao=funFuncaoCad.value.trim(); f.admissao=(document.getElementById("funAdmCad")?.value||""); f.salario=funSalCad.value.trim(); if(!aplicarStatusFuncionarioInativo(f,funStatusCad.value))return false
  f.observacoes=funObsCad.value.trim()?[funObsCad.value.trim()]:[]
  f.autoEventos=clone(funAutoTemp)
  f.eventos=clone(funEventoTemp)
  normalizarEventosCadastradosFuncionario(f)
  limparEventosFuturosNaoConferidos(emp,f)
  emp.funcionarios.sort((a,b)=>Number(a.codigo)-Number(b.codigo)||a.nome.localeCompare(b.nome))

  const chave=emp.codigo+"|"+f.codigo
  const fe=fechamento()
  if(!fe.funcionarios[chave])fe.funcionarios[chave]={status:"Pendente",obs:"",eventos:[]}
  sincronizarEventosCadastroFuncionario(emp,f,fe.funcionarios[chave])
  aplicarAutoFuncionario(emp,f,fe.funcionarios[chave])
  normalizarOrdemEventosFechamento(fe.funcionarios[chave])

  funCodCad.value=funNomeCad.value=funFuncaoCad.value=funSalCad.value=funObsCad.value=funAutoQtd.value=""
  funAutoEvento.value=""; if(document.getElementById("funAutoInicio"))funAutoInicio.value=""; if(document.getElementById("funAutoFim"))funAutoFim.value=""; funEventoPadrao.value=""; funEventoValor.value=""; funEventoObs.value=""; funEventoInicio.value=""; funEventoFim.value=""
  funcionarioEditando=null
  if(typeof funcionarioFormModo!=="undefined")funcionarioFormModo.textContent="Novo cadastro"
  if(typeof funcionarioFormCard!=="undefined")funcionarioFormCard.classList.remove("editing")
  funAutoTemp=[]; funEventoTemp=[]; funEventoEditIndex=null; funAutoEditIndex=null; renderAutoTemp()
  saved()
}
function carregarFuncionarioCadastro(empCod,funCod){
  const emp=state.empresas.find(e=>e.codigo===empCod)
  const f=emp?.funcionarios.find(x=>x.codigo===funCod)
  if(!f)return
  // Preenche os campos originais (usados por salvarFuncionarioCadastro)
  funEmpCad.value=empCod; atualizarVisibilidadeCadastroFuncionario(); funCodCad.value=f.codigo; funNomeCad.value=f.nome||""; funFuncaoCad.value=f.funcao||""; if(document.getElementById("funAdmCad"))funAdmCad.value=f.admissao||""; funSalCad.value=f.salario||""; funStatusCad.value=f.statusDetectado||"Ativo"; funObsCad.value=(f.observacoes||[]).join(" | ")
  funAutoTemp=clone(f.autoEventos||[]).map(a=>({...a,inicio:a.inicio||"",fim:a.fim||""}))
  funEventoTemp=clone(f.eventos||[])
  funAutoEvento.value=""; funAutoQtd.value=""; funEventoPadrao.value=""; funEventoValor.value=""; funEventoObs.value=""; funEventoInicio.value=""; funEventoFim.value=""
  renderAutoTemp()
  funcionarioEditando={empCod,funCod}
  if(typeof funcionarioFormModo!=="undefined")funcionarioFormModo.textContent="Editando funcionário"
  if(typeof funcionarioFormCard!=="undefined")funcionarioFormCard.classList.add("editing")
  // FIX v2.4b: abre modal em vez de rolar para o form
  abrirModalFuncionario(emp,f)
}
function abrirModalFuncionario(emp,f){
  const modal=document.getElementById("modalFuncionario")
  const body=document.getElementById("modalFuncionarioBody")
  if(!modal||!body)return
  // Opções de evento automático
  const optsAuto='<option value="">Sem automático</option>'+state.eventos.map(ev=>{const v=labelEventoObj(ev);return`<option value="${esc(v)}">${esc(v)}</option>`}).join("")
  // Opções de evento padrão (filtrado pela empresa)
  const evEmp=eventosEmpresa(emp.codigo)
  const optsPad='<option value="">Selecione...</option>'+evEmp.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")
  // Opções de empresa
  const optsEmp=empresasFuncionarioVisiveis().map(e=>`<option value="${esc(e.codigo)}"${String(e.codigo)===String(emp.codigo)?" selected":""}>${esc(e.codigo)} - ${esc(e.nome)}${empresaInativaNaCompetencia(e,comp())?" (INATIVA)":""}</option>`).join("")
  // Status
  const statusOpts=["Ativo","Admitido","Rescisão","Férias","Afastado","Licença maternidade","Inativo"].map(s=>`<option${s===(f.statusDetectado||"Ativo")?" selected":""}>${s}</option>`).join("")
  body.innerHTML=`
<div class="row" style="grid-template-columns:1fr 80px 1fr 140px;gap:10px">
  <div><label>Empresa</label><select id="mfEmp" onchange="mFunAtualizarEventos()">${optsEmp}</select></div>
  <div><label>Código</label><input id="mfCod" value="${esc(f.codigo)}"></div>
  <div class="mf-nome-largo"><label>Nome</label><input id="mfNome" value="${esc(f.nome||"")}"></div>
</div>
<div class="row" style="grid-template-columns:1fr 135px 140px 120px;gap:10px;margin-top:8px">
  <div><label>Função</label><input id="mfFuncao" value="${esc(f.funcao||"")}"></div>
  <div><label>Data admissão</label><input id="mfAdm" type="date" value="${esc(f.admissao||"")}"></div>
  <div><label>Salário</label><input id="mfSal" value="${esc(f.salario||"")}" onblur="this.value=formatMoneyInput(this.value)"></div>
  <div><label>Status</label><select id="mfStatus">${statusOpts}</select></div>
</div>
<div style="margin-top:8px"><label>Observações</label><input id="mfObs" value="${esc((f.observacoes||[]).join(" | "))}" placeholder="Observações fixas do funcionário"></div>
<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px">
  <b style="color:var(--pri);font-size:14px">⚡ Eventos automáticos (por dia útil)</b>
  <div class="row" style="grid-template-columns:1fr 90px 100px 100px auto;gap:8px;margin-top:8px;align-items:end">
    <div><label>Evento</label><select id="mfAutoEvento">${optsAuto}</select></div>
    <div><label>Qtd/dia</label><input id="mfAutoQtd" placeholder="1:00"></div>
    <div><label>Início</label><input id="mfAutoInicio" type="month"></div>
    <div><label>Fim</label><input id="mfAutoFim" type="month"></div>
    <div><label>&nbsp;</label><button class="btn out" onclick="mFunAddAuto()">+ Adicionar</button></div>
  </div>
  <div class="auto-list" id="mfAutoLista" style="margin-top:8px">Nenhum evento automático.</div>
</div>
<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px">
  <b style="color:var(--pri);font-size:14px">📋 Eventos padrão fixos</b>
  <div class="row" style="grid-template-columns:1fr 120px 1fr 100px 100px auto;gap:8px;margin-top:8px;align-items:end">
    <div><label>Evento</label><select id="mfPadEvento">${optsPad}</select></div>
    <div><label>Valor/qtd</label><input id="mfPadValor" placeholder="150,00"></div>
    <div><label>Observação</label><input id="mfPadObs" placeholder=""></div>
    <div><label>Início</label><input id="mfPadInicio" type="month"></div>
    <div><label>Fim</label><input id="mfPadFim" type="month"></div>
    <div><label>&nbsp;</label><button class="btn out" onclick="mFunAddPadrao()">+ Adicionar</button></div>
  </div>
  <div class="auto-list" id="mfPadLista" style="margin-top:8px">Nenhum evento padrão.</div>
</div>
<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
  <button class="btn pri" onclick="mFunSalvar()">💾 Salvar funcionário</button>
  <button class="btn out" onclick="fecharModalFuncionario()">Cancelar</button>
</div>`
  mFunRenderAuto()
  mFunRenderPadrao()
  modal.classList.add("open")
  document.body.classList.add("modal-aberto")
  renderModalSindicatosAdic()
}
function fecharModalFuncionario(){
  document.getElementById("modalFuncionario")?.classList.remove("open")
  document.body.classList.remove("modal-aberto")
  limparFuncionarioForm()
}
function mFunAtualizarEventos(){
  const codEmp=document.getElementById("mfEmp")?.value
  const evEmp=eventosEmpresa(codEmp)
  const sel=document.getElementById("mfPadEvento")
  if(sel)sel.innerHTML='<option value="">Selecione...</option>'+evEmp.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")
}
function mFunRenderAuto(){
  const box=document.getElementById("mfAutoLista"); if(!box)return
  box.innerHTML=funAutoTemp.length?funAutoTemp.map((a,i)=>`<div class="action-line"><b>${esc(a.evento)}</b><span>${esc(a.qtd)} por dia útil</span>${a.inicio?`<span>Início: ${esc(fmtMesRefLocal(a.inicio))}</span>`:""} ${a.fim?`<span>Fim: ${esc(fmtMesRefLocal(a.fim))}</span>`:""}<button class="btn small out" onclick="mFunEditarAuto(${i})">Alterar</button><button class="btn small red" onclick="funAutoTemp.splice(${i},1);mFunRenderAuto()">Excluir</button></div>`).join(""):"Nenhum evento automático."
}
let mFunMostrarInativos=false
function mFunRenderPadrao(){
  const box=document.getElementById("mfPadLista"); if(!box)return
  const hoje=new Date()
  const compMes=comp() // ex: "2026-05"
  function eventoInativo(a){
    if(!a.fim)return false
    // fim no formato AAAA-MM: inativo se fim < competência atual
    return a.fim < compMes
  }
  const lista=mFunMostrarInativos ? funEventoTemp : funEventoTemp.filter(a=>!eventoInativo(a))
  const temInativos=funEventoTemp.some(a=>eventoInativo(a))
  // Checkbox mostrar inativos
  const checkHtml=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
    <input type="checkbox" id="mfChkInativos" style="width:auto" ${mFunMostrarInativos?"checked":""} onchange="mFunMostrarInativos=this.checked;mFunRenderPadrao()">
    <label for="mfChkInativos" style="margin:0;font-size:12px;color:var(--muted);text-transform:none;letter-spacing:0">Mostrar eventos com data fim vencida${temInativos?" ("+funEventoTemp.filter(a=>eventoInativo(a)).length+" inativo(s))":""}</label>
  </div>`
  if(!lista.length){box.innerHTML=checkHtml+'<div style="color:var(--muted);font-size:13px">Nenhum evento padrão ativo.</div>';return}
  box.innerHTML=checkHtml+lista.map((a)=>{
    const i=funEventoTemp.indexOf(a)
    const inativo=eventoInativo(a)
    const estilo=inativo?"opacity:.5;background:#f8fafc;border-radius:8px;padding:4px 8px":"padding:4px 0"
    const fimTxt=a.fim?` <span style="font-size:11px;color:${inativo?"var(--red)":"var(--muted)"}">Fim: ${esc(fmtMesRefLocal(a.fim))}</span>`:""
    const iniTxt=a.inicio?` <span style="font-size:11px;color:var(--muted)">Início: ${esc(fmtMesRefLocal(a.inicio))}</span>`:""
    return `<div class="action-line" style="${estilo}">
      ${inativo?'<span class="badge red" style="font-size:10px;padding:2px 6px">Inativo</span>':''}
      <b>${esc(a.desc)}</b>
      <span>${esc(a.valor||"")}</span>
      ${a.obs?`<span style="font-size:12px;color:var(--muted)">${esc(a.obs)}</span>`:""}
      ${iniTxt}${fimTxt}
      <button class="btn small out" onclick="mFunEditarPadrao(${i})">Alterar</button>
      <button class="btn small red" onclick="mFunExcluirPadrao(${i})">Excluir</button>
    </div>`
  }).join("")
}
function mFunExcluirPadrao(i){
  const a=funEventoTemp[i]; if(!a)return
  const jaTemFim=!!a.fim
  if(!jaTemFim){
    // Sem data fim: avisar que o correto é colocar data fim
    const resp=confirm(`⚠️ O correto para encerrar um evento padrão é informar uma DATA FIM, não excluir.\n\nIsso preserva o histórico e evita que o evento suma de meses já lançados.\n\nSe quiser inativar, clique em "Alterar" e preencha o campo "Fim".\n\nMesmo assim deseja EXCLUIR permanentemente o evento "${a.desc}"?`)
    if(!resp)return
  }else{
    if(!confirm(`Excluir o evento "${a.desc}"? Esta ação não pode ser desfeita.`))return
  }
  funEventoTemp.splice(i,1)
  funEventoEditIndex=null
  mFunRenderPadrao()
}
function mFunAddAuto(){
  const ev=document.getElementById("mfAutoEvento")?.value
  const qtd=document.getElementById("mfAutoQtd")?.value
  if(!ev||!qtd)return alert("Informe evento e quantidade.")
  const obj={evento:ev,qtd,inicio:document.getElementById("mfAutoInicio")?.value||"",fim:document.getElementById("mfAutoFim")?.value||""}
  if(funAutoEditIndex!==null){funAutoTemp[funAutoEditIndex]=obj;funAutoEditIndex=null}
  else{const idx=funAutoTemp.findIndex(a=>a.evento===ev); if(idx>=0){if(!confirm("Evento já existe. Deseja alterar?"))return; funAutoTemp[idx]=obj}else{if(!confirm("Cadastrar este evento automático?"))return; funAutoTemp.push(obj)}}
  document.getElementById("mfAutoEvento").value=""
  document.getElementById("mfAutoQtd").value=""
  document.getElementById("mfAutoInicio").value=""
  document.getElementById("mfAutoFim").value=""
  mFunRenderAuto()
}
function mFunEditarAuto(i){
  const a=funAutoTemp[i]; if(!a)return
  funAutoEditIndex=i
  const ev=document.getElementById("mfAutoEvento"); if(ev)ev.value=a.evento||""
  const qtd=document.getElementById("mfAutoQtd"); if(qtd)qtd.value=a.qtd||""
  const ini=document.getElementById("mfAutoInicio"); if(ini)ini.value=a.inicio||""
  const fim=document.getElementById("mfAutoFim"); if(fim)fim.value=a.fim||""
}
function mFunAddPadrao(){
  const ev=document.getElementById("mfPadEvento")?.value
  if(!ev)return alert("Selecione o evento padrão.")
  const obj={desc:ev,valor:valorPadrao(document.getElementById("mfPadValor")?.value||""),obs:document.getElementById("mfPadObs")?.value||"",inicio:document.getElementById("mfPadInicio")?.value||"",fim:document.getElementById("mfPadFim")?.value||"",status:"Pendente"}
  // FIX: verificar modo edição ANTES de checar duplicata
  if(funEventoEditIndex!==null){
    if(!confirm("Salvar alteração deste evento padrão?"))return
    funEventoTemp[funEventoEditIndex]=obj
    funEventoEditIndex=null
  }else{
    if(obj.inicio&&obj.fim&&obj.inicio>obj.fim)return alert("O início não pode ser posterior ao fim.")
    if(funEventoTemp.some(a=>a.desc===ev&&periodosEventosSobrepostos(a,obj)))return alert("Este evento já existe em um período sobreposto. Use Alterar para editar o período anterior.")
    if(!confirm("Cadastrar este evento padrão?"))return
    funEventoTemp.push(obj)
  }
  document.getElementById("mfPadEvento").value=""
  document.getElementById("mfPadValor").value=""
  document.getElementById("mfPadObs").value=""
  document.getElementById("mfPadInicio").value=""
  document.getElementById("mfPadFim").value=""
  mFunRenderPadrao()
}
function mFunEditarPadrao(i){
  const a=funEventoTemp[i]; if(!a)return
  funEventoEditIndex=i
  // Abrir mini-modal com os dados do evento
  document.getElementById("mepDesc").value=a.desc||""
  document.getElementById("mepValor").value=a.valor||""
  document.getElementById("mepObs").value=a.obs||""
  document.getElementById("mepInicio").value=a.inicio||""
  document.getElementById("mepFim").value=a.fim||""
  // Aviso se o evento não tem data fim
  const alerta=document.getElementById("modalEvPadAlerta")
  if(!a.fim){
    alerta.style.display="block"
    alerta.textContent="💡 Este evento não tem data fim — ficará ativo para sempre. Para encerrar no futuro, informe o campo Fim."
  }else{
    alerta.style.display="none"
  }
  document.getElementById("modalEvPad").classList.add("open")
}
function fecharMiniModalEvPad(){
  document.getElementById("modalEvPad").classList.remove("open")
  funEventoEditIndex=null
}
function salvarMiniModalEvPad(){
  if(funEventoEditIndex===null)return
  const a=funEventoTemp[funEventoEditIndex]
  if(!a)return
  const novoValor=document.getElementById("mepValor")?.value||""
  const novoObs=document.getElementById("mepObs")?.value||""
  const novoInicio=document.getElementById("mepInicio")?.value||""
  const novoFim=document.getElementById("mepFim")?.value||""
  // Aviso resumindo o que vai mudar
  const mudancas=[]
  if(novoValor!==a.valor)mudancas.push(`Valor: "${a.valor||"vazio"}" → "${novoValor||"vazio"}"`)
  if(novoObs!==a.obs)mudancas.push(`Obs: "${a.obs||"vazio"}" → "${novoObs||"vazio"}"`)
  if(novoInicio!==a.inicio)mudancas.push(`Início: "${fmtMesRefLocal(a.inicio)||"sem início"}" → "${fmtMesRefLocal(novoInicio)||"sem início"}"`)
  if(novoFim!==a.fim)mudancas.push(`Fim: "${fmtMesRefLocal(a.fim)||"sem fim"}" → "${fmtMesRefLocal(novoFim)||"sem fim"}"`)
  if(!mudancas.length){fecharMiniModalEvPad();return}
  if(!confirm(`Salvar alterações no evento "${a.desc}"?\n\n${mudancas.join("\n")}`))return
  funEventoTemp[funEventoEditIndex]={...a,valor:valorPadrao(novoValor),obs:novoObs,inicio:novoInicio,fim:novoFim}
  fecharMiniModalEvPad()
  mFunRenderPadrao()
}
function mFunSalvar(){
  const empCod=document.getElementById("mfEmp")?.value
  const cod=(document.getElementById("mfCod")?.value||"").trim()
  if(!empCod||!cod)return alert("Informe empresa e código do funcionário.")
  // Sincroniza campos do modal → form original
  funEmpCad.value=empCod
  funCodCad.value=cod
  funNomeCad.value=document.getElementById("mfNome")?.value||""
  funFuncaoCad.value=document.getElementById("mfFuncao")?.value||""
  if(document.getElementById("funAdmCad"))funAdmCad.value=document.getElementById("mfAdm")?.value||""
  funSalCad.value=document.getElementById("mfSal")?.value||""
  funStatusCad.value=document.getElementById("mfStatus")?.value||"Ativo"
  funObsCad.value=document.getElementById("mfObs")?.value||""
  // FIX: fechar DEPOIS de salvar — fecharModalFuncionario limpa o form
  if(salvarFuncionarioCadastro()===false)return
  document.getElementById("modalFuncionario")?.classList.remove("open")
  document.body.classList.remove("modal-aberto")
}

function limparEventosSemCadastro(salvar=true){
  let removidos=0
  ;(state.empresas||[]).forEach(emp=>{
    const antes=(emp.eventosPermitidos||[]).length
    emp.eventosPermitidos=(emp.eventosPermitidos||[]).filter(label=>parseEventoLabel(label))
    removidos+=antes-emp.eventosPermitidos.length
  })
  if(salvar){
    if(removidos>0)alert(removidos+" evento(s) sem cadastro foram removidos dos vínculos das empresas.")
    saved()
  }
  return removidos
}

function renderEmpEvtVincFormCad(){
  const body=document.getElementById("empEvtVincBody")
  const sel=document.getElementById("empEvtVincSelect")
  if(!body||!sel)return
  const codEmp=empresaEditando
  if(!codEmp){
    body.innerHTML='<tr><td colspan="4" style="padding:10px;color:var(--muted);font-size:13px">Carregue uma empresa para gerenciar os eventos vinculados.</td></tr>'
    sel.innerHTML='<option value="">Selecionar evento...</option>'
    return
  }
  const emp=state.empresas.find(e=>String(e.codigo)===String(codEmp))
  if(!emp){body.innerHTML='<tr><td colspan="4" style="padding:10px;color:var(--muted)">Empresa não localizada.</td></tr>';return}
  const vinculados=emp.eventosPermitidos||[]
  const vinculadosSet=new Set(vinculados)
  sel.innerHTML='<option value="">Selecionar evento...</option>'+state.eventos.filter(e=>!vinculadosSet.has(labelEventoObj(e))).map(e=>{const v=labelEventoObj(e);return `<option value="${esc(v)}">${esc(v)}</option>`}).join("")
  if(!vinculados.length){
    body.innerHTML='<tr><td colspan="4" style="padding:10px;color:var(--muted);font-size:13px">Nenhum evento vinculado. Use o campo acima para vincular.</td></tr>'
    return
  }
  body.innerHTML=vinculados.map((label,idx)=>{
    const p=parseEventoLabel(label)
    if(!p)return ""
    const ev=state.eventos.find(x=>x.codigo===p.codigo)
    return `<tr style="border-bottom:1px solid #edf1f7"><td style="padding:7px 10px;color:var(--muted)">${esc(p.codigo)}</td><td style="padding:7px 10px;font-weight:700;color:var(--ink)">${esc(p.descricao||label)}</td><td style="padding:7px 10px"><span style="font-size:11px;background:#f1f5f9;color:var(--muted);padding:2px 8px;border-radius:999px">${esc(ev?.tipo||"Valor")}</span></td><td style="padding:7px 10px;text-align:center"><button class="btn small red" onclick="delEventoEmpresaFormCad(${idx})">Remover</button></td></tr>`
  }).join("")
}
function addEventoEmpresaFormCad(){
  const sel=document.getElementById("empEvtVincSelect")
  const label=sel?.value
  if(!label)return alert("Selecione um evento para vincular.")
  const codEmp=empresaEditando
  if(!codEmp)return alert("Salve a empresa primeiro para vincular eventos.")
  const emp=state.empresas.find(e=>String(e.codigo)===String(codEmp))
  if(!emp)return alert("Empresa não localizada.")
  if(!Array.isArray(emp.eventosPermitidos))emp.eventosPermitidos=[]
  if(emp.eventosPermitidos.includes(label))return alert("Este evento já está vinculado.")
  emp.eventosPermitidos.push(label)
  emp.eventosPermitidos.sort((a,b)=>Number((a.match(/^\d+/)||[999999])[0])-Number((b.match(/^\d+/)||[999999])[0])||a.localeCompare(b))
  save()
  renderEmpEvtVincFormCad()
  renderEventosEmpresa()
}
function delEventoEmpresaFormCad(idx){
  const codEmp=empresaEditando
  if(!codEmp)return
  const emp=state.empresas.find(e=>String(e.codigo)===String(codEmp))
  if(!emp||!Array.isArray(emp.eventosPermitidos))return
  if(!confirm("Desvincular este evento da empresa?"))return
  emp.eventosPermitidos.splice(idx,1)
  salvarAgora()
  renderEmpEvtVincFormCad()
  renderEventosEmpresa()
}
function sugerirEventosEmpresaFormCad(){
  const codEmp=empresaEditando
  if(!codEmp)return alert("Salve a empresa primeiro.")
  const emp=state.empresas.find(e=>String(e.codigo)===String(codEmp))
  if(!emp)return
  const set=new Set(emp.eventosPermitidos||[])
  ;(emp.funcionarios||[]).forEach(f=>(f.eventos||[]).forEach(ev=>{const p=parseEventoLabel(ev.desc);if(p)set.add(`${p.codigo} - ${p.descricao}`)}))
  emp.eventosPermitidos=[...set].sort((a,b)=>Number((a.match(/^\d+/)||[999999])[0])-Number((b.match(/^\d+/)||[999999])[0])||a.localeCompare(b))
  save()
  renderEmpEvtVincFormCad()
  renderEventosEmpresa()
  alert("Eventos sugeridos adicionados com base nos funcionários desta empresa.")
}
function addEventoEmpresa(){
  const empCod=evEmp.value
  const label=evCodEmpresa.value
  if(!empCod||!label)return alert("Selecione empresa e código/evento.")
  const arr=eventosEmpresa(empCod)
  if(arr.includes(label))return alert("Este código já está vinculado a esta empresa.")
  arr.push(label)
  arr.sort((a,b)=>Number((a.match(/^\d+/)||[999999])[0])-Number((b.match(/^\d+/)||[999999])[0]) || a.localeCompare(b))
  saved()
}
function delEventoEmpresa(empCod,label){
  const arr=eventosEmpresa(empCod)
  const alvo=String(label||"").trim()
  let i=arr.findIndex(x=>String(x||"").trim()===alvo)
  if(i<0){
    const normalizar=v=>String(v||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim().toLowerCase()
    i=arr.findIndex(x=>normalizar(x)===normalizar(label))
  }
  if(i>=0){arr.splice(i,1); salvarAgora(); renderEventosEmpresa(); renderEmp(); return}
  alert("Não consegui localizar esse vínculo para desvincular. Atualize a tela e tente novamente.")
}
function delEventoEmpresaIndex(empCod,index){
  const arr=eventosEmpresa(empCod)
  const i=Number(index)
  if(Number.isInteger(i)&&i>=0&&i<arr.length){arr.splice(i,1); salvarAgora(); renderEventosEmpresa(); renderEmp(); return}
  alert("Não consegui localizar esse vínculo para desvincular. Atualize a tela e tente novamente.")
}
function sugerirEventosEmpresaSelecionada(){
  const empCod=evEmp.value
  const emp=state.empresas.find(e=>e.codigo===empCod)
  if(!emp)return
  const set=new Set(emp.eventosPermitidos||[])
  ;(emp.funcionarios||[]).forEach(f=>(f.eventos||[]).forEach(ev=>{const p=parseEventoLabel(ev.desc); if(p)set.add(`${p.codigo} - ${p.descricao}`)}))
  emp.eventosPermitidos=[...set].sort((a,b)=>Number((a.match(/^\d+/)||[999999])[0])-Number((b.match(/^\d+/)||[999999])[0]) || a.localeCompare(b))
  saved()
}
function renderEventosEmpresa(){
  if(!document.getElementById("tabEventosEmpresa"))return
  popularEventosEmpresaSelect()
  const listaCadastro=empresasCadastroVisiveis()
  const empCod=evEmp.value || (listaCadastro[0]?.codigo||"")
  if(evEmp.value!==empCod)evEmp.value=empCod
  const emp=state.empresas.find(e=>e.codigo===empCod)
  if(!emp){tabEventosEmpresa.innerHTML="<tbody><tr><td>Nenhuma empresa.</td></tr></tbody>";return}
  const rows=(emp.eventosPermitidos||[]).map((label,idx)=>{const p=parseEventoLabel(label); if(!p)return ""; const ev=state.eventos.find(x=>x.codigo===p.codigo); const cod=p.codigo; return `<tr><td><b>${esc(cod)}</b></td><td>${esc(p.descricao||label)}</td><td>${esc(ev?.tipo||"Valor")}</td><td><button class="btn small red" onclick="delEventoEmpresaIndex('${esc(emp.codigo)}',${idx})">Desvincular</button></td></tr>`}).join("")
  tabEventosEmpresa.innerHTML=`<thead><tr><th colspan="4">${esc(emp.codigo)} - ${esc(emp.nome)}</th></tr><tr><th>Código</th><th>Evento permitido</th><th>Tipo</th><th>Ação</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Nenhum código vinculado.</td></tr>'}</tbody>`
}
function renomearEventoPermitido(i,novaDesc){
  const ev=state.eventos[i]
  const oldLabels=[]
  state.empresas.forEach(emp=>(emp.eventosPermitidos||[]).forEach(l=>{const p=parseEventoLabel(l); if(p&&p.codigo===ev.codigo)oldLabels.push(l)}))
  state.empresas.forEach(emp=>{emp.eventosPermitidos=(emp.eventosPermitidos||[]).map(l=>{const p=parseEventoLabel(l); return p&&p.codigo===ev.codigo?`${ev.codigo} - ${novaDesc}`:l})})
}
function excluirEventoGlobal(i){
  const label=labelEventoObj(state.eventos[i])
  if(!confirm("Excluir do cadastro geral? O evento será desvinculado das empresas, mas lançamentos antigos continuam no fechamento."))return
  state.eventos.splice(i,1)
  state.empresas.forEach(emp=>emp.eventosPermitidos=(emp.eventosPermitidos||[]).filter(l=>l!==label))
  saved()
}


