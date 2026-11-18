// ========== MÓDULO RESCISÕES E RECIBOS — RESCISÃO (TRCT) ==========
// Regras usadas (CLT):
//  - Saldo de salário: salário/30 × dias trabalhados no mês (mês comercial de 30 dias).
//  - Aviso prévio (Lei 12.506/2011): 30 dias + 3 por ano completo, até 90. Dispensa com aviso
//    trabalhado: trabalha 30 e os dias acrescidos são indenizados. Pedido de demissão: sempre 30 dias.
//  - Aviso indenizado projeta o contrato (13º e férias contam até a data projetada).
//  - 13º proporcional: 1/12 por mês com 15 dias ou mais trabalhados no ano.
//  - Férias: vencidas (períodos completos não gozados) + proporcionais (1/12 por mês do período
//    aquisitivo atual, fração ≥ 15 dias) + 1/3 constitucional. Justa causa perde 13º e férias proporcionais.
//  - Acordo (art. 484-A): metade do aviso indenizado; multa de 20% do FGTS.
//  - Experiência: término no prazo sem aviso; quebra antecipada pelo empregador (art. 479) indeniza metade
//    dos dias restantes; pelo empregado (art. 480) pode descontar até o mesmo valor.
//  - INSS sobre saldo/verbas tributáveis e, separado, sobre o 13º. IRRF idem (13º tributado à parte).
//    Férias indenizadas, 1/3 e aviso indenizado não têm INSS nem IRRF.

const RR_TIPOS_RESCISAO = {
  sem_justa:         {nome: "Dispensa sem justa causa",               causa: "Despedida sem justa causa, pelo empregador", cod: "SJ2", avisos: ["indenizado","trabalhado"], multa: 40, d13: true, fprop: true},
  pedido:            {nome: "Pedido de demissão",                     causa: "Pedido de demissão pelo empregado",          cod: "PD0", avisos: ["trabalhado","dispensado","descontado"], multa: 0, d13: true, fprop: true},
  justa:             {nome: "Dispensa por justa causa",               causa: "Despedida por justa causa, pelo empregador", cod: "JC2", avisos: [], multa: 0, d13: false, fprop: false},
  acordo:            {nome: "Acordo entre as partes (art. 484-A)",    causa: "Rescisão por acordo entre as partes (art. 484-A da CLT)", cod: "", avisos: ["indenizado","trabalhado"], multa: 20, d13: true, fprop: true},
  termino_exp:       {nome: "Término do contrato de experiência",     causa: "Término do contrato de experiência no prazo", cod: "", avisos: [], multa: 0, d13: true, fprop: true},
  quebra_empregador: {nome: "Quebra da experiência pelo empregador",  causa: "Rescisão antecipada do contrato a termo pelo empregador (art. 479)", cod: "", avisos: [], multa: 40, d13: true, fprop: true},
  quebra_empregado:  {nome: "Quebra da experiência pelo empregado",   causa: "Rescisão antecipada do contrato a termo pelo empregado (art. 480)", cod: "", avisos: [], multa: 0, d13: true, fprop: true}
};
const RR_AVISO_NOMES = {
  indenizado: ["Indenizado", "A empresa paga o aviso sem o funcionário trabalhar."],
  trabalhado: ["Trabalhado", "O funcionário cumpre o aviso trabalhando."],
  dispensado: ["Empresa abriu mão", "A empresa dispensou o cumprimento: não paga nem desconta."],
  descontado: ["Não cumpriu (descontar)", "O funcionário não cumpriu: desconta 30 dias de aviso."]
};

let rrRescisaoAtual = rrNovaRescisao();
function rrNovaRescisao(){
  return {id: null, empCod: "", ref: "", tipo: "sem_justa", aviso: "indenizado", dataAviso: "", dataDesligamento: "", admissao: "", salario: "",
          fimExperiencia: "", feriasVencidas: 0, dependentes: 0, saldoFgts: "", adiant13: "", verbas: [], obs: "", calculado: false};
}

// Quantos avos de 13º no ano do desligamento (até "fim", que pode ser a data projetada)
function rrAvos13(admissao, desligamento, fim){
  const ano = rrData(desligamento).getUTCFullYear();
  let inicio = rrISO(new Date(Date.UTC(ano,0,1)));
  if(admissao > inicio) inicio = admissao;
  let avos = 0;
  let cursor = rrData(inicio); cursor.setUTCDate(1);
  const fimD = rrData(fim);
  while(cursor <= fimD){
    const mesIni = new Date(cursor), mesFim = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth()+1, 0));
    const a = rrData(inicio) > mesIni ? rrData(inicio) : mesIni;
    const b = fimD < mesFim ? fimD : mesFim;
    const dias = Math.round((b - a)/86400000) + 1;
    if(dias >= 15) avos++;
    cursor.setUTCMonth(cursor.getUTCMonth()+1);
  }
  return avos;
}
// Avos de férias contados a partir do início do período aquisitivo atual
function rrAvosFerias(inicioPA, fim){
  let avos = 0, p = inicioPA;
  while(true){
    const prox = rrAddMeses(p, 1);
    if(prox <= rrAddDias(fim, 1)){ avos++; p = prox; continue; }   // mês completo
    if(rrDiasEntre(p, fim) + 1 >= 15) avos++;                       // fração de 15 dias ou mais
    break;
  }
  return avos;
}

