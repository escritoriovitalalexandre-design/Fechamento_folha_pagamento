// ========== MÓDULO RESCISÕES E RECIBOS — RECIBO DE PAGAMENTO ==========
// Recibo simples (2 vias numa folha A4). Os proventos e descontos são lançados livremente;
// "Preencher sugestão" monta os valores do tipo escolhido e, se marcado, calcula INSS e IRRF.

const RR_TIPOS_RECIBO = {
  salario:      "Recibo de pagamento de salário",
  horas_extras: "Recibo de pagamento de horas extras",
  adiantamento: "Recibo de adiantamento salarial",
  decimo:       "Recibo de pagamento de 13º salário",
  outros:       "Recibo de pagamento"
};

let rrPagamentoAtual = rrNovoPagamento();
function rrNovoPagamento(){
  const h = new Date();
  const ref = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][h.getMonth()] + "/" + h.getFullYear();
  return {id: null, empCod: "", ref: "", tipo: "salario", descricaoOutro: "", referencia: ref, data: rrHoje(), forma: "Dinheiro", salario: "",
          impostos: false, dependentes: 0, horas50: "", horas100: "", divisor: 220, pctAdiant: 40, parcela13: "1", avos13: 12,
          verbas: [], obs: "", calculado: false};
}

// Recalcula só as linhas automáticas de INSS/IRRF (os proventos são manuais)
function rrRecalcularPagamento(d){
  const manuais = (d.verbas||[]).filter(v=>!v.auto);
  const antigas = {}; (d.verbas||[]).filter(v=>v.auto).forEach(v=>antigas[v.chave]=v);
  const lista = [];
  if(d.impostos){
    const add = (chave, desc, ref, valor) => {
      const ant = antigas[chave];
      const v = {id: ant?.id || rrId(), chave, cod: "", desc, ref, tipo: "D", valor: rr2(valor), incluir: ant ? ant.incluir : true, auto: true, editado: false, inss:false, irrf:false, fgts:false};
      if(ant && ant.editado){ v.valor = ant.valor; v.editado = true; }
      if(v.valor > 0 || v.editado) lista.push(v);
    };
    const inc = manuais.filter(v=>v.incluir && v.tipo==="P");
    const baseINSS = inc.filter(v=>v.inss).reduce((s,v)=>s+rrNum(v.valor),0);
    const inss = rrCalcINSS(baseINSS);
    add("inss", "INSS (previdência social)", baseINSS ? "base " + rrBRL(baseINSS) : "", inss);
    const inssUsado = antigas.inss?.editado ? rrNum(antigas.inss.valor) : inss;
    const rend = inc.filter(v=>v.irrf).reduce((s,v)=>s+rrNum(v.valor),0);
    add("irrf", "IRRF", d.dependentes ? d.dependentes + " dep." : "", rrCalcIRRF(rend, inssUsado, parseInt(d.dependentes)||0, d.tipo==="decimo"));
  }
  d.verbas = manuais.concat(lista);
  d.calculado = !!(d.empCod && d.ref && rrTotais(d.verbas).prov);
}

