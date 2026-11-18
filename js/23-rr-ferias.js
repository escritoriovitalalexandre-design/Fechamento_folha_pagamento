// ========== MÓDULO RESCISÕES E RECIBOS — RECIBO DE FÉRIAS ==========
// Férias gozadas: salário/30 × dias + 1/3 (INSS, IRRF e FGTS incidem).
// Abono pecuniário (venda de até 1/3, art. 143) + 1/3 do abono: sem INSS, IRRF e FGTS.
// Adiantamento da 1ª parcela do 13º (art. 2º da Lei 4.749/65), se pedido.
// Pagamento até 2 dias antes do início (art. 145); aviso com 30 dias de antecedência (art. 135).

let rrFeriasAtual = rrNovasFerias();
function rrNovasFerias(){
  return {id: null, empCod: "", ref: "", salario: "", admissao: "", media: "", paInicio: "", paFim: "", inicio: "", diasGozo: 30, diasAbono: 0,
          adiantar13: false, dependentes: 0, dataPagamento: "", dataAviso: "", verbas: [], obs: "", calculado: false};
}

function rrBaseFerias(d){
  const erros = [];
  const sal = rrNum(d.salario), media = rrNum(d.media);
  const gozo = Math.max(0, parseInt(d.diasGozo)||0), abono = Math.max(0, parseInt(d.diasAbono)||0);
  if(!d.empCod || !d.ref) erros.push("Escolha a empresa e o funcionário.");
  if(!sal) erros.push("Informe o salário.");
  if(!rrData(d.inicio)) erros.push("Informe a data de início das férias.");
  if(!gozo) erros.push("Informe os dias de férias.");
  if(gozo + abono > 30) erros.push("Dias de férias + abono não podem passar de 30.");
  if(abono > 10) erros.push("O abono pecuniário é de no máximo 10 dias (1/3 das férias).");
  if(erros.length) return {erros};
  // Período aquisitivo sugerido: o último completo antes do início das férias
  let paInicio = d.paInicio, paFim = d.paFim;
  if(!paInicio && rrData(d.admissao)){
    const anos = Math.max(1, rrAnosCompletos(d.admissao, d.inicio));
    paInicio = rrAddMeses(d.admissao, 12*(anos-1));
  }
  if(paInicio && !paFim) paFim = rrAddDias(rrAddMeses(paInicio, 12), -1);
  const fim = rrAddDias(d.inicio, gozo - 1), retorno = rrAddDias(d.inicio, gozo);
  return {erros: [], sal, media, gozo, abono, paInicio, paFim, fim, retorno,
          // Sempre automático: pagamento 2 dias antes e aviso 30 dias antes; se cair em sábado, domingo ou feriado, vai para o dia útil anterior
          dataPagamento: rrDiaUtilAnterior(rrAddDias(d.inicio, -2)), dataAviso: rrDiaUtilAnterior(rrAddDias(d.inicio, -30))};
}

function rrRecalcularFerias(d, zerarEdicoes){
  const b = rrBaseFerias(d);
  d.calculado = !b.erros.length;
  const manuais = (d.verbas||[]).filter(v=>!v.auto);
  const antigas = {}; (d.verbas||[]).filter(v=>v.auto).forEach(v=>antigas[v.chave]=v);
  if(b.erros.length){ d.verbas = manuais; return b; }
  const lista = [];
  const add = (chave, desc, ref, tipo, valor, inc, dica) => {
    const ant = antigas[chave];
    const v = {id: ant?.id || rrId(), chave, cod: "", desc, ref, tipo, valor: rr2(valor), incluir: ant && !zerarEdicoes ? ant.incluir : true, auto: true, editado: false, dica: dica||"", ...inc};
    if(ant && ant.editado && !zerarEdicoes){ v.valor = ant.valor; v.editado = true; }
    if(v.valor > 0 || v.editado) lista.push(v);
  };
  const SIM = {inss:true, irrf:true, fgts:true}, NAO = {inss:false, irrf:false, fgts:false};
  const remun = b.sal + b.media, dia = remun/30;
  add("ferias", "Férias", b.gozo + " dias", "P", dia*b.gozo, SIM, b.media ? "Salário + média de variáveis R$ " + rrBRL(b.media) : "");
  const ferInc = lista.find(v=>v.chave==="ferias" && v.incluir);
  if(ferInc) add("terco", "1/3 constitucional de férias", "", "P", rrNum(ferInc.valor)/3, SIM);
  if(b.abono){
    add("abono", "Abono pecuniário", b.abono + " dias", "P", dia*b.abono, NAO, "Venda de dias de férias (art. 143) — sem INSS e IRRF");
    const abInc = lista.find(v=>v.chave==="abono" && v.incluir);
    if(abInc) add("tercoabono", "1/3 sobre o abono pecuniário", "", "P", rrNum(abInc.valor)/3, NAO);
  }
  if(d.adiantar13) add("adiant13", "Adiantamento 1ª parcela do 13º salário", "50%", "P", b.sal/2, {inss:false, irrf:false, fgts:true}, "INSS e IRRF do 13º são descontados em dezembro");
  const todos = lista.concat(manuais);
  const inc = todos.filter(v=>v.incluir && v.tipo==="P");
  const reduz = rrReducaoBase(todos);
  const baseINSS = Math.max(0, inc.filter(v=>v.inss).reduce((s,v)=>s+rrNum(v.valor),0) - reduz);
  const inss = rrCalcINSS(baseINSS);
  add("inss", "INSS (previdência social)", baseINSS ? "base " + rrBRL(baseINSS) : "", "D", inss, NAO);
  const inssUsado = (antigas.inss && antigas.inss.editado && !zerarEdicoes) ? rrNum(antigas.inss.valor) : inss;
  const dep = Math.max(0, parseInt(d.dependentes)||0);
  const rendIR = Math.max(0, inc.filter(v=>v.irrf).reduce((s,v)=>s+rrNum(v.valor),0) - reduz);
  add("irrf", "IRRF sobre férias", dep ? dep + " dep." : "", "D", rrCalcIRRF(rendIR, inssUsado, dep), NAO);
  d.verbas = lista.concat(manuais);
  return b;
}

