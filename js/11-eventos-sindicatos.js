let _evEditIdx=null
function renderEventos(){
  const busca=(document.getElementById("eventoBusca")?.value||"").toLowerCase()
  const tipoF=document.getElementById("eventoTipoFiltro")?.value||""
  const lista=state.eventos.filter(e=>(!tipoF||e.tipo===tipoF)&&(!busca||[e.codigo,e.descricao,e.tipo].join(" ").toLowerCase().includes(busca)))
  const estilo_off="background:#f1f5f9;color:#94a3b8;cursor:default;pointer-events:none;border-color:#e2e8f0"
  tabEventos.innerHTML="<thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Noturno</th><th>Empresas</th><th>Ação</th></tr></thead><tbody>"+lista.map((e)=>{
    const i=state.eventos.indexOf(e)
    const label=labelEventoObj(e)
    const qtd=state.empresas.filter(emp=>(emp.eventosPermitidos||[]).includes(label)).length
    const ed=_evEditIdx===i
    return `<tr style="${ed?"outline:2px solid var(--blue);background:#eff6ff":""}">
      <td><input id="ev-cod-${i}" value="${esc(e.codigo)}" style="width:90px${ed?"":";"+estilo_off}" ${ed?"":"tabindex='-1'"}></td>
      <td><input id="ev-desc-${i}" value="${esc(e.descricao)}" style="${ed?"":""+estilo_off}" ${ed?"":"tabindex='-1'"}></td>
      <td><select id="ev-tipo-${i}" style="${ed?"":""+estilo_off}" ${ed?"":"disabled"}><option ${e.tipo==="Valor"?"selected":""}>Valor</option><option ${e.tipo==="Horas"?"selected":""}>Horas</option><option ${e.tipo==="Dias"?"selected":""}>Dias</option><option ${e.tipo==="Observação"?"selected":""}>Observação</option></select></td>
      <td style="text-align:center"><input type="checkbox" id="ev-not-${i}" ${e.noturno?"checked":""} ${ed?"":"disabled"} title="Evento noturno"></td>
      <td>${qtd}</td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">${ed
        ?`<button class="btn small blue" onclick="salvarEventoGlobal(${i})">💾 Salvar</button><button class="btn small out" onclick="_evEditIdx=null;renderEventos()">Cancelar</button>`
        :`<button class="btn small out" onclick="_evEditIdx=${i};renderEventos()">✏️ Editar</button><button class="btn small red" onclick="excluirEventoGlobal(${i})">Excluir</button>`
      }</td>
    </tr>`
  }).join("")+"</tbody>"
  popularEventosEmpresaSelect(); popularFunSelects()
}
function salvarEventoGlobal(i){
  const ev=state.eventos[i]; if(!ev)return
  const oldLabel=labelEventoObj(ev)
  const novoCod=document.getElementById(`ev-cod-${i}`).value.trim()
  const novaDesc=document.getElementById(`ev-desc-${i}`).value.trim()
  const novoTipo=document.getElementById(`ev-tipo-${i}`).value
  if(!novoCod||!novaDesc)return aviso("Informe código e descrição.")
  if(state.eventos.some((x,idx)=>idx!==i&&x.codigo===novoCod))return aviso("Já existe outro evento com este código.")
  const mudou=novoCod!==ev.codigo||novaDesc!==ev.descricao
  if(mudou){
    const qtd=state.empresas.filter(emp=>(emp.eventosPermitidos||[]).includes(oldLabel)).length
    if(!confirm(`⚠️ Você está alterando o evento "${oldLabel}".\n\nIsso atualizará automaticamente:\n• ${qtd} empresa(s) vinculada(s)\n• Cadastro dos funcionários\n• Fechamentos já lançados\n\nDeseja salvar?`))return
  }else{
    if(!confirm("Salvar alterações deste evento?"))return
  }
  ev.codigo=novoCod; ev.descricao=novaDesc; ev.tipo=novoTipo; ev.noturno=!!(document.getElementById(`ev-not-${i}`)?.checked)
  const newLabel=labelEventoObj(ev)
  if(mudou){
    state.empresas.forEach(emp=>{
      emp.eventosPermitidos=(emp.eventosPermitidos||[]).map(l=>l===oldLabel?newLabel:l)
      ;(emp.funcionarios||[]).forEach(f=>{
        ;(f.eventos||[]).forEach(x=>{if(x.desc===oldLabel)x.desc=newLabel})
        ;(f.autoEventos||[]).forEach(x=>{if(x.evento===oldLabel)x.evento=newLabel})
      })
    })
    Object.values(state.fechamentos||{}).forEach(fe=>{
      Object.values(fe.funcionarios||{}).forEach(fs=>{(fs.eventos||[]).forEach(x=>{if(x.desc===oldLabel)x.desc=newLabel})})
    })
  }
  state.eventos.sort((a,b)=>Number(a.codigo)-Number(b.codigo)||a.descricao.localeCompare(b.descricao))
  _evEditIdx=null
  saved()
}
function addEventoBase(){const c=codNovo.value.trim(),d=descNovo.value.trim(); if(!c||!d)return aviso("Informe código e descrição."); if(state.eventos.some(e=>e.codigo===c))return aviso("Código já cadastrado."); const noturno=!!(document.getElementById("noturnoNovo")?.checked); state.eventos.push({codigo:c,descricao:d,tipo:tipoNovo.value,noturno}); state.eventos.sort((a,b)=>Number(a.codigo)-Number(b.codigo)); codNovo.value=""; descNovo.value=""; if(document.getElementById("noturnoNovo"))noturnoNovo.checked=false; saved()}



