// ===================== v9 FINAL: ASO, LAUDOS SST E FÉRIAS =====================
function hojeISO(){return new Date().toISOString().slice(0,10)}
function parseISODate(v){if(!v)return null; const d=new Date(String(v)+'T00:00:00'); return isNaN(d)?null:d}
function addMesesISO(v,meses){const d=parseISODate(v); if(!d)return ''; const dia=d.getDate(); const r=new Date(d); r.setMonth(r.getMonth()+Number(meses||0)); if(r.getDate()<dia)r.setDate(0); return r.toISOString().slice(0,10)}
function addDiasISO(v,dias){const d=parseISODate(v); if(!d)return ''; d.setDate(d.getDate()+Number(dias||0)); return d.toISOString().slice(0,10)}
function diffDias(v){const d=parseISODate(v); if(!d)return null; const h=parseISODate(hojeISO()); return Math.ceil((d-h)/86400000)}
function fmtDataBR(v){const d=parseISODate(v); if(!d)return ''; return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}
function statusVencimento(dataVenc){if(!dataVenc)return {cod:'SEM_DATA',txt:'Sem data',cls:'mod-status-alerta',dias:null}; const dias=diffDias(dataVenc); if(dias<0)return {cod:'VENCIDO',txt:'Vencido',cls:'mod-status-vencido',dias}; if(dias<=10)return {cod:'ALERTA',txt:'Vence em 10 dias',cls:'mod-status-alerta',dias}; return {cod:'OK',txt:'Em dia',cls:'mod-status-ok',dias}}
function funcionariosOperacionaisTeste(){const c=comp(); const arr=[]; empresasAtivas().forEach(e=>(e.funcionarios||[]).forEach(f=>{if(funcionarioAtivoNaCompetencia(f,c))arr.push({e,f})})); return arr}
function popularSelectsModulos(){
  const optsTodas='<option value="">Todas</option>'+empresasAtivas().map(e=>`<option value="${esc(e.codigo)}">${esc(e.codigo)} - ${esc(e.nome)}</option>`).join('')
  ;['asoEmpFiltro','laudoEmpFiltro','feriasEmpFiltro'].forEach(id=>{const el=document.getElementById(id); if(el){const v=el.value; el.innerHTML=optsTodas; if(v)el.value=v}})
  const opts=empresasAtivas().map(e=>`<option value="${esc(e.codigo)}">${esc(e.codigo)} - ${esc(e.nome)}</option>`).join('')
  const ln=document.getElementById('laudoEmpNovo'); if(ln){const v=ln.value; ln.innerHTML=opts; if(v)ln.value=v}
}
function asoRec(empCod,funCod){if(!Array.isArray(state.asos))state.asos=[]; let r=state.asos.find(x=>String(x.empCod)===String(empCod)&&String(x.funCod)===String(funCod)); if(!r){r={empCod,funCod,ultimo:'',prazo:12,obs:''}; state.asos.push(r)} return r}
function salvarASOTeste(empCod,funCod){const r=asoRec(empCod,funCod); r.ultimo=document.getElementById(`asoData_${empCod}_${funCod}`)?.value||''; r.prazo=Number(document.getElementById(`asoPrazo_${empCod}_${funCod}`)?.value||12); r.obs=document.getElementById(`asoObs_${empCod}_${funCod}`)?.value||''; saved()}
function renderASO(){popularSelectsModulos(); const empF=document.getElementById('asoEmpFiltro')?.value||''; const stF=document.getElementById('asoStatusFiltro')?.value||''; const busca=(document.getElementById('asoBusca')?.value||'').toLowerCase(); let rows=[]; let k={total:0,ok:0,alerta:0,vencido:0}; funcionariosOperacionaisTeste().forEach(({e,f})=>{if(empF&&String(e.codigo)!==String(empF))return; const txt=[e.nome,e.codigo,f.nome,f.codigo,f.funcao].join(' ').toLowerCase(); if(busca&&!txt.includes(busca))return; const r=asoRec(e.codigo,f.codigo); const venc=addMesesISO(r.ultimo,r.prazo||12); const st=statusVencimento(venc); if(stF&&st.cod!==stF)return; k.total++; if(st.cod==='OK')k.ok++; if(st.cod==='ALERTA')k.alerta++; if(st.cod==='VENCIDO')k.vencido++; rows.push({e,f,r,venc,st})});
  if(asoTotal){asoTotal.textContent=k.total; asoOk.textContent=k.ok; asoAlerta.textContent=k.alerta; asoVencido.textContent=k.vencido}
  const tab=document.getElementById('tabASO'); if(!tab)return; tab.innerHTML='<thead><tr><th>Funcionário</th><th>Empresa</th><th>Função</th><th>Último ASO</th><th>Prazo</th><th>Vencimento</th><th>Status</th><th>Dias</th><th>Observação</th><th>Ação</th></tr></thead><tbody>'+rows.map(x=>{const id=`${x.e.codigo}_${x.f.codigo}`; return `<tr><td><b>${esc(x.f.nome)}</b><div class="mod-mini">Cód. ${esc(x.f.codigo)}</div></td><td>${esc(x.e.nome)}</td><td>${esc(x.f.funcao||'')}</td><td><input id="asoData_${id}" type="date" value="${esc(x.r.ultimo||'')}"></td><td><input id="asoPrazo_${id}" type="number" min="1" value="${esc(x.r.prazo||12)}" style="width:80px"></td><td>${esc(fmtDataBR(x.venc)||'-')}</td><td><span class="badge ${x.st.cls}">${esc(x.st.txt)}</span></td><td>${x.st.dias===null?'-':esc(x.st.dias+' dias')}</td><td><input id="asoObs_${id}" value="${esc(x.r.obs||'')}" placeholder="Obs."></td><td><button class="btn small pri" onclick="salvarASOTeste('${esc(x.e.codigo)}','${esc(x.f.codigo)}')">Salvar</button></td></tr>`}).join('')+'</tbody>'}