// Calcula os números-base da rescisão (sem montar as verbas)
function rrBaseRescisao(d){
  const erros = [];
  const t = RR_TIPOS_RESCISAO[d.tipo] || RR_TIPOS_RESCISAO.sem_justa;
  const sal = rrNum(d.salario);
  if(!d.empCod || !d.ref) erros.push("Escolha a empresa e o funcionário.");
  if(!rrData(d.admissao)) erros.push("Informe a data de admissão.");
  if(!rrData(d.dataDesligamento)) erros.push("Informe a data de desligamento (último dia do contrato).");
  if(!sal) erros.push("Informe o salário.");
  if(rrData(d.admissao) && rrData(d.dataDesligamento) && d.dataDesligamento < d.admissao) erros.push("O desligamento está antes da admissão.");
  if((d.tipo==="quebra_empregador"||d.tipo==="quebra_empregado") && !rrData(d.fimExperiencia)) erros.push("Informe a data prevista para o fim da experiência.");
  if(erros.length) return {erros};

  const aviso = t.avisos.includes(d.aviso) ? d.aviso : (t.avisos[0] || "");
  const dataAviso = d.dataAviso || d.dataDesligamento;
  const anos = rrAnosCompletos(d.admissao, dataAviso);
  let diasAviso = 0, diasIndenizados = 0;
  if(d.tipo === "pedido"){ diasAviso = 30; }
  else if(t.avisos.length){
    diasAviso = Math.min(90, 30 + 3*anos);
    if(aviso === "indenizado") diasIndenizados = diasAviso;
    else if(aviso === "trabalhado") diasIndenizados = diasAviso - 30; // dias acrescidos pela Lei 12.506 são indenizados
    if(d.tipo === "acordo") diasIndenizados = Math.floor(diasIndenizados/2);
  }
  const projetada = diasIndenizados ? rrAddDias(d.dataDesligamento, diasIndenizados) : d.dataDesligamento;

  // Saldo de salário (mês comercial)
  const deslig = rrData(d.dataDesligamento);
  let diasSaldo = rrUltimoDiaDoMes(d.dataDesligamento) ? 30 : Math.min(30, deslig.getUTCDate());
  if(d.admissao.slice(0,7) === d.dataDesligamento.slice(0,7)) diasSaldo = Math.min(30, rrDiasEntre(d.admissao, d.dataDesligamento) + 1);

  const avos13Real = t.d13 ? rrAvos13(d.admissao, d.dataDesligamento, d.dataDesligamento) : 0;
  const avos13Proj = t.d13 ? rrAvos13(d.admissao, d.dataDesligamento, projetada) : 0;
  const inicioPA = rrAddMeses(d.admissao, 12*rrAnosCompletos(d.admissao, d.dataDesligamento));
  const avosFerReal = t.fprop ? Math.min(12, rrAvosFerias(inicioPA, d.dataDesligamento)) : 0;
  const avosFerProj = t.fprop ? rrAvosFerias(inicioPA, projetada) : 0;

  let diasRestantesExp = 0;
  if(d.tipo==="quebra_empregador"||d.tipo==="quebra_empregado") diasRestantesExp = Math.max(0, rrDiasEntre(d.dataDesligamento, d.fimExperiencia));

  return {erros: [], t, sal, aviso, anos, diasAviso, diasIndenizados, projetada, diasSaldo, avos13Real, avos13Proj, inicioPA,
          avosFerReal, avosFerProj, diasRestantesExp, periodosCompletos: rrAnosCompletos(d.admissao, d.dataDesligamento)};
}