let funAutoTemp=[]
let funEventoTemp=[]
let funEventoEditIndex=null
let funAutoEditIndex=null
let sindicatoAnexosTemp=[]
let sindLiberacaoTemp=null
let sindEditAnexosTemp=[]
let sindEditLiberacaoTemp=null
let sindEditIdAtual=null
let sindBeneficiosTemp=[]
let sindBeneficiosSindId=null
let sindBenefEditIndex=null
let empresaNaoContribuiSindicatoObsTemp=""
let empSindicatosAdicTemp=[]
let meSindicatosAdicTemp=[]
let empresaEditando=null
let funcionarioEditando=null

function popularSindicatos(){
  const opts=['<option value="">Selecione...</option>'].concat((state.sindicatos||[]).map(s=>`<option value="${esc(s.nome)}">${esc(s.nome)}</option>`)).join("")
  ;["empSindCad"].forEach(id=>{const sel=document.getElementById(id); if(sel){const v=sel.value; sel.innerHTML=opts; if(v)sel.value=v}})
  ;["empSindicatosAdicCad"].forEach(id=>{const sel=document.getElementById(id); if(sel){const vals=Array.from(sel.selectedOptions||[]).map(o=>o.value); sel.innerHTML=(state.sindicatos||[]).map(s=>`<option value="${esc(s.nome)}">${esc(s.nome)}</option>`).join(""); setSelectMultiplo(id,vals)}})
}
function aplicarSindicatoNaEmpresa(){
  const s=(state.sindicatos||[]).find(x=>x.nome===empSindCad.value)
  if(!s)return
  empDbCad.value=normalizarMesExtenso(s.dataBase||"")
  empDissCad.value=s.obs||""
  empVinculoSindCad.value=(s.beneficio==="Especial")?"Especial":"Normal"
}