// Monta os proventos sugeridos para o tipo escolhido (substitui os proventos atuais)
async function rrPreencherPagamento(){
  const d = rrPagamentoAtual;
  const sal = rrNum(d.salario);
  if(!sal && d.tipo!=="outros") return aviso("Informe o salário para o sistema sugerir os valores.");
  if((d.verbas||[]).some(v=>!v.auto && v.tipo==="P") && !await confirmar("Substituir os proventos já lançados pela sugestão?")) return;
  const P = (desc, ref, valor, trib) => ({id: rrId(), cod: "", desc, ref, tipo: "P", valor: rr2(valor), incluir: true, auto: false, inss: trib, irrf: trib, fgts: trib});
  let prov = [];
  if(d.tipo === "salario") prov = [P("Salário", "30 dias", sal, true)];
  else if(d.tipo === "adiantamento"){ const pct = rrNum(d.pctAdiant)||40; prov = [P("Adiantamento salarial", pct + "%", sal*pct/100, false)]; }
  else if(d.tipo === "horas_extras"){
    const hora = sal / (rrNum(d.divisor)||220);
    const h50 = rrNum(d.horas50), h100 = rrNum(d.horas100);
    if(!h50 && !h100) return aviso("Informe a quantidade de horas extras (50% e/ou 100%).");
    if(h50) prov.push(P("Horas extras 50%", rrBRL(h50) + " h", hora*1.5*h50, true));
    if(h100) prov.push(P("Horas extras 100%", rrBRL(h100) + " h", hora*2*h100, true));
  }
  else if(d.tipo === "decimo"){
    const avos = Math.min(12, Math.max(1, parseInt(d.avos13)||12));
    const integral = sal/12*avos;
    prov = d.parcela13 === "1" ? [P("13º salário — 1ª parcela", avos + "/12 avos", integral/2, false)]
                               : [P("13º salário — 2ª parcela", avos + "/12 avos", integral, true)];
    if(d.parcela13 === "2") d.verbas = (d.verbas||[]).filter(v=>!(v.tipo==="D" && !v.auto && /1ª parcela/.test(v.desc)))
      .concat([{id: rrId(), cod: "", desc: "Adiantamento 13º (1ª parcela)", ref: "", tipo: "D", valor: rr2(integral/2), incluir: true, auto: false}]);
  }
  else prov = [P(d.descricaoOutro || "Pagamento", "", sal, false)];
  d.verbas = prov.concat((d.verbas||[]).filter(v=>v.tipo==="D" && !v.auto));
  rrRenderPagamento();
}

function rrRenderPagamento(){
  const d = rrPagamentoAtual;
  if(d.empCod && d.ref && !d.salario){ const f = rrFuncionario(d.empCod, d.ref); if(f) d.salario = rrBRL(f.salario); }
  rrRecalcularPagamento(d);
  const campo = (rot, html, dica) => `<div><label>${rot}</label>${html}${dica?`<div class="muted" style="font-size:11px;margin-top:2px">${dica}</div>`:""}</div>`;
  const inp = (k, tipo, extra) => rrInput("rrPagamentoAtual", d, k, tipo, extra==="moeda"?"moeda":"", extra==="moeda"?"":extra, "rrRenderPagamento");
  const tipos = Object.entries(RR_TIPOS_RECIBO).map(([k,nome])=>`<label class="rr-opcao${d.tipo===k?" sel":""}"><input type="radio" name="rrTipoRec" ${d.tipo===k?"checked":""} onchange="rrPagamentoAtual.tipo='${k}'; rrAgendar(rrRenderPagamento)"> ${esc({salario:"Salário",horas_extras:"Horas extras",adiantamento:"Adiantamento",decimo:"13º salário",outros:"Outros"}[k])}</label>`).join("");
  const extras = d.tipo==="horas_extras" ? `${campo("Horas extras 50%", inp("horas50"), "Ex.: 10 ou 7,5")}${campo("Horas extras 100%", inp("horas100"))}${campo("Divisor de horas", inp("divisor","number"), "220 para 44h semanais")}`
    : d.tipo==="adiantamento" ? campo("Percentual do adiantamento", inp("pctAdiant","number"), "Normalmente 40%")
    : d.tipo==="decimo" ? `${campo("Parcela", `<select onchange="rrPagamentoAtual.parcela13=this.value; rrAgendar(rrRenderPagamento)"><option value="1"${d.parcela13==="1"?" selected":""}>1ª parcela (até 30/11)</option><option value="2"${d.parcela13==="2"?" selected":""}>2ª parcela (até 20/12)</option></select>`)}${campo("Avos de 13º", inp("avos13","number",'min="1" max="12"'), "Meses trabalhados no ano")}`
    : d.tipo==="outros" ? campo("Descrição do pagamento", inp("descricaoOutro"), "Ex.: Diárias, Comissão, Prêmio") : "";
  document.getElementById("rrConteudo").innerHTML = `${d.impostos?rrHtmlAvisoTabelas():""}
    ${rrHtmlQuem(d, "rrRenderPagamento")}
    <div class="rr-bloco"><div class="rr-bloco-tit">2. Tipo de recibo</div><div class="rr-opcoes">${tipos}</div>
      <div class="rr-grid" style="margin-top:10px">
        ${campo("Referência", inp("referencia"), "Ex.: Novembro/2026")}
        ${campo("Data do pagamento", inp("data","date"))}
        ${campo("Forma de pagamento", `<select onchange="rrPagamentoAtual.forma=this.value">${["Dinheiro","PIX","Transferência","Depósito","Cheque"].map(x=>`<option${d.forma===x?" selected":""}>${x}</option>`).join("")}</select>`)}
        ${campo("Salário (R$)", inp("salario","", "moeda"))}
        ${extras}
        ${campo("Calcular INSS e IRRF", `<select onchange="rrPagamentoAtual.impostos=this.value==='1'; rrAgendar(rrRenderPagamento)"><option value="0"${d.impostos?"":" selected"}>Não</option><option value="1"${d.impostos?" selected":""}>Sim</option></select>`)}
        ${d.impostos?campo("Dependentes para IRRF", inp("dependentes","number",'min="0"')):""}
      </div>
      <button class="btn pri" type="button" style="margin-top:10px" onclick="rrPreencherPagamento()">✨ Preencher sugestão de valores</button></div>
    <div class="rr-bloco"><div class="rr-bloco-tit">3. Proventos e descontos</div>
      ${rrHtmlVerbas(d.verbas, "rrRenderPagamento")}
      <div style="margin-top:10px"><label>Observações (saem no recibo)</label><textarea rows="2" onchange="rrPagamentoAtual.obs=this.value">${esc(d.obs||"")}</textarea></div>
    </div>
    <div class="rr-bloco rr-acoes">
      <button class="btn pri" type="button" onclick="rrSalvarPagamento()">💾 Salvar recibo</button>
      <button class="btn out" type="button" onclick="rrImprimirPagamento()">🖨 Imprimir (2 vias numa folha)</button>
      <button class="btn out" type="button" onclick="rrNovoPagamentoTela()">+ Novo recibo</button>
    </div>
    ${rrHtmlHistorico("recibosPagamento")}`;
}
async function rrNovoPagamentoTela(){
  if(rrPagamentoAtual.calculado && !await confirmar("Começar um recibo novo? O que não foi salvo será perdido.")) return;
  rrPagamentoAtual = rrNovoPagamento(); rrRenderPagamento();
}
function rrTituloRecibo(d){ return d.tipo==="outros" && d.descricaoOutro ? "Recibo de pagamento — " + d.descricaoOutro : RR_TIPOS_RECIBO[d.tipo]; }
function rrSalvarPagamento(){
  const d = rrPagamentoAtual;
  if(!d.empCod || !d.ref) return aviso("Escolha a empresa e o funcionário.");
  if(!rrTotais(d.verbas).prov) return aviso("Lance pelo menos um provento.");
  d.tipoNome = rrTituloRecibo(d);
  rrSalvarDocumento("recibosPagamento", d, "Recibo");
}