// Monta as verbas automáticas (mantém o que o usuário excluiu/editou e as verbas lançadas à mão)
function rrRecalcularRescisao(d, zerarEdicoes){
  const b = rrBaseRescisao(d);
  d.calculado = !b.erros.length;
  const manuais = (d.verbas||[]).filter(v=>!v.auto);
  const antigas = {}; (d.verbas||[]).filter(v=>v.auto).forEach(v=>antigas[v.chave]=v);
  if(b.erros.length){ d.verbas = manuais; return b; }
  d.aviso = b.aviso;
  const dia = b.sal/30, mes12 = b.sal/12;
  const lista = [];
  const add = (chave, cod, desc, ref, tipo, valor, inc, dica) => {
    const ant = antigas[chave];
    const v = {id: ant?.id || rrId(), chave, cod, desc, ref, tipo, valor: rr2(valor), incluir: ant ? ant.incluir : true, auto: true, editado: false, dica: dica||"", ...inc};
    if(ant && ant.editado && !zerarEdicoes){ v.valor = ant.valor; v.editado = true; }
    if(zerarEdicoes) v.incluir = true;
    if(v.valor > 0 || v.editado) lista.push(v);
  };
  const SIM = {inss:true, irrf:true, fgts:true}, NAO = {inss:false, irrf:false, fgts:false};
  add("saldo", "50", "Saldo de salário", b.diasSaldo + " dias", "P", dia*b.diasSaldo, SIM);
  if(b.diasIndenizados) add("aviso", "69", "Aviso prévio indenizado", b.diasIndenizados + " dias", "P", dia*b.diasIndenizados, {inss:false, irrf:false, fgts:true},
    b.aviso==="trabalhado" ? "Dias acrescidos ao aviso trabalhado (Lei 12.506)" : (d.tipo==="acordo" ? "Metade do aviso (art. 484-A)" : `${b.diasAviso} dias: 30 + 3 por ano completo (${b.anos} ano${b.anos===1?"":"s"})`));
  if(b.avos13Real) add("13", "63", "13º salário proporcional", b.avos13Real + "/12 avos", "P", mes12*b.avos13Real, {inss:true, irrf:true, fgts:true, grupo:"13"});
  if(b.avos13Proj > b.avos13Real) add("13aviso", "70", "13º salário (aviso prévio indenizado)", (b.avos13Proj-b.avos13Real) + "/12 avos", "P", mes12*(b.avos13Proj-b.avos13Real), {inss:true, irrf:true, fgts:true, grupo:"13"});
  const venc = Math.max(0, parseInt(d.feriasVencidas)||0);
  if(venc) add("fervenc", "66", "Férias vencidas", venc + (venc===1?" período":" períodos"), "P", b.sal*venc, NAO, "Períodos aquisitivos completos que não foram gozados");
  if(b.avosFerReal) add("ferprop", "65", "Férias proporcionais", b.avosFerReal + "/12 avos", "P", mes12*b.avosFerReal, NAO, "Período aquisitivo desde " + rrDataBR(b.inicioPA));
  if(b.avosFerProj > b.avosFerReal) add("feraviso", "71", "Férias (aviso prévio indenizado)", (b.avosFerProj-b.avosFerReal) + "/12 avos", "P", mes12*(b.avosFerProj-b.avosFerReal), NAO);
  if(d.tipo==="quebra_empregador" && b.diasRestantesExp) add("ind479", "", "Indenização art. 479 CLT", b.diasRestantesExp + " dias ÷ 2", "P", dia*b.diasRestantesExp/2, NAO, "Metade da remuneração dos dias que faltavam para o fim da experiência");
  // 1/3 sobre as férias que estão incluídas
  const ferInc = lista.filter(v=>["fervenc","ferprop","feraviso"].includes(v.chave) && v.incluir).reduce((s,v)=>s+v.valor,0);
  if(ferInc) add("terco", "68", "1/3 constitucional de férias", "", "P", ferInc/3, NAO);

  // Descontos fixos
  if(d.tipo==="pedido" && b.aviso==="descontado") add("avisodesc", "103", "Aviso prévio não cumprido", "30 dias", "D", b.sal, NAO, "Pedido de demissão sem cumprir o aviso (art. 487, §2º)");
  if(d.tipo==="quebra_empregado" && b.diasRestantesExp) add("ind480", "", "Indenização art. 480 CLT", b.diasRestantesExp + " dias ÷ 2", "D", dia*b.diasRestantesExp/2, NAO, "Prejuízo pela saída antecipada, limitado ao valor do art. 479");
  if(rrNum(d.adiant13)) add("adiant13", "", "Adiantamento de 13º salário", "", "D", rrNum(d.adiant13), NAO);

  // INSS e IRRF sobre o que está incluído
  const todos = lista.concat(manuais);
  const inc = todos.filter(v=>v.incluir && v.tipo==="P");
  const baseINSS = inc.filter(v=>v.inss && v.grupo!=="13").reduce((s,v)=>s+rrNum(v.valor),0);
  const base13 = inc.filter(v=>v.inss && v.grupo==="13").reduce((s,v)=>s+rrNum(v.valor),0);
  const inssSal = rrCalcINSS(baseINSS), inss13 = rrCalcINSS(base13);
  add("inss", "112.1", "INSS (previdência social)", baseINSS ? "base " + rrBRL(baseINSS) : "", "D", inssSal, NAO);
  add("inss13", "112.2", "INSS sobre 13º salário", base13 ? "base " + rrBRL(base13) : "", "D", inss13, NAO);
  const inssUsado = (antigas.inss && antigas.inss.editado && !zerarEdicoes) ? rrNum(antigas.inss.valor) : inssSal;
  const inss13Usado = (antigas.inss13 && antigas.inss13.editado && !zerarEdicoes) ? rrNum(antigas.inss13.valor) : inss13;
  const rendIR = inc.filter(v=>v.irrf && v.grupo!=="13").reduce((s,v)=>s+rrNum(v.valor),0);
  const rendIR13 = inc.filter(v=>v.irrf && v.grupo==="13").reduce((s,v)=>s+rrNum(v.valor),0);
  const dep = Math.max(0, parseInt(d.dependentes)||0);
  add("irrf", "114.1", "IRRF", dep ? dep + " dep." : "", "D", rrCalcIRRF(rendIR, inssUsado, dep), NAO);
  add("irrf13", "114.2", "IRRF sobre 13º salário", "", "D", rrCalcIRRF(rendIR13, inss13Usado, dep, true), NAO);

  d.verbas = lista.concat(manuais);
  return b;
}