function atualizarTriObsNaoContribuiSindicato(){
  const tri=document.getElementById("empObsSindTri")
  if(!tri)return
  const status=document.getElementById("empContribSindStatusCad")?.value||"OK"
  tri.classList.toggle("hide",status!=="NAO"&&!String(empresaNaoContribuiSindicatoObsTemp||"").trim())
}
function abrirObsNaoContribuiSindicato(){
  const atual=empresaNaoContribuiSindicatoObsTemp||""
  const texto=prompt("Anotação — empresa não vai contribuir com sindicato:\n\nEscreva a observação ou deixe em branco para apagar.",atual)
  if(texto===null)return
  empresaNaoContribuiSindicatoObsTemp=String(texto||"").trim()
  atualizarTriObsNaoContribuiSindicato()
}
function gerarModeloResumoConvencao(){
  const campo=document.getElementById("sindResumoConvencaoCad")
  if(!campo)return
  const modelo=`PONTOS IMPORTANTES DA CONVENÇÃO / CIRCULAR\n\n1. Vigência:\n2. Data-base:\n3. Reajuste salarial:\n4. Piso salarial por função:\n5. Vale-alimentação / cesta básica:\n6. Contribuição assistencial / oposição:\n7. Horas extras / adicional noturno:\n8. Domingos e feriados:\n9. Banco de horas / compensação:\n10. Faltas, atrasos e DSR:\n11. Estabilidades e garantias:\n12. Prazos importantes para o DP:\n13. Observações práticas para lançamento na folha:`;
  campo.value=campo.value.trim()?campo.value+"\n\n"+modelo:modelo
}
function formatFileSize(n){
  n=Number(n||0)
  if(n>=1024*1024)return (n/1024/1024).toFixed(2).replace(".",",")+" MB"
  if(n>=1024)return (n/1024).toFixed(0)+" KB"
  return n+" bytes"
}
function renderSindicatoAnexosTemp(){
  const box=document.getElementById("sindAnexosLista")
  if(!box)return
  if(!sindicatoAnexosTemp.length){box.innerHTML="Nenhum documento anexado.";return}
  box.innerHTML=sindicatoAnexosTemp.map((a,i)=>a.enviando?`<div class="anexo-item"><div><b>${esc(a.tipo||"Documento")}</b><br><span class="muted">${esc(a.nome||"")} — enviando...</span></div></div>`:`<div class="anexo-item"><div><b>${esc(a.tipo||"Documento")}</b><br><span class="muted">${esc(a.nome||"")} ${a.tamanho?"· "+esc(formatFileSize(a.tamanho)):""}</span></div><div class="anexo-links"><a class="btn small out" href="${esc(anexoLink(a))}" download="${esc(a.nome||"documento")}" target="_blank">Abrir/baixar</a><button class="btn small red" onclick="sindicatoAnexosTemp.splice(${i},1);renderSindicatoAnexosTemp()">Remover</button></div></div>`).join("")
}
async function addSindicatoAnexos(files){
  const lista=Array.from(files||[])
  if(!lista.length)return
  const tipo=document.getElementById("sindTipoAnexoCad")?.value||"Documento"
  for(const file of lista){
    if(file.size>10*1024*1024){aviso(`O arquivo ${file.name} tem mais de 10 MB.`);continue}
    const marcador={id:Date.now()+Math.random(),tipo,nome:file.name,tamanho:file.size,enviando:true}
    sindicatoAnexosTemp.push(marcador); renderSindicatoAnexosTemp()
    const anexo=await uploadAnexoStorage(file,tipo)
    const idx=sindicatoAnexosTemp.indexOf(marcador)
    if(idx>=0){ if(anexo) sindicatoAnexosTemp[idx]=anexo; else sindicatoAnexosTemp.splice(idx,1) }
    renderSindicatoAnexosTemp()
  }
}
/* ===== v2.7 — anexo único de liberação domingo/feriado (cadastro) ===== */
function anexoLinhaSindHtml(a,removeJs){
  if(a.enviando)return `<div class="anexo-item"><div><b>${esc(a.tipo||"Documento")}</b><br><span class="muted">${esc(a.nome||"")} — enviando...</span></div></div>`
  return `<div class="anexo-item"><div><b>${esc(a.tipo||"Documento")}</b><br><span class="muted">${esc(a.nome||"")} ${a.tamanho?"· "+esc(formatFileSize(a.tamanho)):""}</span></div><div class="anexo-links"><a class="btn small out" href="${esc(anexoLink(a))}" download="${esc(a.nome||"documento")}" target="_blank">Abrir/baixar</a>${removeJs?`<button class="btn small red" onclick="${removeJs}">Remover</button>`:""}</div></div>`
}
function renderSindicatoLiberacaoTemp(){
  const box=document.getElementById("sindLiberacaoLista"); if(!box)return
  box.innerHTML=sindLiberacaoTemp?anexoLinhaSindHtml(sindLiberacaoTemp,"sindLiberacaoTemp=null;renderSindicatoLiberacaoTemp()"):"Nenhum documento anexado."
}
async function addSindicatoLiberacao(files){
  const file=Array.from(files||[])[0]; if(!file)return
  if(file.size>10*1024*1024){aviso(`O arquivo ${file.name} tem mais de 10 MB.`);return}
  const tipo="Liberação domingo/feriado"
  sindLiberacaoTemp={tipo,nome:file.name,tamanho:file.size,enviando:true}; renderSindicatoLiberacaoTemp()
  const anexo=await uploadAnexoStorage(file,tipo)
  sindLiberacaoTemp=anexo; renderSindicatoLiberacaoTemp()
}
/* ===== v2.7 — anexos do modal de edição ===== */
function renderSindEditAnexos(){
  const box=document.getElementById("sindAnexosListaEdit"); if(!box)return
  box.innerHTML=sindEditAnexosTemp.length?sindEditAnexosTemp.map((a,i)=>anexoLinhaSindHtml(a,`sindEditAnexosTemp.splice(${i},1);renderSindEditAnexos()`)).join(""):"Nenhum documento anexado."
}
async function addSindicatoAnexosEdit(files){
  const lista=Array.from(files||[]); if(!lista.length)return
  const tipo=document.getElementById("sindTipoAnexoEdit")?.value||"Documento"
  for(const file of lista){
    if(file.size>10*1024*1024){aviso(`O arquivo ${file.name} tem mais de 10 MB.`);continue}
    const marcador={id:Date.now()+Math.random(),tipo,nome:file.name,tamanho:file.size,enviando:true}
    sindEditAnexosTemp.push(marcador); renderSindEditAnexos()
    const anexo=await uploadAnexoStorage(file,tipo)
    const idx=sindEditAnexosTemp.indexOf(marcador)
    if(idx>=0){ if(anexo) sindEditAnexosTemp[idx]=anexo; else sindEditAnexosTemp.splice(idx,1) }
    renderSindEditAnexos()
  }
}
function renderSindEditLiberacao(){
  const box=document.getElementById("sindLiberacaoListaEdit"); if(!box)return
  box.innerHTML=sindEditLiberacaoTemp?anexoLinhaSindHtml(sindEditLiberacaoTemp,"sindEditLiberacaoTemp=null;renderSindEditLiberacao()"):"Nenhum documento anexado."
}
async function addSindicatoLiberacaoEdit(files){
  const file=Array.from(files||[])[0]; if(!file)return
  if(file.size>10*1024*1024){aviso(`O arquivo ${file.name} tem mais de 10 MB.`);return}
  const tipo="Liberação domingo/feriado"
  sindEditLiberacaoTemp={tipo,nome:file.name,tamanho:file.size,enviando:true}; renderSindEditLiberacao()
  const anexo=await uploadAnexoStorage(file,tipo)
  sindEditLiberacaoTemp=anexo; renderSindEditLiberacao()
}
/* ===== v2.7 — abrir/salvar edição do sindicato em modal ===== */
function abrirEditarSindicato(i){
  const s=state.sindicatos[i]; if(!s)return
  sindEditIdAtual=s.id
  document.getElementById("sindEditIdCampo").value=s.id
  document.getElementById("modalSindEditTitulo").textContent="Editar sindicato — "+(s.nome||"")
  sindNomeEdit.value=s.nome||""; sindRazaoEdit.value=s.razao||""; sindCnpjEdit.value=s.cnpj||""
  sindContatoNomeEdit.value=s.contatoNome||""; sindContatoEdit.value=s.contato||""; sindEmailEdit.value=s.email||""
  document.getElementById("sindStatusDataBaseEdit").value=s.statusDataBase||""
  sindDataBaseEdit.value=s.dataBase||""; sindBeneficioEdit.value=s.beneficio||"Normal"
  sindDomingoFeriadoEdit.value=s.abreDomingoFeriado||""
  sindObsEdit.value=s.obs||""; sindResumoConvencaoEdit.value=s.resumoConvencao||""
  sindEditAnexosTemp=Array.isArray(s.anexos)?clone(s.anexos):[]; renderSindEditAnexos()
  sindEditLiberacaoTemp=s.anexoLiberacao?clone(s.anexoLiberacao):null; renderSindEditLiberacao()
  modalSindEdit.classList.add("open")
}
function fecharEditarSindicato(){modalSindEdit.classList.remove("open")}
function salvarEditarSindicato(){
  const s=state.sindicatos.find(x=>String(x.id)===String(sindEditIdAtual)); if(!s)return aviso("Sindicato não encontrado.")
  const nome=sindNomeEdit.value.trim(); if(!nome)return aviso("Informe o nome do sindicato.")
  s.nome=nome; s.razao=sindRazaoEdit.value.trim(); s.cnpj=sindCnpjEdit.value.trim()
  s.contatoNome=sindContatoNomeEdit.value.trim(); s.contato=sindContatoEdit.value.trim(); s.email=sindEmailEdit.value.trim()
  salvarStatusSindicato(s,document.getElementById("sindStatusDataBaseEdit").value)
  s.dataBase=normalizarMesExtenso(sindDataBaseEdit.value); s.beneficio=sindBeneficioEdit.value
  s.abreDomingoFeriado=sindDomingoFeriadoEdit.value||""
  s.obs=sindObsEdit.value.trim(); s.resumoConvencao=(sindResumoConvencaoEdit.value||"").trim()
  s.anexos=Array.isArray(sindEditAnexosTemp)?sindEditAnexosTemp.slice():[]
  s.anexoLiberacao=sindEditLiberacaoTemp||null
  if(!Array.isArray(s.beneficios))s.beneficios=[]
  state.sindicatos.sort((a,b)=>a.nome.localeCompare(b.nome))
  fecharEditarSindicato(); saved()
}
/* ===== v2.7 — resumo completo e itens de benefício ===== */
function abrirBeneficiosSind(id){
  const s=state.sindicatos.find(x=>String(x.id)===String(id)); if(!s)return
  sindBeneficiosSindId=s.id
  sindBeneficiosTemp=Array.isArray(s.beneficios)?clone(s.beneficios):[]
  sindBenefEditIndex=null
  document.getElementById("modalSindBenefTitulo").textContent="Resumo completo — "+(s.nome||"Sindicato")
  document.getElementById("sindBenefResumoTexto").textContent=s.resumoConvencao||"Nenhum resumo cadastrado."
  document.getElementById("sindBenefNome").value=""; document.getElementById("sindBenefObs").value=""
  document.getElementById("sindBenefBtnAdd").textContent="+ Adicionar item"
  renderBeneficiosSind()
  modalSindBeneficios.classList.add("open")
}
function fecharBeneficiosSind(){modalSindBeneficios.classList.remove("open")}
function renderBeneficiosSind(){
  const box=document.getElementById("sindBenefLista"); if(!box)return
  box.innerHTML=sindBeneficiosTemp.length?sindBeneficiosTemp.map((b,i)=>`<div class="anexo-item"><div style="flex:1"><b>${esc(b.nome||"Item")}</b><br><span class="muted" style="white-space:pre-wrap">${esc(b.obs||"")}</span></div><div class="anexo-links"><button class="btn small out" onclick="editarBeneficioSind(${i})">Alterar</button><button class="btn small red" onclick="removerBeneficioSind(${i})">Remover</button></div></div>`).join(""):"Nenhum item cadastrado."
}
function addBeneficioSind(){
  const nome=document.getElementById("sindBenefNome").value.trim()
  const obs=document.getElementById("sindBenefObs").value.trim()
  if(!nome)return aviso("Informe o nome do item de benefício.")
  if(sindBenefEditIndex!==null){sindBeneficiosTemp[sindBenefEditIndex]={...sindBeneficiosTemp[sindBenefEditIndex],nome,obs}; sindBenefEditIndex=null}
  else{sindBeneficiosTemp.push({id:Date.now()+Math.random(),nome,obs})}
  document.getElementById("sindBenefNome").value=""; document.getElementById("sindBenefObs").value=""
  document.getElementById("sindBenefBtnAdd").textContent="+ Adicionar item"
  salvarBeneficiosSind(); renderBeneficiosSind()
}
function editarBeneficioSind(i){
  const b=sindBeneficiosTemp[i]; if(!b)return
  document.getElementById("sindBenefNome").value=b.nome||""; document.getElementById("sindBenefObs").value=b.obs||""
  document.getElementById("sindBenefBtnAdd").textContent="Salvar item"
  sindBenefEditIndex=i
}
function removerBeneficioSind(i){
  if(!confirm("Remover este item de benefício?"))return
  sindBeneficiosTemp.splice(i,1); if(sindBenefEditIndex===i)sindBenefEditIndex=null
  salvarBeneficiosSind(); renderBeneficiosSind()
}
function salvarBeneficiosSind(){
  const s=state.sindicatos.find(x=>String(x.id)===String(sindBeneficiosSindId)); if(!s)return
  s.beneficios=sindBeneficiosTemp.slice(); save()
}
/* ===== v3.1 — Checklist de benefícios para o cliente (TRAVADO: nunca altera a obs interna do DP) ===== */
function _chkSindAtual(){return state.sindicatos.find(x=>String(x.id)===String(sindBeneficiosSindId))}
function _chkCompAtual(){const d=new Date();return String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()}
function _chkIntroPadrao(){return "Prezado cliente, segue o resumo dos benefícios concedidos aos funcionários e os respectivos descontos, conforme a convenção coletiva vigente. Pedimos a gentileza de conferir e manter sua equipe ciente."}
function _chkRodapePadrao(){return "Em caso de dúvidas, fale com o nosso departamento pessoal."}
function _chkCaixaAlta(s){return !!s && s===s.toUpperCase() && /[A-ZÀ-Ý]/.test(s)}
function _chkParaFrase(s){s=String(s||"").toLowerCase();return s.replace(/(^\s*|[.!?:]\s+)([a-zà-ÿ])/g,function(m,p1,p2){return p1+p2.toUpperCase()})}
function _chkFmt(s){const on=document.getElementById("chkNormaliza");const norm=on?on.checked:true;return (norm&&_chkCaixaAlta(s))?_chkParaFrase(s):s}
function _chkTituloPadrao(){return "Checklist de benefícios e descontos do funcionário"}
function _chkBloco(s){s=_chkFmt(String(s||""));const html=s.split(/\r?\n/).map(function(l){if(!l.trim())return '<div style="height:8px"></div>';return '<p style="margin:0 0 6px;line-height:1.7;text-align:justify">'+esc(l)+'</p>'}).join("");return html||'<p style="margin:0"></p>'}
function abrirChecklistBenef(){
  const s=_chkSindAtual(); if(!s)return aviso("Abra um sindicato primeiro.")
  if(!Array.isArray(s.beneficios)||!s.beneficios.length)return aviso("Cadastre itens de benefício antes de gerar o checklist.")
  const cfg=s.checklistConfig||{}
  document.getElementById("chkTitulo").value=cfg.titulo||_chkTituloPadrao()
  document.getElementById("chkCliente").value=cfg.cliente||s.razao||""
  document.getElementById("chkComp").value=cfg.competencia||_chkCompAtual()
  document.getElementById("chkIntro").value=cfg.intro||_chkIntroPadrao()
  document.getElementById("chkRodape").value=cfg.rodape||_chkRodapePadrao()
  document.getElementById("chkSelAll").checked=true
  renderChecklistItens()
  document.getElementById("modalChecklistBenef").classList.add("open")
}
function fecharChecklistBenef(){salvarChecklistTextos();document.getElementById("modalChecklistBenef").classList.remove("open")}
function renderChecklistItens(){
  const s=_chkSindAtual(); const box=document.getElementById("chkItensBox"); if(!box||!s)return
  box.innerHTML=(s.beneficios||[]).map((b,i)=>`<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px"><label style="display:flex;align-items:center;gap:8px;font-weight:800;cursor:pointer"><input type="checkbox" class="chkItem" data-i="${i}" checked onchange="_chkSyncAll()" style="width:auto"> ${esc(b.nome||"Item")}</label><div style="font-size:12px;color:var(--muted);margin:6px 0 2px">🔒 Texto interno do DP (não vai pro cliente): ${esc(b.obs||"—")}</div><label style="font-size:12px;color:var(--blue);margin-top:6px;text-transform:none;letter-spacing:0">Texto para o cliente</label><textarea class="chkTexto" data-i="${i}" placeholder="Escreva aqui o que o cliente vai ler sobre este benefício..." style="min-height:74px;line-height:1.55;font-size:14px">${esc(b.textoCliente||"")}</textarea></div>`).join("")
}
function toggleChecklistAll(){const v=document.getElementById("chkSelAll").checked;document.querySelectorAll(".chkItem").forEach(c=>c.checked=v)}
function _chkSyncAll(){const all=document.querySelectorAll(".chkItem"),on=document.querySelectorAll(".chkItem:checked");document.getElementById("chkSelAll").checked=all.length===on.length}
function salvarChecklistTextos(){
  const s=_chkSindAtual(); if(!s)return
  document.querySelectorAll(".chkTexto").forEach(t=>{const i=+t.dataset.i; if(s.beneficios[i])s.beneficios[i].textoCliente=t.value})
  s.checklistConfig={titulo:document.getElementById("chkTitulo").value,cliente:document.getElementById("chkCliente").value,competencia:document.getElementById("chkComp").value,intro:document.getElementById("chkIntro").value,rodape:document.getElementById("chkRodape").value}
  if(typeof sindBeneficiosTemp!=="undefined"&&String(sindBeneficiosSindId)===String(s.id))sindBeneficiosTemp=clone(s.beneficios)
  save()
}
function _chkColetaSelecionados(){
  const s=_chkSindAtual(); const out=[]
  document.querySelectorAll(".chkItem").forEach(c=>{if(c.checked){const i=+c.dataset.i;const txt=document.querySelector('.chkTexto[data-i="'+i+'"]');out.push({nome:s.beneficios[i].nome||"Item",texto:(txt?txt.value:s.beneficios[i].textoCliente)||""})}})
  return out
}
function _chkDocHTML(){
  const s=_chkSindAtual()
  const cliente=esc(document.getElementById("chkCliente").value||"")
  const comp=esc(document.getElementById("chkComp").value||"")
  const titEl=document.getElementById("chkTitulo")
  const titulo=esc((titEl&&titEl.value.trim())||_chkTituloPadrao())
  const introHTML=_chkBloco(document.getElementById("chkIntro").value||"")
  const rodapeHTML=_chkBloco(document.getElementById("chkRodape").value||"")
  const itens=_chkColetaSelecionados()
  const hoje=new Date().toLocaleDateString("pt-BR")
  if(!itens.length)return '<p>Nenhum item selecionado.</p>'
  const linhas=itens.map(it=>`<tr><td style="vertical-align:top;width:24px;font-size:16px;color:#166534;padding:3px 0 0">&#9745;</td><td style="padding:0 0 16px 6px"><b style="font-size:15px;color:#1B3A6B">${esc(_chkFmt(it.nome))}</b><div style="margin:4px 0 0;color:#333;font-size:14px">${_chkBloco(it.texto)}</div></td></tr>`).join("")
  return `<div style="font-family:Segoe UI,Arial,sans-serif;color:#172033;max-width:680px;margin:0 auto;font-size:14px;line-height:1.7;padding:8px"><h2 style="margin:0 0 2px;color:#1B3A6B;font-size:20px">${titulo}</h2><p style="margin:0;color:#666;font-size:13px">Cliente: <b>${cliente||"—"}</b> &nbsp;·&nbsp; Sindicato: <b>${esc(s.nome||"—")}</b> &nbsp;·&nbsp; Competência: <b>${comp||"—"}</b></p><hr style="border:none;border-top:2px solid #d8e0ea;margin:14px 0"><div style="margin:0 0 16px;color:#333">${introHTML}</div><table style="width:100%;border-collapse:collapse">${linhas}</table><hr style="border:none;border-top:1px solid #d8e0ea;margin:8px 0 14px"><div style="color:#444;margin:0">${rodapeHTML}</div><p style="color:#999;font-size:12px;margin:20px 0 0">Documento gerado em ${hoje}.</p></div>`
}
function imprimirChecklist(){
  salvarChecklistTextos()
  const w=window.open("","_blank"); if(!w)return aviso("Permita pop-ups para imprimir.")
  w.document.write('<html><head><meta charset="utf-8"><title>Checklist de benefícios</title></head><body style="margin:24px">'+_chkDocHTML()+'</body></html>')
  w.document.close(); w.focus(); setTimeout(()=>{w.print()},300)
}
function exportarChecklistPDF(){imprimirChecklist()}
function exportarChecklistWord(){
  salvarChecklistTextos()
  const html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>'+_chkDocHTML()+'</body></html>'
  const blob=new Blob(['﻿'+html],{type:"application/msword"})
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob)
  const nome=(document.getElementById("chkCliente").value||"cliente").replace(/[^\w]+/g,"_")
  a.download="checklist_beneficios_"+nome+".doc"; document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