function salvarLaudoTeste(){
  if(!Array.isArray(state.laudos))state.laudos=[];
  const empCod=laudoEmpNovo.value;
  const tipo=laudoTipoNovo.value;
  if(!empCod||!tipo)return alert('Informe empresa e tipo de laudo.');
  let r=state.laudos.find(x=>String(x.empCod)===String(empCod)&&String(x.tipo)===String(tipo));
  if(!r){r={id:Date.now()+Math.random(),empCod,tipo,grauRisco:'',ultimo:'',prazo:12,obs:''}; state.laudos.push(r)}
  r.grauRisco=laudoRiscoNovo?.value||'';
  r.ultimo=laudoDataNovo.value||'';
  r.prazo=Number(laudoPrazoNovo.value||12);
  r.obs=laudoObsNovo.value||'';
  saved();
}
function salvarLaudoLinhaTeste(id){
  const r=(state.laudos||[]).find(x=>String(x.id)===String(id));
  if(!r)return;
  const pref=`laudoLin_${id}`;
  // TRAVADO: a empresa do laudo não é alterada na relação abaixo; seleção de empresa fica somente no cadastro superior.
  r.tipo=document.getElementById(`${pref}_tipo`)?.value||r.tipo;
  r.grauRisco=document.getElementById(`${pref}_risco`)?.value||'';
  r.ultimo=document.getElementById(`${pref}_ultimo`)?.value||'';
  r.prazo=Number(document.getElementById(`${pref}_prazo`)?.value||12);
  r.obs=document.getElementById(`${pref}_obs`)?.value||'';
  saved();
}
function excluirLaudoTeste(id){if(!confirm('Excluir este laudo?'))return; state.laudos=(state.laudos||[]).filter(x=>String(x.id)!==String(id)); saved()}
function renderLaudos(){
  popularSelectsModulos();
  if(!Array.isArray(state.laudos))state.laudos=[];
  const empF=laudoEmpFiltro?.value||'';
  const tipoF=laudoTipoFiltro?.value||'';
  const stF=laudoStatusFiltro?.value||'';
  const busca=(laudoBusca?.value||'').toLowerCase();
  let rows=[]; let k={total:0,ok:0,alerta:0,vencido:0};
  state.laudos.forEach(r=>{
    if(r.grauRisco===undefined)r.grauRisco='';
    const e=state.empresas.find(x=>String(x.codigo)===String(r.empCod));
    if(!e||!empresaAtivaNaCompetencia(e,comp()))return;
    if(empF&&String(r.empCod)!==String(empF))return;
    if(tipoF&&String(r.tipo)!==String(tipoF))return;
    const venc=addMesesISO(r.ultimo,r.prazo||12);
    const st=statusVencimento(venc);
    if(stF&&st.cod!==stF)return;
    const txt=[e.nome,e.codigo,r.tipo,r.grauRisco,r.obs].join(' ').toLowerCase();
    if(busca&&!txt.includes(busca))return;
    k.total++; if(st.cod==='OK')k.ok++; if(st.cod==='ALERTA')k.alerta++; if(st.cod==='VENCIDO')k.vencido++;
    rows.push({e,r,venc,st})
  });
  if(laudoTotal){laudoTotal.textContent=k.total; laudoOk.textContent=k.ok; laudoAlerta.textContent=k.alerta; laudoVencido.textContent=k.vencido}
  const tab=document.getElementById('tabLaudos'); if(!tab)return;
  tab.innerHTML='<thead><tr><th>Código / Empresa</th><th>Tipo</th><th>Grau de risco</th><th>Último laudo</th><th>Prazo</th><th>Vencimento</th><th>Status</th><th>Dias</th><th>Observação</th><th>Ações</th></tr></thead><tbody>'+rows.map(x=>`<tr><td><b>${esc(x.e.codigo)} - ${esc(x.e.nome)}</b><div class="mod-mini">Empresa definida no cadastro do laudo</div></td><td>${esc(x.r.tipo||'-')}</td><td>${esc(x.r.grauRisco||'Não informado')}</td><td>${esc(fmtDataBR(x.r.ultimo)||'-')}</td><td>${esc(x.r.prazo||12)} meses</td><td>${esc(fmtDataBR(x.venc)||'-')}</td><td><span class="badge ${x.st.cls}">${esc(x.st.txt)}</span></td><td>${x.st.dias===null?'-':esc(x.st.dias+' dias')}</td><td>${esc(x.r.obs||'-')}</td><td><div class="action-line"><button class="btn small pri" onclick="abrirEditarLaudoTeste('${esc(x.r.id)}')">Editar</button><button class="btn small red" onclick="excluirLaudoTeste('${esc(x.r.id)}')">Excluir</button></div></td></tr>`).join('')+'</tbody>'
}
function abrirEditarLaudoTeste(id){
  const r=(state.laudos||[]).find(x=>String(x.id)===String(id));
  if(!r)return;
  const e=state.empresas.find(x=>String(x.codigo)===String(r.empCod));
  document.getElementById('laudoEditId').value=r.id;
  document.getElementById('laudoEditEmpresaInfo').textContent=e?`${e.codigo} - ${e.nome}`:'Empresa não localizada';
  document.getElementById('laudoEditTipo').value=r.tipo||'PCMSO';
  document.getElementById('laudoEditRisco').value=r.grauRisco||'';
  document.getElementById('laudoEditUltimo').value=r.ultimo||'';
  document.getElementById('laudoEditPrazo').value=r.prazo||12;
  document.getElementById('laudoEditObs').value=r.obs||'';
  document.getElementById('modalLaudoTeste')?.classList.add('open');
  document.body.classList.add('modal-aberto');
}
function fecharEditarLaudoTeste(){
  document.getElementById('modalLaudoTeste')?.classList.remove('open');
  document.body.classList.remove('modal-aberto');
}
function salvarLaudoModalTeste(){
  const id=document.getElementById('laudoEditId')?.value;
  const r=(state.laudos||[]).find(x=>String(x.id)===String(id));
  if(!r)return;
  r.tipo=document.getElementById('laudoEditTipo')?.value||'PCMSO';
  r.grauRisco=document.getElementById('laudoEditRisco')?.value||'';
  r.ultimo=document.getElementById('laudoEditUltimo')?.value||'';
  r.prazo=Number(document.getElementById('laudoEditPrazo')?.value||12);
  r.obs=document.getElementById('laudoEditObs')?.value||'';
  fecharEditarLaudoTeste();
  saved();
}
function feriasRec(empCod,funCod){if(!Array.isArray(state.ferias))state.ferias=[]; let r=state.ferias.find(x=>String(x.empCod)===String(empCod)&&String(x.funCod)===String(funCod)); if(!r){r={empCod,funCod,ultimoInicio:'',ultimoFim:'',obs:''}; state.ferias.push(r)} return r}
function periodoPorIndiceFerias(baseIni,indice){
  const ini=addMesesISO(baseIni,12*(indice-1));
  const fim=addDiasISO(addMesesISO(ini,12),-1);
  const venc=addMesesISO(fim,12);
  const limite=addMesesISO(venc,-1);
  const alerta=addDiasISO(limite,-15);
  return {ini,fim,venc,limite,alerta};
}
function analiseFerias(f,r){
  if(!f.admissao)return {semAdmissao:true,baseIni:'',periodoAtual:{},prazoPrimeiro:'',periodosAbertos:0,periodosVencidosGozo:0,limiteCritico:'',alertaCritico:'',limiteMaisAntigo:'',alertaMaisAntigo:'',cod:'SEM_ADMISSAO',txt:'Sem admissão',cls:'mod-status-alerta'};
  const baseIni=r.ultimoFim?addDiasISO(r.ultimoFim,1):f.admissao;
  const hoje=hojeISO();
  let periodosAbertos=0;
  let periodosVencidosGozo=0;
  for(let i=1;i<=20;i++){
    const p=periodoPorIndiceFerias(baseIni,i);
    if(p.fim && hoje>=p.fim)periodosAbertos=i; else break;
  }
  for(let i=1;i<=20;i++){
    const p=periodoPorIndiceFerias(baseIni,i);
    if(p.venc && hoje>p.venc)periodosVencidosGozo=i; else break;
  }
  const periodoAtual=periodoPorIndiceFerias(baseIni,1);
  const antigo=periodoAtual;
  let proximo=antigo;
  for(let i=1;i<=20;i++){
    const p=periodoPorIndiceFerias(baseIni,i);
    if(p.limite && hoje<=p.limite){proximo=p; break;}
  }
  let cod='OK',txt='Férias OK',cls='mod-status-ok';
  if(periodosAbertos>=3){cod='VENCIDO_2PLUS'; txt=`${periodosAbertos} períodos acumulados`; cls='mod-status-vencido'}
  else if(periodosAbertos>=2){cod='VENCIDO_2PLUS'; txt='2 períodos acumulados'; cls='mod-status-vencido'}
  else if(periodosVencidosGozo===1){cod='VENCIDO_1'; txt='1 período vencido'; cls='mod-status-vencido'}
  else if(antigo.alerta && hoje>=antigo.alerta){cod='ALERTA_15'; txt='Alerta 15 dias'; cls='mod-status-alerta'}
  return {
    semAdmissao:false,
    baseIni,
    periodoAtual,
    prazoPrimeiro:antigo.venc,
    periodosAbertos,
    periodosVencidos:periodosAbertos,
    periodosVencidosGozo,
    limiteCritico:proximo.limite,
    alertaCritico:proximo.alerta,
    limiteMaisAntigo:antigo.limite,
    alertaMaisAntigo:antigo.alerta,
    cod,txt,cls
  };
}
function statusFerias(f,r){return analiseFerias(f,r)}
function salvarFeriasTeste(empCod,funCod){const r=feriasRec(empCod,funCod); r.ultimoInicio=document.getElementById(`ferUltIni_${empCod}_${funCod}`)?.value||''; r.ultimoFim=document.getElementById(`ferUltFim_${empCod}_${funCod}`)?.value||''; const obsEl=document.getElementById(`ferObs_${empCod}_${funCod}`); if(obsEl)r.obs=obsEl.value||''; saved()}
function baixarFeriasTeste(empCod,funCod){const emp=state.empresas.find(e=>String(e.codigo)===String(empCod)); const f=emp?.funcionarios?.find(x=>String(x.codigo)===String(funCod)); if(!f)return; const r=feriasRec(empCod,funCod); const a=analiseFerias(f,r); const p=a.periodoAtual; if(!p.ini||!p.fim)return alert('Informe a data de admissão do funcionário primeiro.'); if(!confirm(`Baixar/controlar o período atual?

${fmtDataBR(p.ini)} a ${fmtDataBR(p.fim)}

O próximo período será calculado automaticamente.`))return; r.ultimoInicio=p.ini; r.ultimoFim=p.fim; saved()}