// FGTS (informativo, não entra no líquido)
function rrFgtsRescisao(d, b){
  const baseFgts = (d.verbas||[]).filter(v=>v.incluir && v.tipo==="P" && v.fgts).reduce((s,v)=>s+rrNum(v.valor),0);
  const deposito = rr2(baseFgts * 0.08);
  const pct = b && b.t ? b.t.multa : 0;
  const saldo = rrNum(d.saldoFgts);
  const multa = pct ? rr2((saldo + deposito) * pct/100) : 0;
  return {baseFgts: rr2(baseFgts), deposito, pct, saldo, multa};
}

function rrRenderRescisao(){
  const d = rrRescisaoAtual;
  if(d.empCod && d.ref && !d.admissao){ const f = rrFuncionario(d.empCod, d.ref); if(f){ d.admissao = f.admissao||""; if(!d.salario) d.salario = rrBRL(f.salario); } }
  const b = rrRecalcularRescisao(d, false);
  const t = RR_TIPOS_RESCISAO[d.tipo];
  const campo = (rot, html, dica) => `<div><label>${rot}</label>${html}${dica?`<div class="muted" style="font-size:11px;margin-top:2px">${dica}</div>`:""}</div>`;
  const inp = (k, tipo, extra) => rrInput("rrRescisaoAtual", d, k, tipo, extra==="moeda"?"moeda":"", extra==="moeda"?"":extra, "rrRenderRescisao");
  const tipos = Object.entries(RR_TIPOS_RESCISAO).map(([k,x])=>`<label class="rr-opcao${d.tipo===k?" sel":""}"><input type="radio" name="rrTipo" ${d.tipo===k?"checked":""} onchange="rrRescisaoAtual.tipo='${k}'; rrRescisaoAtual.aviso='${x.avisos[0]||""}'; rrAgendar(rrRenderRescisao)"> ${esc(x.nome)}</label>`).join("");
  const avisos = t.avisos.map(a=>`<label class="rr-opcao${d.aviso===a?" sel":""}" title="${esc(RR_AVISO_NOMES[a][1])}"><input type="radio" name="rrAviso" ${d.aviso===a?"checked":""} onchange="rrRescisaoAtual.aviso='${a}'; rrAgendar(rrRenderRescisao)"> ${esc(RR_AVISO_NOMES[a][0])}<small>${esc(RR_AVISO_NOMES[a][1])}</small></label>`).join("");
  const exp = d.tipo==="quebra_empregador"||d.tipo==="quebra_empregado";
  const resumo = b.erros.length ? `<div class="rr-alerta">${b.erros.map(esc).join("<br>")}</div>` : `<div class="rr-chips">
      <span>Tempo de casa: <b>${b.anos} ano${b.anos===1?"":"s"}</b></span>
      ${b.diasAviso?`<span>Aviso: <b>${b.diasAviso} dias</b>${b.diasIndenizados?` (${b.diasIndenizados} indenizados)`:""}</span>`:""}
      ${b.projetada!==d.dataDesligamento?`<span>Data projetada: <b>${rrDataBR(b.projetada)}</b></span>`:""}
      <span>13º: <b>${b.avos13Proj}/12</b></span><span>Férias proporcionais: <b>${b.avosFerProj}/12</b></span>
      <span>Períodos completos de férias: <b>${b.periodosCompletos}</b></span></div>`;
  document.getElementById("rrConteudo").innerHTML = `${rrHtmlAvisoTabelas()}
    ${rrHtmlQuem(d, "rrRenderRescisao")}
    <div class="rr-bloco"><div class="rr-bloco-tit">2. Tipo de rescisão</div><div class="rr-opcoes">${tipos}</div>
      ${t.avisos.length?`<div class="rr-sub">Aviso prévio</div><div class="rr-opcoes">${avisos}</div>`:`<div class="muted" style="margin-top:6px">Este tipo não tem aviso prévio.</div>`}</div>
    <div class="rr-bloco"><div class="rr-bloco-tit">3. Datas e valores</div>
      <div class="rr-grid">
        ${campo("Admissão", inp("admissao","date"))}
        ${t.avisos.length?campo("Data do aviso", inp("dataAviso","date"), "Em branco = mesma do desligamento"):""}
        ${campo("Desligamento (último dia)", inp("dataDesligamento","date"), d.aviso==="trabalhado"?"Último dia do aviso trabalhado":"")}
        ${exp?campo("Fim previsto da experiência", inp("fimExperiencia","date")):""}
        ${campo("Salário (R$)", inp("salario","", "moeda"))}
        ${campo("Férias vencidas não gozadas", `<select onchange="rrRescisaoAtual.feriasVencidas=this.value; rrAgendar(rrRenderRescisao)">${[0,1,2].map(n=>`<option value="${n}"${Number(d.feriasVencidas)===n?" selected":""}>${n===0?"Nenhuma":n+(n===1?" período":" períodos")}</option>`).join("")}</select>`, b.periodosCompletos!==undefined?`Períodos completos desde a admissão: ${b.periodosCompletos}`:"")}
        ${campo("Dependentes para IRRF", inp("dependentes","number",'min="0"'))}
        ${campo("13º já adiantado (R$)", inp("adiant13","", "moeda"), "1ª parcela paga no ano, se houver")}
      </div>${resumo}</div>
    <div class="rr-bloco"><div class="rr-bloco-tit">4. Verbas <span class="muted" style="font-weight:400">— o sistema já trouxe tudo a que tem direito; desmarque o que não for pagar ou adicione outras</span>
      <button class="btn small out" style="float:right" type="button" onclick="rrRecalcularRescisao(rrRescisaoAtual,true); rrAgendar(rrRenderRescisao)">↺ Recalcular do zero</button></div>
      ${rrHtmlVerbas(d.verbas, "rrRenderRescisao")}
      <div style="margin-top:10px"><label>Observações (saem no documento)</label><textarea rows="2" onchange="rrRescisaoAtual.obs=this.value">${esc(d.obs||"")}</textarea></div>
    </div>
    <div class="rr-bloco rr-acoes">
      <button class="btn pri" type="button" onclick="rrSalvarRescisao()">💾 Salvar rescisão</button>
      <button class="btn out" type="button" onclick="rrImprimirRescisao('trct')">🖨 Imprimir modelo TRCT</button>
      <button class="btn out" type="button" onclick="rrImprimirRescisao('moderno')">🖨 Imprimir layout moderno</button>
      <button class="btn out" type="button" onclick="rrNovaRescisaoTela()">+ Nova rescisão</button>
    </div>
    ${rrHtmlHistorico("rescisoes")}`;
}

