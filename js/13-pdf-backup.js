function montarHtmlRelatorioPDF(){
  popularRelatorioFiltros()
  const competenciaRel=relCompetenciaFiltro()
  const empRel=relEmpresaFiltro()
  const excluidos=codigosExcluidosRelatorio()
  const rows=relRows(competenciaRel, empresasRelatorioSelecionadas())
  let atualEmp="", atualFunc="", corpo=""
  rows.forEach((r,idx)=>{
    if(r.codEmp!==atualEmp){
      atualEmp=r.codEmp; atualFunc=""
      corpo+=`<tr class="empresa"><td colspan="7">Empresa ${esc(r.codEmp)} - ${esc(r.empresa)} | Sindicato: ${esc(r.sind)} | Data-base: ${esc(r.db)} | Status: ${esc(r.dbStatus)} ${r.dissidio?" | "+esc(r.dissidio):""}</td></tr>`
    }
    if(r.codFunc!==atualFunc){
      atualFunc=r.codFunc
      corpo+=`<tr class="func"><td colspan="7" style="text-align:left;padding-left:0"><span style="font-weight:950;font-size:12.8px;color:#1B3A6B">${esc(r.codFunc)} - ${esc(r.func)}</span> | ${esc(r.funcao||"Sem função")} | <span class="salario">Salário: R$ ${money(r.sal)}</span></td></tr>`
      corpo+=`<tr><th class="pdf-cod">Cód. Evento</th><th>Evento</th><th class="pdf-valor">Valor/Qtd</th><th class="pdf-data">Início</th><th class="pdf-data">Fim</th><th>Observação</th><th>Evento Padrão</th></tr>`
    }
    corpo+=`<tr><td class="pdf-cod"><b>${esc(r.codEvento)}</b></td><td>${esc(r.evento)}</td><td class="pdf-valor">${esc(r.valor)}</td><td class="pdf-data">${esc(fmtMesAnoRel(r.inicio||""))}</td><td class="pdf-data">${esc(fmtMesAnoRel(r.fim||""))}</td><td class="pdf-obs">${esc(r.obs)}</td><td>${esc(r.eventoPadrao||"Não")}</td></tr>`
    if((idx===rows.length-1||rows[idx+1].codEmp!==r.codEmp||rows[idx+1].codFunc!==r.codFunc)&&r.obsConferencia)corpo+=`<tr class="func"><td colspan="7" style="white-space:pre-wrap;text-align:left"><b>Observação de conferência:</b> ${esc(r.obsConferencia)}</td></tr>`
  })
  const alvo=empRel?`Empresa selecionada: ${esc(empRel)}`:"Todas as empresas"
  const exc=(!empRel && excluidos.length)?` | Excluídas: ${esc(excluidos.join(", "))}`:""
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de lançamento - ${esc(fmtMesAnoRel(competenciaRel))}</title><style>
    @page{size:A4 portrait;margin:5mm}
    *{box-sizing:border-box}
    body{font-family:Segoe UI,Arial,sans-serif;color:#172033;margin:4px;font-size:11.8px;line-height:1.05;background:#fff}
    h1{font-size:14px;margin:0 0 1px;color:#1B3A6B;letter-spacing:.01em}
    p{margin:0;color:#475467;font-size:10.7px}
    .top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;border-bottom:2px solid #1B3A6B;padding-bottom:3px;margin-bottom:4px}
    .btn-print{border:0;border-radius:8px;background:#1B3A6B;color:#fff;padding:9px 12px;font-weight:700;cursor:pointer}
    table{width:100%;border-collapse:collapse;table-layout:auto}
    th{background:#f1f5f9;text-align:left;font-size:10.4px;padding:1.5px 2px;border:1px solid #cfd8e3;line-height:1.03}
    td{padding:1.5px 2px;border:1px solid #e1e7ef;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;line-height:1.04;font-size:11.8px}
    .empresa td{background:#dbeafe;color:#1B3A6B;font-weight:900;font-size:11.5px;padding:2px 3px;border-top:2px solid #1B3A6B;border-bottom:1.5px solid #93b4e8;line-height:1.04;text-align:left}
    .func td{background:#eef6ff;color:#172033;font-weight:800;font-size:11.6px;padding:2px 3px 2px 0;border-left:0;line-height:1.04;text-align:left}
    .salario{font-weight:900;font-size:12.3px;color:#0f172a}
    th:nth-child(1),td:nth-child(1){width:10.5ch;max-width:10.5ch;text-align:center}
    th:nth-child(2),td:nth-child(2){width:20%}
    th:nth-child(3),td:nth-child(3){width:11ch;max-width:11ch;text-align:center}
    th:nth-child(4),td:nth-child(4){width:10.5ch;max-width:10.5ch;text-align:center}
    th:nth-child(5),td:nth-child(5){width:10.5ch;max-width:10.5ch;text-align:center}
    th:nth-child(6),td:nth-child(6){width:auto}
    .pdf-cod{width:10.5ch;max-width:10.5ch;white-space:normal;overflow-wrap:break-word}
    .pdf-valor{width:11ch;max-width:11ch;white-space:normal;overflow-wrap:anywhere}
    .pdf-data{width:10.5ch;max-width:10.5ch;white-space:normal;overflow-wrap:anywhere}
    .pdf-obs{width:auto;font-size:11.6px;line-height:1.04;white-space:normal;overflow-wrap:anywhere}
    @media print{body{margin:0;font-size:11.8px}.btn-print{display:none}.top{position:static}thead{display:table-header-group}tr{page-break-inside:avoid;break-inside:avoid}.empresa{page-break-after:avoid}.func{page-break-after:avoid}}
  </style></head><body><div class="top"><div style="display:flex;align-items:center;gap:10px"><img src="${LOGO_SRC}" style="width:52px;height:52px;object-fit:contain;border-radius:6px" alt="Vital"><div><h1>Relatório de lançamento da folha</h1><p>Competência: <b>${esc(fmtMesAnoRel(competenciaRel))}</b> | ${alvo}${exc}</p></div></div><button class="btn-print" onclick="window.print()">Salvar em PDF / Imprimir</button></div><table><colgroup><col style="width:10.5ch"><col style="width:18%"><col style="width:11ch"><col style="width:10.5ch"><col style="width:10.5ch"><col><col style="width:11ch"></colgroup>${corpo||'<tr><td>Nenhum lançamento encontrado.</td></tr>'}</table><script>setTimeout(()=>window.print(),500)<\/script></body></html>`
}
function gerarPDFRelatorio(){
  const w=window.open("","_blank")
  if(!w)return aviso("O navegador bloqueou a janela do PDF. Libere pop-ups para este arquivo e tente novamente.")
  w.document.open()
  w.document.write(montarHtmlRelatorioPDF())
  w.document.close()
}
function csv(){const rows=relRows(relCompetenciaFiltro(), empresasRelatorioSelecionadas()); const h=["competencia","codigo_empresa","empresa","sindicato","data_base","status_data_base","codigo_funcionario","funcionario","funcao","salario","codigo_evento","evento","valor","inicio","fim","observacao","evento_padrao","status_funcionario","status_evento"]; return [h.join(";")].concat(rows.map(r=>[r.comp,r.codEmp,r.empresa,r.sind,r.db,r.dbStatus,r.codFunc,r.func,r.funcao,r.sal,r.codEvento,r.evento,r.valor,r.inicio,r.fim,r.obs,r.eventoPadrao,r.statusFunc,r.statusEvento].map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(";"))).join("\n")}
function downloadCSV(){const blob=new Blob(["\ufeff"+csv()],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="folha_lancamentos_"+relCompetenciaFiltro()+".csv"; a.click()}
function copyCSV(){navigator.clipboard.writeText(csv()).then(()=>aviso("Relatório copiado."))}
function backup(){}
function toggleDadosTecnicos(){const area=document.getElementById("dadosTecnicosArea");const aberto=area.style.display!=="none";area.style.display=aberto?"none":"block";if(!aberto)document.getElementById("backupTxt").value=JSON.stringify(state,null,2)}
function downloadBackup(){const now=new Date();const d=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");const h=String(now.getHours()).padStart(2,"0")+"h"+String(now.getMinutes()).padStart(2,"0");const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="backup_fechamento_folha_"+d+"_"+h+".json"; a.click();const info=document.getElementById("ultimoBackupInfo");if(info)info.textContent="Último backup gerado em: "+d+" às "+h.replace("h",":")}
function restoreBackup(ev){const file=ev.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{try{state=normalizarState(JSON.parse(r.result)); save(); popularEmpresas(); renderAll(); aviso("Backup restaurado e sincronizado com o Supabase.")}catch(e){aviso("Arquivo inválido.")}}; r.readAsText(file)}
function resetAppConfirm(){if(!confirm("⚠️ ATENÇÃO\n\nEsta ação irá apagar todos os dados salvos neste navegador e no Supabase, e deixar o sistema vazio (só com o catálogo padrão de eventos).\n\nIsso não pode ser desfeito.\n\nBaixe um backup antes de continuar!\n\nDeseja realmente resetar?")){return}if(!confirm("Confirmar reset? Esta é a segunda e última confirmação.")){return}localStorage.removeItem(KEY); const s=clone(SEED); state=normalizarState(s); save(); popularEmpresas(); renderAll()}