function salvarSindicatoCadastro(){
  const nome=sindNomeCad.value.trim()
  if(!nome)return aviso("Informe o nome do sindicato.")
  let s=state.sindicatos.find(x=>x.nome===nome)
  if(!s){s={id:Date.now(),nome:""}; state.sindicatos.push(s)}
  s.nome=nome
  s.razao=sindRazaoCad.value.trim()
  s.cnpj=sindCnpjCad.value.trim()
  s.contatoNome=sindContatoNomeCad.value.trim()
  s.contato=sindContatoCad.value.trim()
  s.email=sindEmailCad.value.trim()
  salvarStatusSindicato(s,document.getElementById("sindStatusDataBaseCad").value)
  s.dataBase=normalizarMesExtenso(sindDataBaseCad.value)
  s.beneficio=sindBeneficioCad.value
  s.obs=sindObsCad.value.trim()
  s.resumoConvencao=(document.getElementById("sindResumoConvencaoCad")?.value||"").trim()
  s.anexos=Array.isArray(sindicatoAnexosTemp)?sindicatoAnexosTemp.slice():[]
  s.abreDomingoFeriado=document.getElementById("sindDomingoFeriadoCad")?.value||""
  s.anexoLiberacao=sindLiberacaoTemp||null
  if(!Array.isArray(s.beneficios))s.beneficios=[]
  state.sindicatos.sort((a,b)=>a.nome.localeCompare(b.nome))
  sindNomeCad.value=sindRazaoCad.value=sindCnpjCad.value=sindContatoNomeCad.value=sindContatoCad.value=sindEmailCad.value=sindDataBaseCad.value=sindObsCad.value=""
  if(document.getElementById("sindResumoConvencaoCad"))sindResumoConvencaoCad.value=""
  if(document.getElementById("sindDomingoFeriadoCad"))sindDomingoFeriadoCad.value=""
  sindLiberacaoTemp=null; renderSindicatoLiberacaoTemp()
  sindicatoAnexosTemp=[]; renderSindicatoAnexosTemp()
  sindBeneficioCad.value="Normal"
  document.getElementById("sindStatusDataBaseCad").value=""
  saved()
}
function carregarSindicatoCadastro(i){
  const s=state.sindicatos[i]; if(!s)return
  document.getElementById("sindStatusDataBaseCad").value=s.statusDataBase||""
  sindNomeCad.value=s.nome||""; sindRazaoCad.value=s.razao||""; sindCnpjCad.value=s.cnpj||""; sindContatoNomeCad.value=s.contatoNome||""; sindContatoCad.value=s.contato||""; sindEmailCad.value=s.email||""; sindDataBaseCad.value=s.dataBase||""; sindBeneficioCad.value=s.beneficio||"Normal"; sindObsCad.value=s.obs||""
  if(document.getElementById("sindResumoConvencaoCad"))sindResumoConvencaoCad.value=s.resumoConvencao||""
  sindicatoAnexosTemp=Array.isArray(s.anexos)?clone(s.anexos):[]; renderSindicatoAnexosTemp()
  show("sindicatos"); window.scrollTo({top:0,behavior:"smooth"})
}
function empresasVinculadasAoSindicato(nome){
  const alvo=String(nome||"").trim().toLowerCase()
  if(!alvo)return []
  return (state.empresas||[]).filter(emp=>{
    const principal=String(emp.sindicato||"").trim().toLowerCase()
    if(principal===alvo)return true
    const adic=(Array.isArray(emp.sindicatosAdicionais)?emp.sindicatosAdicionais:[])
      .map(x=>String(sindicatoNomeFromItem(x)||"").trim().toLowerCase())
    if(adic.includes(alvo))return true
    const detalhes=(Array.isArray(emp.sindicatosAdicionaisDetalhes)?emp.sindicatosAdicionaisDetalhes:[])
      .map(x=>String(x?.nome||"").trim().toLowerCase())
    return detalhes.includes(alvo)
  })
}
function excluirSindicato(i){
  const s=state.sindicatos[i]; if(!s)return
  const vinc=empresasVinculadasAoSindicato(s.nome)
  if(vinc.length){
    if(!confirm("⚠️ ATENÇÃO\n\nO sindicato \""+s.nome+"\" possui "+vinc.length+" empresa(s) vinculada(s):\n\n"+vinc.map(e=>"• "+(e.codigo?e.codigo+" - ":"")+e.nome).join("\n")+"\n\nSe excluir, essas empresas ficarão SEM esse sindicato vinculado.\n\nDeseja excluir mesmo assim?"))return
    if(!confirm("Confirmar exclusão de \""+s.nome+"\"?\n\nEsta é a segunda e última confirmação. Não pode ser desfeita."))return
  }else{
    if(!confirm("Excluir o sindicato \""+s.nome+"\"?\n\nEle não possui nenhuma empresa vinculada.\n\nEsta ação não pode ser desfeita."))return
  }
  state.sindicatos.splice(i,1)
  saved()
}
function renderSindicatos(){
  if(typeof tabSindicatos==="undefined")return
  const b=(document.getElementById("sindBusca")?.value||"").toLowerCase()
  const lista=(state.sindicatos||[]).filter(s=>!b||[s.nome,s.razao,s.cnpj,s.contatoNome,s.contato,s.email,s.dataBase,s.beneficio,s.obs,s.resumoConvencao,(s.anexos||[]).map(a=>a.nome).join(" ")].join(" ").toLowerCase().includes(b))
  tabSindicatos.innerHTML='<thead><tr><th>Sindicato</th><th>Contato</th><th>E-mail</th><th>Data-base</th><th>Benefício</th><th>Anexos</th><th>Resumo</th><th>Ação</th></tr></thead><tbody>'+lista.map(s=>{const i=state.sindicatos.indexOf(s);const nVinc=empresasVinculadasAoSindicato(s.nome).length;const btnExcluir=`<button class="btn small red" onclick="excluirSindicato(${i})" title="${nVinc?('Excluir — atenção: possui '+nVinc+' empresa(s) vinculada(s)'):'Excluir sindicato'}">Excluir</button>${nVinc?` <span class="muted" style="font-size:11px" title="Empresas vinculadas">(${nVinc})</span>`:''}`;return `<tr><td><button class="link-btn" onclick="abrirSindicato('${esc(s.nome).replaceAll("'","&#39;")}')">${esc(s.nome)}</button></td><td>${esc(s.contatoNome||"")}<br><span class="muted">${esc(s.contato||"")}</span></td><td>${esc(s.email||"")}</td><td>${esc(s.dataBase||"")}</td><td>${esc(s.beneficio||"")}</td><td>${(s.anexos||[]).length}</td><td>${s.resumoConvencao?'<span class="badge ok">Com resumo</span>':'<span class="badge pend">Sem resumo</span>'}</td><td style="white-space:nowrap"><button class="btn small out" onclick="abrirEditarSindicato(${i})">Editar</button> ${btnExcluir}</td></tr>`}).join("")+'</tbody>'
}
function abrirSindicato(nome){
  const s=(state.sindicatos||[]).find(x=>x.nome===nome) || {nome}
  modalSindTitulo.textContent=s.nome||"Sindicato"
  modalSindConteudo.innerHTML=`<div class="sind-grid">
    <div class="sind-info"><b>Razão Social</b>${esc(s.razao||"Não informado")}</div>
    <div class="sind-info"><b>CNPJ</b>${esc(s.cnpj||"Não informado")}</div>
    <div class="sind-info"><b>Nome do contato</b>${esc(s.contatoNome||"Não informado")}</div>
    <div class="sind-info"><b>Telefone/WhatsApp</b>${esc(s.contato||"Não informado")}</div>
    <div class="sind-info"><b>E-mail</b>${esc(s.email||"Não informado")}</div>
    <div class="sind-info"><b>Data-base</b>${esc(s.dataBase||"Não informado")}</div>
    <div class="sind-info"><b>Benefício</b>${esc(s.beneficio||"Não informado")}</div>
    <div class="sind-info"><b>Abre domingos/feriados</b>${esc(s.abreDomingoFeriado||"Não informado")}${s.anexoLiberacao?` · <a href="${esc(anexoLink(s.anexoLiberacao))}" download="${esc(s.anexoLiberacao.nome||"liberacao")}" target="_blank">📎 liberação</a>`:""}</div>
    <div class="sind-info"><b>Empresas vinculadas</b>${state.empresas.filter(e=>e.sindicato===s.nome).map(e=>esc(e.codigo+" - "+e.nome)).join("<br>")||"Nenhuma"}</div>
    <div class="sind-info" style="grid-column:1/-1"><b>Observações</b>${esc(s.obs||"")}</div>
    <div class="sind-info" style="grid-column:1/-1"><b>Resumo da convenção / circular</b><div class="sind-resumo-scroll" style="white-space:pre-wrap">${esc(s.resumoConvencao||"Nenhum resumo cadastrado.")}</div><div style="margin-top:10px"><button class="btn small pri" onclick="abrirBeneficiosSind('${esc(s.id)}')">Resumo completo / Benefícios (${(s.beneficios||[]).length})</button></div></div>
    <div class="sind-info" style="grid-column:1/-1"><b>Anexos</b>${(s.anexos||[]).length?(s.anexos||[]).map(a=>`<div class="anexo-item"><div>${esc(a.tipo||"Documento")}<br><span class="muted">${esc(a.nome||"")} ${a.tamanho?"· "+esc(formatFileSize(a.tamanho)):""}</span></div><a class="btn small out" href="${esc(anexoLink(a))}" download="${esc(a.nome||"documento")}" target="_blank">Abrir/baixar</a></div>`).join(""):"Nenhum documento anexado."}</div>
  </div>`
  modalSindicato.classList.add("open")
}
function fecharSindicato(){modalSindicato.classList.remove("open")}

function fmtMesRefLocal(v){
  if(!v)return ""
  const [a,m]=String(v).split("-")
  const nomes=["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  return (nomes[Number(m)]||m)+"/"+a
}