async function rrNovaRescisaoTela(){
  if(rrRescisaoAtual.calculado && !await confirmar("Começar uma rescisão nova? O que não foi salvo nesta será perdido.")) return;
  rrRescisaoAtual = rrNovaRescisao(); rrRenderRescisao();
}
function rrSalvarDocumento(lista, d, rotulo){
  const r = rrState(); const {f} = rrDadosDocumento(d);
  const copia = JSON.parse(JSON.stringify(d));
  copia.nomeFuncionario = f.nome || copia.nomeFuncionario || ""; copia.salvoEm = new Date().toISOString();
  if(!copia.id) copia.id = rrId();
  const i = r[lista].findIndex(x=>x.id===copia.id);
  if(i>=0) r[lista][i] = copia; else r[lista].push(copia);
  d.id = copia.id;
  saved(); rrMostrar();
  aviso(rotulo + " salva no histórico.");
}
function rrSalvarRescisao(){
  const b = rrBaseRescisao(rrRescisaoAtual);
  if(b.erros.length) return aviso(b.erros.join("\n"));
  rrSalvarDocumento("rescisoes", rrRescisaoAtual, "Rescisão");
}

// Histórico (rescisões, recibos de férias, recibos de pagamento)
function rrHtmlHistorico(lista){
  const docs = rrState()[lista].slice().sort((a,b)=>String(b.salvoEm).localeCompare(String(a.salvoEm)));
  if(!docs.length) return "";
  const desc = x => lista==="rescisoes" ? (RR_TIPOS_RESCISAO[x.tipo]?.nome||"") + " · desligamento " + rrDataBR(x.dataDesligamento)
    : lista==="recibosFerias" ? "Férias de " + rrDataBR(x.inicio) : (x.tipoNome||"Recibo") + " · " + (x.referencia||"");
  return `<div class="rr-bloco"><div class="rr-bloco-tit">Histórico</div><table class="rr-tab"><thead><tr><th>Funcionário</th><th>Empresa</th><th>Documento</th><th>Líquido</th><th>Salvo em</th><th></th></tr></thead><tbody>
    ${docs.map(x=>`<tr><td><b>${esc(x.nomeFuncionario||"")}</b></td><td>${esc(rrEmpresa(x.empCod)?.nome||x.empCod)}</td><td>${esc(desc(x))}</td><td>R$ ${rrBRL(rrTotais(x.verbas).liquido)}</td><td>${esc(new Date(x.salvoEm).toLocaleString("pt-BR"))}</td>
      <td style="white-space:nowrap"><button class="btn small out" type="button" onclick="rrAbrirDocumento('${lista}','${x.id}')">Abrir</button> <button class="btn small red" type="button" onclick="rrExcluirDocumento('${lista}','${x.id}')">🗑</button></td></tr>`).join("")}
  </tbody></table></div>`;
}
function rrAbrirDocumento(lista, id){
  const x = rrState()[lista].find(d=>d.id===id); if(!x) return;
  const copia = JSON.parse(JSON.stringify(x));
  if(lista==="rescisoes") rrRescisaoAtual = copia; else if(lista==="recibosFerias") rrFeriasAtual = copia; else rrPagamentoAtual = copia;
  rrMostrar(); window.scrollTo({top:0, behavior:"smooth"});
}
async function rrExcluirDocumento(lista, id){
  const r = rrState(); const x = r[lista].find(d=>d.id===id); if(!x) return;
  if(!await confirmar(`Excluir do histórico o documento de ${x.nomeFuncionario||"funcionário"}?`)) return;
  r[lista] = r[lista].filter(d=>d.id!==id); saved(); rrMostrar();
}