function rrImprimirPagamento(){
  const d = rrPagamentoAtual;
  if(!d.empCod || !d.ref) return aviso("Escolha a empresa e o funcionário.");
  rrRecalcularPagamento(d);
  const tot = rrTotais(d.verbas);
  if(!tot.prov) return aviso("Lance pelo menos um provento.");
  const {emp, ce, f, cf} = rrDadosDocumento(d);
  const prov = d.verbas.filter(v=>v.incluir && v.tipo==="P" && rrNum(v.valor)), desc = d.verbas.filter(v=>v.incluir && v.tipo==="D" && rrNum(v.valor));
  const linhas = [];
  prov.forEach(v=>linhas.push(`<tr><td>${esc(v.desc)}</td><td class="c">${esc(v.ref||"")}</td><td class="r">${rrBRL(rrNum(v.valor))}</td><td></td></tr>`));
  desc.forEach(v=>linhas.push(`<tr><td>${esc(v.desc)}</td><td class="c">${esc(v.ref||"")}</td><td></td><td class="r">${rrBRL(rrNum(v.valor))}</td></tr>`));
  const titulo = rrTituloRecibo(d);
  const via = (nomeVia) => `<div class="via">
      <div class="cab"><div><b class="emp">${esc(emp.nome||"")}</b><div class="cinza">${esc(ce.cnpj?"CNPJ "+ce.cnpj:"")}${ce.endereco?" · "+esc(ce.endereco):""}${ce.cidade?" · "+esc(ce.cidade)+(ce.uf?"/"+esc(ce.uf):""):""}</div></div><div class="tag">${esc(nomeVia)}</div></div>
      <div class="tit">${esc(titulo).toUpperCase()}</div>
      <div class="info"><span>Funcionário: <b>${esc(f.nome||"")}</b></span><span>${esc(f.funcao||"")}</span>${cf.cpf?`<span>CPF ${esc(cf.cpf)}</span>`:""}<span>Referência: <b>${esc(d.referencia||"")}</b></span></div>
      <table><tr><th>Descrição</th><th class="c">Ref.</th><th class="r">Proventos</th><th class="r">Descontos</th></tr>${linhas.join("")}
        <tr class="tot"><td colspan="2">Totais</td><td class="r">${rrBRL(tot.prov)}</td><td class="r">${rrBRL(tot.desc)}</td></tr></table>
      <div class="liq"><span>Valor líquido</span><b>R$ ${rrBRL(tot.liquido)}</b></div>
      <p>Recebi de <b>${esc(emp.nome||"")}</b> a importância de <b>R$ ${rrBRL(tot.liquido)}</b> (${esc(rrExtenso(tot.liquido))}), referente a ${esc(titulo.toLowerCase().replace(/^recibo de /,""))} — ${esc(d.referencia||"")}, pago em ${esc(d.forma||"")}, dando plena e geral quitação.${d.obs?" Obs.: "+esc(d.obs):""}</p>
      <div class="fim"><span>${esc(ce.cidade||"")}${ce.cidade?", ":""}${rrDataBR(d.data)}</span><div class="ass">${esc(f.nome||"")}<br><small>Assinatura do funcionário</small></div></div>
    </div>`;
  const corpo = `<div class="folha">${via("Via da empresa")}<div class="corte">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>${via("Via do funcionário")}</div>`;
  rrAbrirImpressao(titulo + " - " + (f.nome||""), corpo, `
    @page{size:A4;margin:8mm}.folha{display:flex;flex-direction:column;gap:0}
    .via{height:134mm;border:1.5px solid #1B3A6B;border-radius:8px;padding:8px 12px;display:flex;flex-direction:column;font-size:11px;overflow:hidden}
    .cab{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1B3A6B;padding-bottom:5px}.emp{font-size:14px;color:#1B3A6B}.cinza{color:#555;font-size:10px}
    .tag{background:#1B3A6B;color:#fff;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;white-space:nowrap}
    .tit{text-align:center;font-weight:800;color:#1B3A6B;letter-spacing:.04em;margin:6px 0}
    .info{display:flex;flex-wrap:wrap;gap:4px 14px;background:#f1f5f9;border-radius:6px;padding:5px 8px;margin-bottom:6px}
    table{width:100%;border-collapse:collapse}th{text-align:left;font-size:9.5px;color:#667085;border-bottom:1px solid #d8e0ea;padding:3px}
    td{padding:3px;border-bottom:1px solid #eef2f6}.c{text-align:center}.r{text-align:right;white-space:nowrap}.tot td{font-weight:800}
    .liq{margin-top:6px;margin-left:auto;background:#1B3A6B;color:#fff;border-radius:6px;padding:5px 12px;display:flex;gap:14px;align-items:center}.liq b{font-size:15px}
    p{line-height:1.5;margin:6px 0}.fim{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end}
    .ass{text-align:center;border-top:1px solid #111;padding-top:3px;min-width:60%}
    .corte{text-align:center;color:#999;font-size:9px;margin:2.5mm 0;white-space:nowrap;overflow:hidden}`);
}