function rrRenderFerias(){
  const d = rrFeriasAtual;
  if(d.empCod && d.ref && !d.admissao){ const f = rrFuncionario(d.empCod, d.ref); if(f){ d.admissao = f.admissao||""; if(!d.salario) d.salario = rrBRL(f.salario); } }
  const b = rrRecalcularFerias(d, false);
  const campo = (rot, html, dica) => `<div><label>${rot}</label>${html}${dica?`<div class="muted" style="font-size:11px;margin-top:2px">${dica}</div>`:""}</div>`;
  const inp = (k, tipo, extra) => rrInput("rrFeriasAtual", d, k, tipo, extra==="moeda"?"moeda":"", extra==="moeda"?"":extra, "rrRenderFerias");
  const resumo = b.erros.length ? `<div class="rr-alerta">${b.erros.map(esc).join("<br>")}</div>` : `<div class="rr-chips">
      <span>Gozo: <b>${rrDataBR(d.inicio)} a ${rrDataBR(b.fim)}</b></span><span>Retorno: <b>${rrDataBR(b.retorno)}</b></span>
      ${b.paInicio?`<span>Período aquisitivo: <b>${rrDataBR(b.paInicio)} a ${rrDataBR(b.paFim)}</b></span>`:""}
      <span>Pagamento: <b>${rrDataBR(b.dataPagamento)} (${rrDiaSemana(b.dataPagamento)})</b></span><span>Aviso: <b>${rrDataBR(b.dataAviso)} (${rrDiaSemana(b.dataAviso)})</b></span></div>`;
  document.getElementById("rrConteudo").innerHTML = `${rrHtmlAvisoTabelas()}
    ${rrHtmlQuem(d, "rrRenderFerias")}
    <div class="rr-bloco"><div class="rr-bloco-tit">2. Período e dias</div>
      <div class="rr-grid">
        ${campo("Admissão", inp("admissao","date"))}
        ${campo("Início das férias", inp("inicio","date"))}
        ${campo("Dias de férias (gozo)", `<select onchange="rrFeriasAtual.diasGozo=this.value; rrAgendar(rrRenderFerias)">${[30,20,15,14,10,5].map(n=>`<option${Number(d.diasGozo)===n?" selected":""}>${n}</option>`).join("")}</select>`, "Fracionamento: um período de 14+ dias e os demais de 5+ (art. 134)")}
        ${campo("Vender dias (abono pecuniário)", `<select onchange="rrFeriasAtual.diasAbono=this.value; rrAgendar(rrRenderFerias)">${[0,5,10].map(n=>`<option value="${n}"${Number(d.diasAbono)===n?" selected":""}>${n?n+" dias":"Não vender"}</option>`).join("")}</select>`, "Máximo de 10 dias")}
        ${campo("Salário (R$)", inp("salario","", "moeda"))}
        ${campo("Média de variáveis (R$)", inp("media","", "moeda"), "Horas extras, comissões etc. — opcional")}
        ${campo("Início do período aquisitivo", inp("paInicio","date"), "Em branco = calcula pela admissão")}
        ${campo("Fim do período aquisitivo", inp("paFim","date"))}
        ${campo("Dependentes para IRRF", inp("dependentes","number",'min="0"'))}
        ${campo("Adiantar 1ª parcela do 13º", `<select onchange="rrFeriasAtual.adiantar13=this.value==='1'; rrAgendar(rrRenderFerias)"><option value="0"${d.adiantar13?"":" selected"}>Não</option><option value="1"${d.adiantar13?" selected":""}>Sim</option></select>`)}
      </div>${resumo}</div>
    <div class="rr-bloco"><div class="rr-bloco-tit">3. Verbas
      <button class="btn small out" style="float:right" type="button" onclick="rrRecalcularFerias(rrFeriasAtual,true); rrAgendar(rrRenderFerias)">↺ Recalcular do zero</button></div>
      ${rrHtmlVerbas(d.verbas, "rrRenderFerias")}
      <div style="margin-top:10px"><label>Observações (saem no recibo)</label><textarea rows="2" onchange="rrFeriasAtual.obs=this.value">${esc(d.obs||"")}</textarea></div>
    </div>
    <div class="rr-bloco rr-acoes">
      <button class="btn pri" type="button" onclick="rrSalvarFerias()">💾 Salvar recibo de férias</button>
      <button class="btn out" type="button" onclick="rrImprimirAvisoFerias()">🖨 Imprimir aviso de férias (2 vias)</button>
      <button class="btn out" type="button" onclick="rrImprimirReciboFerias()">🖨 Imprimir recibo de férias (2 vias)</button>
      <button class="btn out" type="button" onclick="rrNovasFeriasTela()">+ Novo recibo de férias</button>
    </div>
    ${rrHtmlHistorico("recibosFerias")}`;
}
async function rrNovasFeriasTela(){
  if(rrFeriasAtual.calculado && !await confirmar("Começar um recibo de férias novo? O que não foi salvo será perdido.")) return;
  rrFeriasAtual = rrNovasFerias(); rrRenderFerias();
}
function rrSalvarFerias(){
  const b = rrBaseFerias(rrFeriasAtual);
  if(b.erros.length) return aviso(b.erros.join("\n"));
  rrSalvarDocumento("recibosFerias", rrFeriasAtual, "Recibo de férias");
}