// ---------- impressão da rescisão ----------
function rrImprimirRescisao(modelo){
  const d = rrRescisaoAtual;
  const b = rrBaseRescisao(d);
  if(b.erros.length) return aviso(b.erros.join("\n"));
  rrRecalcularRescisao(d, false);
  const {emp, ce, f, cf} = rrDadosDocumento(d);
  const t = b.t, tot = rrTotais(d.verbas);
  const semRegistro = String(d.ref).startsWith("av:");
  const prov = d.verbas.filter(v=>v.incluir && v.tipo==="P" && rrNum(v.valor)), desc = d.verbas.filter(v=>v.incluir && v.tipo==="D" && rrNum(v.valor));
  const endEmp = [ce.endereco, ce.bairro, ce.cidade && (ce.cidade + (ce.uf?"/"+ce.uf:"")), ce.cep && "CEP " + ce.cep].filter(Boolean).join(" · ");
  const titulo = `Rescisão - ${f.nome||""}`;
  if(modelo === "moderno"){
    const linhas = l => l.map(v=>`<tr><td>${esc(v.desc)}</td><td class="c">${esc(v.ref||"")}</td><td class="r">${rrBRL(rrNum(v.valor))}</td></tr>`).join("") || '<tr><td colspan="3" class="c" style="color:#888">—</td></tr>';
    const corpo = `<div class="doc">
      <div class="topo"><div><div class="emp">${esc(emp.nome||"")}</div><div class="cinza">${esc(ce.cnpj?"CNPJ "+ce.cnpj:"")}${endEmp?" · "+esc(endEmp):""}</div></div><div class="selo">Rescisão de contrato<br><b>${esc(t.nome)}</b></div></div>
      <div class="cards">
        <div><span>Funcionário</span><b>${esc(f.nome||"")}</b><small>${esc(f.funcao||d.funcao||"")}${cf.cpf?" · CPF "+esc(cf.cpf):""}${semRegistro?" · sem registro":""}</small></div>
        <div><span>Admissão</span><b>${rrDataBR(d.admissao)}</b><small>${b.anos} ano${b.anos===1?"":"s"} de casa</small></div>
        <div><span>Desligamento</span><b>${rrDataBR(d.dataDesligamento)}</b><small>${b.diasAviso?"Aviso "+esc(RR_AVISO_NOMES[b.aviso]?.[0]||"")+" · "+b.diasAviso+" dias":"Sem aviso prévio"}</small></div>
        <div><span>Salário</span><b>R$ ${rrBRL(b.sal)}</b><small>${b.projetada!==d.dataDesligamento?"Projeção: "+rrDataBR(b.projetada):""}</small></div>
      </div>
      <div class="duas"><div><h3 class="p">Proventos</h3><table><tr><th>Verba</th><th class="c">Ref.</th><th class="r">Valor</th></tr>${linhas(prov)}<tr class="tot"><td colspan="2">Total de proventos</td><td class="r">${rrBRL(tot.prov)}</td></tr></table></div>
        <div><h3 class="d">Descontos</h3><table><tr><th>Verba</th><th class="c">Ref.</th><th class="r">Valor</th></tr>${linhas(desc)}<tr class="tot"><td colspan="2">Total de descontos</td><td class="r">${rrBRL(tot.desc)}</td></tr></table></div></div>
      <div class="liq"><span>Valor líquido a receber</span><b>R$ ${rrBRL(tot.liquido)}</b><small>${esc(rrExtenso(tot.liquido))}</small></div>
      ${d.obs?`<div class="obs"><b>Observações:</b> ${esc(d.obs)}</div>`:""}
      <p class="quit">Recebi de <b>${esc(emp.nome||"")}</b> a importância líquida de <b>R$ ${rrBRL(tot.liquido)}</b> (${esc(rrExtenso(tot.liquido))}), referente às verbas rescisórias acima discriminadas, em decorrência da rescisão do meu contrato de trabalho.</p>
      <p class="cinza">${esc(ce.cidade||"")}${ce.cidade?", ":""}${rrDataBR(rrHoje())}</p>
      <div class="ass"><div>${esc(emp.nome||"Empregador")}<br><small>Empregador</small></div><div>${esc(f.nome||"")}<br><small>Empregado</small></div></div>
    </div>`;
    rrAbrirImpressao(titulo, corpo, `
      .doc{padding:6mm 2mm;font-size:12px}.topo{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1B3A6B;padding-bottom:8px}
      .emp{font-size:18px;font-weight:800;color:#1B3A6B}.cinza{color:#555;font-size:11px}.selo{text-align:right;color:#1B3A6B;font-size:11px}.selo b{font-size:14px}
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.cards div{border:1px solid #d8e0ea;border-radius:8px;padding:8px}
      .cards span{display:block;font-size:10px;color:#667085;text-transform:uppercase}.cards b{display:block;font-size:13px}.cards small{color:#555}
      .duas{display:grid;grid-template-columns:1fr 1fr;gap:12px}h3{margin:6px 0;font-size:13px}h3.p{color:#166534}h3.d{color:#b91c1c}
      table{width:100%;border-collapse:collapse}th{font-size:10px;text-transform:uppercase;color:#667085;text-align:left;border-bottom:1px solid #d8e0ea;padding:4px}
      td{padding:5px 4px;border-bottom:1px solid #eef2f6}.c{text-align:center}.r{text-align:right;white-space:nowrap}.tot td{font-weight:800;border-top:2px solid #d8e0ea}
      .liq{margin-top:14px;background:#eef4ff;color:#0f2a55;border:2px solid #1B3A6B;border-radius:10px;padding:12px 16px;display:grid;grid-template-columns:1fr auto;align-items:center}
      .liq span{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}.liq b{font-size:26px;font-weight:900;text-align:right;color:#0f2a55}.liq small{grid-column:1/-1;font-size:12.5px;font-weight:700;color:#1e293b;margin-top:4px}
      .obs{margin-top:10px;border:1px dashed #d8e0ea;padding:8px;border-radius:8px}.quit{margin-top:16px;line-height:1.6}
      .ass{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:50px;text-align:center}.ass div{border-top:1px solid #111;padding-top:4px}`);
    return;
  }
  // Modelo TRCT (estrutura do Termo de Rescisão do Contrato de Trabalho)
  const cel = (n, rot, val, span) => `<td colspan="${span||1}"><div class="n">${n} ${rot}</div><div class="v">${esc(val||"")}</div></td>`;
  const linhasVerbas = (l) => {
    const cells = l.map(v=>`<td><div class="n">${esc(v.cod||"")} ${esc(v.desc)}${v.ref?" ("+esc(v.ref)+")":""}</div><div class="v r">${rrBRL(rrNum(v.valor))}</div></td>`);
    while(cells.length % 3) cells.push("<td></td>");
    const rows = []; for(let i=0;i<cells.length;i+=3) rows.push("<tr>"+cells.slice(i,i+3).join("")+"</tr>");
    return rows.join("");
  };
  const corpo = `<div class="trct">
    <div class="tit">TERMO DE RESCISÃO DO CONTRATO DE TRABALHO</div>
    <table><tr><th colspan="4">IDENTIFICAÇÃO DO EMPREGADOR</th></tr>
      <tr>${cel("01","CNPJ/CEI",ce.cnpj)}${cel("02","Razão Social/Nome",emp.nome,3)}</tr>
      <tr>${cel("03","Endereço (logradouro, nº, andar, apartamento)",ce.endereco,2)}${cel("04","Bairro",ce.bairro,2)}</tr>
      <tr>${cel("05","Município",ce.cidade)}${cel("06","UF",ce.uf)}${cel("07","CEP",ce.cep)}${cel("08","CNAE",ce.cnae)}</tr></table>
    <table><tr><th colspan="4">IDENTIFICAÇÃO DO TRABALHADOR</th></tr>
      <tr>${cel("10","PIS/PASEP",cf.pis)}${cel("11","Nome",f.nome,3)}</tr>
      <tr>${cel("12","Endereço (logradouro, nº, andar, apartamento)",cf.endereco,2)}${cel("13","Bairro",cf.bairro,2)}</tr>
      <tr>${cel("14","Município",cf.cidade)}${cel("15","UF",cf.uf)}${cel("16","CEP",cf.cep)}${cel("17","CTPS (nº, série, UF)",[cf.ctps,cf.serieCtps].filter(Boolean).join(" "))}</tr>
      <tr>${cel("18","CPF",cf.cpf)}${cel("19","Data de nascimento",rrDataBR(cf.nascimento))}${cel("20","Nome da mãe",cf.mae,2)}</tr></table>
    <table><tr><th colspan="4">DADOS DO CONTRATO</th></tr>
      <tr>${cel("21","Tipo de contrato",semRegistro?"Sem registro em CTPS":(d.tipo==="termino_exp"||d.tipo.startsWith("quebra"))?"Contrato de experiência (prazo determinado)":"Contrato por prazo indeterminado",2)}${cel("22","Causa do afastamento",t.causa,2)}</tr>
      <tr>${cel("23","Remuneração mês anterior","R$ "+rrBRL(b.sal))}${cel("24","Data de admissão",rrDataBR(d.admissao))}${cel("25","Data do aviso prévio",b.diasAviso?rrDataBR(d.dataAviso||d.dataDesligamento):"")}${cel("26","Data de afastamento",rrDataBR(d.dataDesligamento))}</tr>
      <tr>${cel("27","Código afastamento",semRegistro?"—":t.cod)}${cel("28","Pensão alimentícia (%)","")}${cel("29","Categoria do trabalhador",semRegistro?"—":"01 - Empregado")}${cel("","Função",f.funcao||d.funcao||"")}</tr></table>
    <table><tr><th colspan="3">DISCRIMINAÇÃO DAS VERBAS RESCISÓRIAS — VERBAS RESCISÓRIAS</th></tr>${linhasVerbas(prov)}
      <tr><td colspan="2" class="dir"><b>TOTAL RESCISÓRIO BRUTO</b></td><td><div class="v r"><b>${rrBRL(tot.prov)}</b></div></td></tr></table>
    <table><tr><th colspan="3">DEDUÇÕES</th></tr>${linhasVerbas(desc)}
      <tr><td colspan="2" class="dir"><b>TOTAL DAS DEDUÇÕES</b></td><td><div class="v r"><b>${rrBRL(tot.desc)}</b></div></td></tr>
      <tr><td colspan="2" class="dir"><b>VALOR RESCISÓRIO LÍQUIDO</b></td><td><div class="v r"><b>R$ ${rrBRL(tot.liquido)}</b></div></td></tr></table>
    ${d.obs?`<table><tr><th>INFORMAÇÕES COMPLEMENTARES</th></tr><tr><td><div class="v">${esc(d.obs)}</div></td></tr></table>`:""}
    <table><tr><th>TERMO DE QUITAÇÃO DE RESCISÃO DO CONTRATO DE TRABALHO</th></tr><tr><td class="txt">
      Foi realizada a rescisão do contrato de trabalho do trabalhador acima qualificado, nos termos do artigo 477 da Consolidação das Leis do Trabalho (CLT), sendo efetuado nesta data o pagamento das verbas rescisórias especificadas no corpo do TRCT, no valor líquido de <b>R$ ${rrBRL(tot.liquido)}</b> (${esc(rrExtenso(tot.liquido))}), o qual, devidamente rubricado pelas partes, é parte integrante do presente Termo de Quitação.
      <div class="local">${esc(ce.cidade||"_____________________")}, ${rrDataBR(rrHoje())}</div>
      <div class="ass"><div>Assinatura do empregador ou preposto<br><small>${esc(emp.nome||"")}</small></div><div>Assinatura do trabalhador<br><small>${esc(f.nome||"")}</small></div></div>
    </td></tr></table>
    <div class="rod">Documento elaborado com base no modelo de TRCT. Conferir os dados antes de assinar.</div>
  </div>`;
  rrAbrirImpressao(titulo, corpo, `
    .trct{font-size:9.5px}.tit{text-align:center;font-weight:800;font-size:13px;border:1.5px solid #111;padding:5px;margin-bottom:3px}
    table{width:100%;border-collapse:collapse;margin-bottom:3px;table-layout:fixed}th{background:#e5e7eb;border:1px solid #111;padding:3px;text-align:center;font-size:9.5px}
    td{border:1px solid #111;padding:2px 4px;vertical-align:top}.n{font-size:8px;color:#333}.v{font-size:10.5px;min-height:13px;font-weight:600}.r{text-align:right}
    .dir{text-align:right}.txt{font-size:10px;line-height:1.5;padding:6px}.local{margin-top:10px}
    .ass{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:38px;text-align:center}.ass div{border-top:1px solid #111;padding-top:3px}
    .rod{text-align:center;color:#666;font-size:8px;margin-top:4px}`);
}