function abrirObsFeriasTeste(empCod,funCod){
  const emp=state.empresas.find(e=>String(e.codigo)===String(empCod));
  const f=emp?.funcionarios?.find(x=>String(x.codigo)===String(funCod));
  const r=feriasRec(empCod,funCod);
  document.getElementById('feriasObsEmpCod').value=empCod;
  document.getElementById('feriasObsFunCod').value=funCod;
  document.getElementById('feriasObsInfo').textContent=emp&&f?`${emp.codigo} - ${emp.nome} | ${f.nome}`:'Funcionário não localizado';
  document.getElementById('feriasObsTexto').value=r.obs||'';
  document.getElementById('modalFeriasObsTeste')?.classList.add('open');
  document.body.classList.add('modal-aberto');
}
function fecharObsFeriasTeste(){
  document.getElementById('modalFeriasObsTeste')?.classList.remove('open');
  document.body.classList.remove('modal-aberto');
}
function salvarObsFeriasTeste(){
  const empCod=document.getElementById('feriasObsEmpCod')?.value||'';
  const funCod=document.getElementById('feriasObsFunCod')?.value||'';
  const r=feriasRec(empCod,funCod);
  r.obs=document.getElementById('feriasObsTexto')?.value||'';
  fecharObsFeriasTeste();
  saved();
}
function filtroTxt(id){const el=document.getElementById(id); if(!el)return ''; if(el.tagName==='SELECT'){return el.options[el.selectedIndex]?.text||''} return el.value||''}
function abrirPDFModuloTeste(titulo,subtitulo,filtros,headers,rows){
  const dataHora=new Date().toLocaleString('pt-BR');
  const linhas=rows.length?rows.map(r=>'<tr>'+r.map(c=>`<td>${esc(c||'-')}</td>`).join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'">Nenhum registro encontrado com os filtros selecionados.</td></tr>';
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
    @page{size:A4 landscape;margin:10mm}body{font-family:Segoe UI,Arial,sans-serif;color:#172033;margin:0;font-size:11px}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1B3A6B;padding-bottom:8px;margin-bottom:10px}h1{font-size:20px;color:#1B3A6B;margin:0 0 4px}.muted{color:#667085}.filtros{background:#f8fafc;border:1px solid #d8e0ea;border-radius:8px;padding:8px;margin-bottom:10px}table{width:100%;border-collapse:collapse}th{background:#eef4ff;color:#1B3A6B;text-align:left;font-size:10px;text-transform:uppercase}th,td{border:1px solid #d8e0ea;padding:6px;vertical-align:top}tr:nth-child(even)td{background:#fbfdff}.rodape{margin-top:8px;font-size:10px;color:#667085}.btn{position:fixed;right:12px;top:12px;border:0;background:#1B3A6B;color:white;border-radius:8px;padding:8px 12px;font-weight:700}@media print{.btn{display:none}}
  </style></head><body><button class="btn" onclick="window.print()">Imprimir / PDF</button><div class="top"><div><h1>${esc(titulo)}</h1><div class="muted">${esc(subtitulo||'')}</div></div><div class="muted">Gerado em ${esc(dataHora)}</div></div><div class="filtros"><b>Filtros:</b> ${esc(filtros||'Todos')}</div><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table><div class="rodape">Relatório gerado pelo sistema. Não altera dados do fechamento mensal.</div><script>setTimeout(()=>window.print(),400)<\/script></body></html>`;
  const w=window.open('','_blank');
  if(!w)return alert('O navegador bloqueou a janela do PDF. Libere pop-ups e tente novamente.');
  w.document.write(html); w.document.close();
}
function gerarPDFASOTeste(){
  const empF=document.getElementById('asoEmpFiltro')?.value||'';
  const stF=document.getElementById('asoStatusFiltro')?.value||'';
  const busca=(document.getElementById('asoBusca')?.value||'').toLowerCase();
  const rows=[];
  funcionariosOperacionaisTeste().forEach(({e,f})=>{
    if(empF&&String(e.codigo)!==String(empF))return;
    const txt=[e.nome,e.codigo,f.nome,f.codigo,f.funcao].join(' ').toLowerCase();
    if(busca&&!txt.includes(busca))return;
    const r=asoRec(e.codigo,f.codigo); const venc=addMesesISO(r.ultimo,r.prazo||12); const st=statusVencimento(venc);
    if(stF&&st.cod!==stF)return;
    rows.push([`${f.codigo||''} - ${f.nome||''}`,`${e.codigo} - ${e.nome}`,f.funcao||'',fmtDataBR(r.ultimo)||'-',`${r.prazo||12} meses`,fmtDataBR(venc)||'-',st.txt,st.dias===null?'-':st.dias+' dias',r.obs||'-']);
  });
  abrirPDFModuloTeste('Relatório de ASO Periódicos','Controle dos exames periódicos dos funcionários',`Empresa: ${filtroTxt('asoEmpFiltro')||'Todas'} | Status: ${filtroTxt('asoStatusFiltro')||'Todos'} | Busca: ${document.getElementById('asoBusca')?.value||'-'}`,['Funcionário','Empresa','Função','Último ASO','Prazo','Vencimento','Status','Dias','Observação'],rows);
}
function gerarPDFLaudosTeste(){
  const empF=document.getElementById('laudoEmpFiltro')?.value||'';
  const tipoF=document.getElementById('laudoTipoFiltro')?.value||'';
  const stF=document.getElementById('laudoStatusFiltro')?.value||'';
  const busca=(document.getElementById('laudoBusca')?.value||'').toLowerCase();
  const rows=[];
  (state.laudos||[]).forEach(r=>{
    const e=state.empresas.find(x=>String(x.codigo)===String(r.empCod));
    if(!e||!empresaAtivaNaCompetencia(e,comp()))return;
    if(empF&&String(r.empCod)!==String(empF))return;
    if(tipoF&&String(r.tipo)!==String(tipoF))return;
    const venc=addMesesISO(r.ultimo,r.prazo||12); const st=statusVencimento(venc);
    if(stF&&st.cod!==stF)return;
    const txt=[e.nome,e.codigo,r.tipo,r.grauRisco,r.obs].join(' ').toLowerCase();
    if(busca&&!txt.includes(busca))return;
    rows.push([`${e.codigo} - ${e.nome}`,r.tipo||'-',r.grauRisco||'Não informado',fmtDataBR(r.ultimo)||'-',`${r.prazo||12} meses`,fmtDataBR(venc)||'-',st.txt,st.dias===null?'-':st.dias+' dias',r.obs||'-']);
  });
  abrirPDFModuloTeste('Relatório de Laudos SST','Controle de PCMSO, PGR, LTCAT e laudos SST',`Empresa: ${filtroTxt('laudoEmpFiltro')||'Todas'} | Tipo: ${filtroTxt('laudoTipoFiltro')||'Todos'} | Status: ${filtroTxt('laudoStatusFiltro')||'Todos'} | Busca: ${document.getElementById('laudoBusca')?.value||'-'}`,['Empresa','Tipo','Grau de risco','Último laudo','Prazo','Vencimento','Status','Dias','Observação'],rows);
}
function gerarPDFFeriasTeste(){
  const empF=document.getElementById('feriasEmpFiltro')?.value||'';
  const stF=document.getElementById('feriasStatusFiltro')?.value||'';
  const busca=(document.getElementById('feriasBusca')?.value||'').toLowerCase();
  const rows=[];
  funcionariosOperacionaisTeste().forEach(({e,f})=>{
    if(empF&&String(e.codigo)!==String(empF))return;
    const r=feriasRec(e.codigo,f.codigo); const a=analiseFerias(f,r);
    if(stF&&a.cod!==stF)return;
    const txt=[e.nome,e.codigo,f.nome,f.codigo,f.funcao].join(' ').toLowerCase();
    if(busca&&!txt.includes(busca))return;
    const p=a.periodoAtual||{};
    rows.push([`${f.codigo||''} - ${f.nome||''}`,`${e.codigo} - ${e.nome}`,fmtDataBR(f.admissao)||'-',`${fmtDataBR(r.ultimoInicio)||'-'} a ${fmtDataBR(r.ultimoFim)||'-'}`,`${fmtDataBR(p.ini)||'-'} a ${fmtDataBR(p.fim)||'-'}`,`${fmtDataBR(a.prazoPrimeiro)||'-'} | seguro: ${fmtDataBR(a.limiteMaisAntigo)||'-'} | alerta: ${fmtDataBR(a.alertaMaisAntigo)||'-'}`,String(a.periodosAbertos||0),a.txt,r.obs||'-']);
  });
  abrirPDFModuloTeste('Relatório de Férias','Controle de períodos aquisitivos e vencimentos',`Empresa: ${filtroTxt('feriasEmpFiltro')||'Todas'} | Status: ${filtroTxt('feriasStatusFiltro')||'Todos'} | Busca: ${document.getElementById('feriasBusca')?.value||'-'}`,['Funcionário','Empresa','Admissão','Último período baixado','Período em aberto','Prazo/limite/alerta','Períodos em aberto','Status','Observação'],rows);
}
function renderFerias(){
  popularSelectsModulos();
  const empF=feriasEmpFiltro?.value||'';
  const stF=feriasStatusFiltro?.value||'';
  const busca=(feriasBusca?.value||'').toLowerCase();
  let rows=[]; let k={total:0,ok:0,alerta:0,v1:0,v2:0};
  funcionariosOperacionaisTeste().forEach(({e,f})=>{
    if(empF&&String(e.codigo)!==String(empF))return;
    const r=feriasRec(e.codigo,f.codigo);
    const a=analiseFerias(f,r);
    if(stF&&a.cod!==stF)return;
    const txt=[e.nome,e.codigo,f.nome,f.codigo,f.funcao].join(' ').toLowerCase();
    if(busca&&!txt.includes(busca))return;
    k.total++; if(a.cod==='OK')k.ok++; if(a.cod==='ALERTA_15')k.alerta++; if(a.cod==='VENCIDO_1')k.v1++; if(a.cod==='VENCIDO_2PLUS')k.v2++;
    rows.push({e,f,r,a})
  });
  if(feriasTotal){feriasTotal.textContent=k.total; feriasOk.textContent=k.ok; if(typeof feriasAlerta!=='undefined'&&feriasAlerta)feriasAlerta.textContent=k.alerta; feriasVenc1.textContent=k.v1; if(typeof feriasVenc2!=='undefined'&&feriasVenc2)feriasVenc2.textContent=k.v2}
  const tab=document.getElementById('tabFerias'); if(!tab)return;
  tab.innerHTML='<thead><tr><th>Funcionário</th><th>Empresa</th><th>Admissão</th><th>Último período baixado</th><th>Período mais antigo em aberto</th><th>Prazo de gozo</th><th>Períodos em aberto</th><th>Status geral</th><th>Obs.</th><th>Ações</th></tr></thead><tbody>'+rows.map(x=>{const id=`${x.e.codigo}_${x.f.codigo}`; const p=x.a.periodoAtual||{}; const qtd=x.a.periodosAbertos||0; const abertoBadge=qtd>0?`<span class="badge ${qtd>=2?'mod-status-vencido':'mod-status-alerta'}">${esc(qtd)} ${qtd===1?'período':'períodos'}</span>`:`<span class="badge mod-status-ok">0</span>`; const prazoOld=x.a.prazoPrimeiro||''; const limiteOld=x.a.limiteMaisAntigo||''; return `<tr><td><b>${esc(x.f.nome)}</b><div class="mod-mini">${esc(x.f.funcao||'')}</div></td><td><b>${esc(x.e.codigo)} - ${esc(x.e.nome)}</b></td><td>${esc(fmtDataBR(x.f.admissao)||'-')}</td><td><div class="mod-actions-inline"><input id="ferUltIni_${id}" type="date" value="${esc(x.r.ultimoInicio||'')}" title="Início do último período baixado"><input id="ferUltFim_${id}" type="date" value="${esc(x.r.ultimoFim||'')}" title="Fim do último período baixado"></div><div class="mod-mini">preencha somente se já houve férias controladas</div></td><td>${esc(fmtDataBR(p.ini)||'-')} a ${esc(fmtDataBR(p.fim)||'-')}</td><td>${esc(fmtDataBR(prazoOld)||'-')}<div class="mod-mini">limite seguro do período: ${esc(fmtDataBR(limiteOld)||'-')}</div><div class="mod-mini">alerta anterior: ${esc(fmtDataBR(x.a.alertaMaisAntigo)||'-')}</div></td><td>${abertoBadge}</td><td><span class="badge ${x.a.cls}">${esc(x.a.txt)}</span></td><td><button class="btn small out" onclick="abrirObsFeriasTeste('${esc(x.e.codigo)}','${esc(x.f.codigo)}')">${x.r.obs?'Ler':'-'}</button></td><td><div class="action-line"><button class="btn small pri" onclick="salvarFeriasTeste('${esc(x.e.codigo)}','${esc(x.f.codigo)}')">Salvar</button><button class="btn small green" onclick="baixarFeriasTeste('${esc(x.e.codigo)}','${esc(x.f.codigo)}')">Baixar período</button></div></td></tr>`}).join('')+'</tbody>'
}