// ---------- impressão das férias: aviso e recibo em folhas separadas, 2 vias cada ----------
function rrDadosImpressaoFerias(){
  const d = rrFeriasAtual;
  const b = rrBaseFerias(d);
  if(b.erros.length){ aviso(b.erros.join("\n")); return null; }
  rrRecalcularFerias(d, false);
  return {d, b, ...rrDadosDocumento(d)};
}
const RR_CSS_DUAS_VIAS = `
    @page{size:A4;margin:8mm}.folha{display:flex;flex-direction:column}
    .via{height:134mm;border:1.5px solid #1B3A6B;border-radius:8px;padding:8px 12px;display:flex;flex-direction:column;font-size:11px;overflow:hidden}
    .cab{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border-bottom:2px solid #1B3A6B;padding-bottom:5px}.emp{font-size:14px;color:#1B3A6B}.cinza{color:#555;font-size:10px}
    .tag{background:#1B3A6B;color:#fff;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;white-space:nowrap}
    .tit{text-align:center;font-weight:800;color:#1B3A6B;letter-spacing:.05em;margin:6px 0;font-size:13px}
    .info{display:flex;flex-wrap:wrap;gap:4px 14px;background:#f1f5f9;border-radius:6px;padding:5px 8px;margin-bottom:6px}
    p{line-height:1.6;margin:6px 0}
    table{width:100%;border-collapse:collapse}th{text-align:left;font-size:9.5px;color:#667085;border-bottom:1px solid #d8e0ea;padding:3px}
    td{padding:3px;border-bottom:1px solid #eef2f6}.c{text-align:center}.r{text-align:right;white-space:nowrap}.tot td{font-weight:800}
    .liq{margin-top:6px;margin-left:auto;background:#eef4ff;border:2px solid #1B3A6B;color:#0f2a55;border-radius:6px;padding:5px 12px;display:flex;gap:14px;align-items:center;font-weight:800}.liq b{font-size:15px}
    .fim{margin-top:auto}.ass{display:grid;grid-template-columns:1fr 1fr;gap:40px;text-align:center;margin-top:28px}.ass div{border-top:1px solid #111;padding-top:3px}
    .corte{text-align:center;color:#999;font-size:9px;margin:2.5mm 0;white-space:nowrap;overflow:hidden}`;