// ---------- aba Tabelas INSS/IRRF ----------
function rrRenderTabelas(){
  const t = rrState().tabelas;
  const linhaInss = (f,i) => `<tr><td>Até R$ <input class="rr-mini" value="${rrBRL(f.ate)}" onchange="rrTabAlterar('inss',${i},'ate',this.value)"></td><td><input class="rr-mini" value="${f.aliq}" onchange="rrTabAlterar('inss',${i},'aliq',this.value)"> %</td></tr>`;
  const linhaIr = (f,i) => `<tr><td>${f.ate===null?"Acima":`Até R$ <input class="rr-mini" value="${rrBRL(f.ate)}" onchange="rrTabAlterar('irrf',${i},'ate',this.value)">`}</td><td><input class="rr-mini" value="${f.aliq}" onchange="rrTabAlterar('irrf',${i},'aliq',this.value)"> %</td><td>R$ <input class="rr-mini" value="${rrBRL(f.ded)}" onchange="rrTabAlterar('irrf',${i},'ded',this.value)"></td></tr>`;
  const v = (k, rot) => `<div><label>${rot}</label><input value="${rrBRL(t.irrf[k])}" onchange="rrState().tabelas.irrf.${k}=rrNum(this.value); rrTabMudou()"></div>`;
  document.getElementById("rrConteudo").innerHTML = `
    <div class="rr-bloco"><div class="rr-bloco-tit">Tabelas usadas nos cálculos (${t.ano})</div>
      ${t.conferidas ? `<div class="rr-ok">✔ Tabelas conferidas${t.conferidasPor?" por "+esc(t.conferidasPor):""}${t.conferidasEm?" em "+esc(new Date(t.conferidasEm).toLocaleDateString("pt-BR")):""}.</div>`
        : `<div class="rr-alerta">Confira os valores abaixo com a publicação oficial (Portaria do INSS e tabela da Receita Federal). Depois clique em <b>Marcar como conferidas</b>.</div>`}
      <div class="rr-duas">
        <div><h4>INSS — contribuição do empregado (progressiva)</h4><table class="rr-tab"><thead><tr><th>Faixa de salário</th><th>Alíquota</th></tr></thead><tbody>${t.inss.map(linhaInss).join("")}</tbody></table>
          <div class="muted" style="font-size:11px;margin-top:4px">Acima da última faixa (teto) não há contribuição adicional.</div>
          <div style="margin-top:10px"><label>Salário mínimo</label><input value="${rrBRL(t.salarioMinimo)}" onchange="rrState().tabelas.salarioMinimo=rrNum(this.value); rrTabMudou()"></div></div>
        <div><h4>IRRF — tabela mensal</h4><table class="rr-tab"><thead><tr><th>Base de cálculo</th><th>Alíquota</th><th>Parcela a deduzir</th></tr></thead><tbody>${t.irrf.faixas.map(linhaIr).join("")}</tbody></table>
          <div class="rr-grid" style="margin-top:10px">${v("dependente","Dedução por dependente")}${v("simplificado","Desconto simplificado mensal")}${v("reducaoIsentoAte","Isento até (rendimento)")}${v("reducaoMax","Redução máxima")}${v("reducaoAte","Redução parcial até")}${v("reducaoA","Redução: valor fixo")}<div><label>Redução: fator</label><input value="${t.irrf.reducaoB}" onchange="rrState().tabelas.irrf.reducaoB=Number(String(this.value).replace(',','.'))||0; rrTabMudou()"></div></div>
          <div class="muted" style="font-size:11px;margin-top:4px">Redução da Lei 15.270/2025: rendimentos até o limite de isenção ficam sem imposto; na faixa seguinte, redução = valor fixo − fator × rendimento.</div></div>
      </div>
      <div class="rr-acoes" style="margin-top:12px">
        <button class="btn pri" type="button" onclick="rrTabConferir()">✔ Marcar como conferidas</button>
        <button class="btn out" type="button" onclick="rrTabRestaurar()">Restaurar valores padrão</button>
        <span class="muted">Teste rápido: INSS de R$ 3.000,00 = R$ ${rrBRL(rrCalcINSS(3000))} · IRRF de R$ 6.000,00 (sem dependentes) = R$ ${rrBRL(rrCalcIRRF(6000, rrCalcINSS(6000), 0))}</span>
      </div>
    </div>`;
}
function rrTabAlterar(tab, i, campo, valor){
  const t = rrState().tabelas; const lista = tab==="inss" ? t.inss : t.irrf.faixas;
  lista[i][campo] = campo==="aliq" ? (Number(String(valor).replace(",","."))||0) : rrNum(valor);
  rrTabMudou();
}
function rrTabMudou(){ const t = rrState().tabelas; t.conferidas = false; save(); rrRenderTabelas(); }
function rrTabConferir(){
  const t = rrState().tabelas;
  t.conferidas = true; t.conferidasEm = new Date().toISOString(); t.conferidasPor = (document.getElementById("sbUsuario")?.textContent||"").trim();
  saved(); rrRenderTabelas();
}
async function rrTabRestaurar(){
  if(!await confirmar("Voltar as tabelas para os valores padrão do sistema?")) return;
  rrState().tabelas = JSON.parse(JSON.stringify(RR_TABELAS_PADRAO)); saved(); rrRenderTabelas();
}
