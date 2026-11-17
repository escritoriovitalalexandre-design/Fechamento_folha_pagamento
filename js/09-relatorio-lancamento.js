// (TRAVADO) Relatório de lançamento: filtros próprios, sem alterar o restante do sistema.
function fmtMesAnoRel(v){
  const s=String(v||"").trim()
  const m=s.match(/^(\d{4})-(\d{2})$/)
  return m?`${m[2]}/${m[1]}`:s
}
function fmtMesAnoCurtoFechamento(v){
  const s=String(v||"").trim()
  if(!s)return "-"
  return fmtMesAnoCurto(s)
}
function fmtMesAnoCurto(v){
  const s=String(v||"").trim()
  const m=s.match(/^(\d{4})-(\d{2})$/)
  if(!m)return s
  return `${MESES_EXTENSO[Number(m[2])-1]}/${m[1]}`
}
function parseMesAnoCurto(v){
  const s=String(v||"").trim()
  if(!s||s==="-")return ""
  let m=s.match(/^(\d{4})-(\d{2})$/); if(m)return s
  m=s.match(/^(\d{1,2})[\/\-](\d{4})$/); if(m)return `${m[2]}-${String(Number(m[1])).padStart(2,"0")}`
  m=s.match(/^([A-Za-zÀ-ÿçÇ]+)\s*(?:de\s*)?[\/\-]?\s*(\d{4})$/i)
  if(m){
    const mes=normalizarMesExtenso(m[1])
    const idx=MESES_EXTENSO.findIndex(x=>x===mes)
    if(idx>=0)return `${m[2]}-${String(idx+1).padStart(2,"0")}`
  }
  return s
}
function normalizarCodigoEmpresaRel(v){return String(v||"").trim().replace(/^0+/,"")||String(v||"").trim()}
function codigosExcluidosRelatorio(){
  const raw=document.getElementById("relEmpExcluir")?.value||""
  return raw.split(/[,;\s]+/).map(normalizarCodigoEmpresaRel).filter(Boolean)
}
function relCompetenciaFiltro(){return document.getElementById("relComp")?.value || comp()}
function relEmpresaFiltro(){return document.getElementById("relEmp")?.value || ""}
function popularRelatorioFiltros(){
  const c=document.getElementById("relComp")
  if(c && !c.value)c.value=comp()
  const sel=document.getElementById("relEmp")
  if(sel){
    const atual=sel.value
    sel.innerHTML='<option value="">Todas as empresas</option>'+empresasAtivas().map(e=>`<option value="${esc(e.codigo)}">${esc(e.codigo)} - ${esc(e.nome)}</option>`).join("")
    if(atual && empresasAtivas().some(e=>String(e.codigo)===String(atual)))sel.value=atual
  }
}
function empresasRelatorioSelecionadas(){
  const empRel=relEmpresaFiltro()
  const excluidos=codigosExcluidosRelatorio()
  return empresasAtivas().filter(e=>{
    if(empRel)return String(e.codigo)===String(empRel)
    return !excluidos.includes(normalizarCodigoEmpresaRel(e.codigo))
  })
}
function executarComCompetenciaRelatorio(c,fn){
  const comp1El=document.getElementById("comp1")
  const comp2El=document.getElementById("comp2")
  const old1=comp1El?comp1El.value:""
  const old2=comp2El?comp2El.value:""
  if(comp1El)comp1El.value=c
  if(comp2El)comp2El.value=c
  try{return fn()}finally{if(comp1El)comp1El.value=old1; if(comp2El)comp2El.value=old2}
}
function limparSelecaoRelatorio(ev){
  if(ev)ev.stopPropagation()
  document.querySelectorAll("#tabRel .rel-selecionado").forEach(el=>el.classList.remove("rel-selecionado"))
  document.querySelectorAll("#tabRel .rel-linha-selecionada").forEach(el=>el.classList.remove("rel-linha-selecionada"))
  document.querySelectorAll("#tabRel .rel-evento-selecionado").forEach(el=>el.classList.remove("rel-evento-selecionado"))
}
function selecionarEventoRelatorio(el){
  document.querySelectorAll("#tabRel .rel-evento-selecionado").forEach(l=>l.classList.remove("rel-evento-selecionado"))
  if(el)el.classList.add("rel-evento-selecionado")
}
function selecionarFuncionarioRelatorio(chave){
  document.querySelectorAll("#tabRel .rel-selecionado").forEach(el=>el.classList.remove("rel-selecionado"))
  document.querySelectorAll("#tabRel .rel-linha-selecionada").forEach(el=>el.classList.remove("rel-linha-selecionada"))
  document.querySelectorAll("#tabRel .rel-evento-selecionado").forEach(el=>el.classList.remove("rel-evento-selecionado"))
  const linhas=document.querySelectorAll(`#tabRel [data-rel-func="${CSS.escape(chave)}"]`)
  linhas.forEach(el=>{
    if(el.classList.contains("rel-func"))el.classList.add("rel-selecionado")
    else el.classList.add("rel-linha-selecionada")
  })
}
function renderRel(){
  popularRelatorioFiltros()
  const rows=relRows(relCompetenciaFiltro(), empresasRelatorioSelecionadas())
  let htmlRel=""
  let atualEmp="", atualFunc=""
  rows.forEach((r,idx)=>{
    const keyEmp=r.codEmp
    if(keyEmp!==atualEmp){
      atualEmp=keyEmp; atualFunc=""
      const tri=r.dbObs?`<button class="tri-obs" title="Ler observação da data-base" onclick="lerObsDataBase('${esc(r.codEmp).replaceAll("'","&#39;")}')">▲</button>`:""
      const especial=r.vinculoSindicato==="Especial"?`<span class="badge-red-strong">VÍNCULO ESPECIAL</span>`:""
      htmlRel+=`<tr class="rel-empresa"><td colspan="8">Empresa ${esc(r.codEmp)} - ${esc(r.empresa)} ${especial} | Sindicato: <button class="link-btn" onclick="abrirSindicato('${esc(r.sind).replaceAll("'","&#39;")}')">${esc(r.sind)}</button> | Data-base: ${esc(r.db)} | Status: <button class="link-btn ${dbClass(r.dbStatus)}" style="padding:3px 8px;border-radius:12px" onclick="editarObsDataBase('${esc(r.codEmp).replaceAll("'","&#39;")}')">${esc(r.dbStatus)}</button>${tri} ${r.dissidio? " | "+esc(r.dissidio):""}</td></tr>`
    }
    const keyFunc=r.codFunc
    if(keyFunc!==atualFunc){
      atualFunc=keyFunc
      const chaveRelFunc=`${r.codEmp}__${r.codFunc}`
      htmlRel+=`<tr class="rel-func" data-rel-func="${esc(chaveRelFunc)}" onclick="selecionarFuncionarioRelatorio('${esc(chaveRelFunc).replaceAll("'","&#39;")}')" title="Clique para destacar este funcionário"><td colspan="8"><span class="func-line"><span class="rel-func-nome" style="font-weight:950;font-size:16px;color:#1B3A6B;background:#dbeafe;border-radius:8px;padding:3px 8px">${esc(r.codFunc)} - ${esc(r.func)}</span> <small>${esc(r.funcao||"Sem função")} · <span style="font-weight:900;font-size:13px;color:#172033">Salário: R$ ${money(r.sal)}</span></small><span class="selecionado-tag" onclick="limparSelecaoRelatorio(event)" title="Clique para desselecionar">SELECIONADO</span></span></td></tr>`
      htmlRel+=`<tr><th class="rel-cod">Cód. Evento</th><th>Evento</th><th class="rel-valor">Valor/Qtd</th><th class="rel-data">Início</th><th class="rel-data">Fim</th><th class="rel-obs">Observação</th><th class="rel-padrao">Evento Padrão</th><th class="rel-status">Status Evento</th></tr>`
    }
    htmlRel+=`<tr class="rel-evento-linha" data-rel-func="${esc(`${r.codEmp}__${r.codFunc}`)}" onclick="selecionarEventoRelatorio(this)" title="Clique para destacar este evento"><td class="rel-cod"><b>${esc(r.codEvento)}</b></td><td>${esc(r.evento)}</td><td class="rel-valor">${esc(r.valor)}</td><td class="rel-data">${esc(fmtMesAnoRel(r.inicio||""))}</td><td class="rel-data">${esc(fmtMesAnoRel(r.fim||""))}</td><td class="rel-obs">${esc(r.obs)}</td><td class="rel-padrao">${esc(r.eventoPadrao||"Não")}</td><td class="rel-status">${esc(r.statusEvento)}</td></tr>`
    if((idx===rows.length-1||rows[idx+1].codEmp!==r.codEmp||rows[idx+1].codFunc!==r.codFunc)&&r.obsConferencia)htmlRel+=`<tr class="rel-func" data-rel-func="${esc(`${r.codEmp}__${r.codFunc}`)}"><td colspan="8" style="white-space:pre-wrap"><b>Observação de conferência:</b> ${esc(r.obsConferencia)}</td></tr>`
  })
  tabRel.innerHTML=`<tbody>${htmlRel||'<tr><td>Nenhum lançamento encontrado.</td></tr>'}</tbody>`
}