function rrCabFerias(x, nomeVia){
  const {emp, ce, f, cf} = x;
  return `<div class="cab"><div><b class="emp">${esc(emp.nome||"")}</b><div class="cinza">${esc(ce.cnpj?"CNPJ "+ce.cnpj:"")}${ce.cidade?" · "+esc(ce.cidade)+(ce.uf?"/"+esc(ce.uf):""):""}</div></div>
    <div style="text-align:right"><span class="tag">${esc(nomeVia)}</span><div class="cinza" style="margin-top:3px">Funcionário: <b>${esc(f.nome||"")}</b>${f.funcao?" · "+esc(f.funcao):""}${cf.cpf?"<br>CPF "+esc(cf.cpf):""}${cf.ctps?" · CTPS "+esc(cf.ctps):""}</div></div></div>`;
}
function rrImprimirAvisoFerias(){
  const x = rrDadosImpressaoFerias(); if(!x) return;
  const {d, b, emp, ce, f} = x;
  const periodo = b.paInicio ? `referentes ao período aquisitivo de <b>${rrDataBR(b.paInicio)}</b> a <b>${rrDataBR(b.paFim)}</b>, ` : "";
  const via = nomeVia => `<div class="via">${rrCabFerias(x, nomeVia)}
      <div class="tit">AVISO DE FÉRIAS</div>
      <p>Prezado(a) <b>${esc(f.nome||"")}</b>,</p>
      <p>Comunicamos que, nos termos do art. 135 da CLT, suas férias ${periodo}serão concedidas de <b>${rrDataBR(d.inicio)}</b> a <b>${rrDataBR(b.fim)}</b> (${b.gozo} dias)${b.abono?`, com conversão de ${b.abono} dias em abono pecuniário`:""}, devendo retornar ao trabalho em <b>${rrDataBR(b.retorno)}</b>.</p>
      <p>O pagamento das férias será efetuado em <b>${rrDataBR(b.dataPagamento)}</b>.</p>
      <div class="fim"><div>${esc(ce.cidade||"")}${ce.cidade?", ":""}${rrDataBR(b.dataAviso)}</div>
        <div class="ass"><div>${esc(emp.nome||"Empregador")}<br><small>Empregador</small></div><div>Ciente: ${esc(f.nome||"")}<br><small>Empregado</small></div></div></div>
    </div>`;
  rrAbrirImpressao("Aviso de férias - " + (f.nome||""), `<div class="folha">${via("Via da empresa")}<div class="corte">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>${via("Via do funcionário")}</div>`, RR_CSS_DUAS_VIAS);
}
function rrImprimirReciboFerias(){
  const x = rrDadosImpressaoFerias(); if(!x) return;
  const {d, b, emp, ce, f} = x;
  const tot = rrTotais(d.verbas);
  const linhas = [];
  d.verbas.filter(v=>v.incluir && v.tipo==="P" && rrNum(v.valor)).forEach(v=>linhas.push(`<tr><td>${esc(v.desc)}</td><td class="c">${esc(v.ref||"")}</td><td class="r">${rrBRL(rrNum(v.valor))}</td><td></td></tr>`));
  d.verbas.filter(v=>v.incluir && v.tipo==="D" && rrNum(v.valor)).forEach(v=>linhas.push(`<tr><td>${esc(v.desc)}</td><td class="c">${esc(v.ref||"")}</td><td></td><td class="r">${rrBRL(rrNum(v.valor))}</td></tr>`));
  const via = nomeVia => `<div class="via">${rrCabFerias(x, nomeVia)}
      <div class="tit">RECIBO DE FÉRIAS</div>
      <div class="info"><span>Gozo: <b>${rrDataBR(d.inicio)} a ${rrDataBR(b.fim)}</b></span><span>Retorno: <b>${rrDataBR(b.retorno)}</b></span>${b.paInicio?`<span>Período aquisitivo: <b>${rrDataBR(b.paInicio)} a ${rrDataBR(b.paFim)}</b></span>`:""}<span>Salário: <b>R$ ${rrBRL(b.sal)}</b></span></div>
      <table><tr><th>Descrição</th><th class="c">Ref.</th><th class="r">Proventos</th><th class="r">Descontos</th></tr>${linhas.join("")}
        <tr class="tot"><td colspan="2">Totais</td><td class="r">${rrBRL(tot.prov)}</td><td class="r">${rrBRL(tot.desc)}</td></tr></table>
      <div class="liq"><span>Líquido a receber</span><b>R$ ${rrBRL(tot.liquido)}</b></div>
      <p>Recebi de <b>${esc(emp.nome||"")}</b> a importância de <b>R$ ${rrBRL(tot.liquido)}</b> (${esc(rrExtenso(tot.liquido))}), referente às minhas férias, conforme discriminado acima, dando plena quitação.${d.obs?" Obs.: "+esc(d.obs):""}</p>
      <div class="fim"><div>${esc(ce.cidade||"")}${ce.cidade?", ":""}${rrDataBR(b.dataPagamento)}</div>
        <div class="ass"><div>${esc(emp.nome||"Empregador")}<br><small>Empregador</small></div><div>${esc(f.nome||"")}<br><small>Empregado</small></div></div></div>
    </div>`;
  rrAbrirImpressao("Recibo de férias - " + (f.nome||""), `<div class="folha">${via("Via da empresa")}<div class="corte">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>${via("Via do funcionário")}</div>`, RR_CSS_DUAS_VIAS);
}
