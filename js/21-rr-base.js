// ========== MÓDULO RESCISÕES E RECIBOS — BASE ==========
// Dados em state.rr:
//   empresas:     { codEmpresa: {cnpj, endereco, bairro, cidade, uf, cep, cnae} }  (complemento p/ documentos)
//   funcionarios: { "codEmpresa|codFuncionario": {cpf, pis, ctps, serieCtps, nascimento, mae, endereco, bairro, cidade, uf, cep} }
//   avulsos:      [ {id, empCod, nome, funcao, salario, admissao, ...complemento} ]  (sem registro)
//   rescisoes / recibosFerias / recibosPagamento: documentos salvos
//   tabelas:      INSS, IRRF e salário mínimo (editáveis na aba "Tabelas")

// Valores de 2026 — CONFERIR com a publicação oficial antes de usar (aba Tabelas).
const RR_TABELAS_PADRAO = {
  ano: 2026, conferidas: false, salarioMinimo: 1621.00,
  inss: [ {ate: 1621.00, aliq: 7.5}, {ate: 2902.84, aliq: 9}, {ate: 4354.27, aliq: 12}, {ate: 8475.55, aliq: 14} ],
  irrf: {
    faixas: [ {ate: 2428.80, aliq: 0, ded: 0}, {ate: 2826.65, aliq: 7.5, ded: 182.16}, {ate: 3751.05, aliq: 15, ded: 394.16}, {ate: 4664.68, aliq: 22.5, ded: 675.49}, {ate: null, aliq: 27.5, ded: 908.73} ],
    dependente: 189.59, simplificado: 607.20,
    // Lei 15.270/2025: isenção até R$ 5.000 e redução decrescente até R$ 7.350
    reducaoIsentoAte: 5000.00, reducaoMax: 312.89, reducaoAte: 7350.00, reducaoA: 978.62, reducaoB: 0.133145
  }
};

function rrState(){
  if(!state.rr || typeof state.rr !== "object") state.rr = {};
  const r = state.rr;
  ["empresas","funcionarios"].forEach(k=>{ if(!r[k] || typeof r[k]!=="object") r[k] = {}; });
  ["avulsos","rescisoes","recibosFerias","recibosPagamento"].forEach(k=>{ if(!Array.isArray(r[k])) r[k] = []; });
  if(!r.tabelas) r.tabelas = JSON.parse(JSON.stringify(RR_TABELAS_PADRAO));
  return r;
}

// ---------- números e dinheiro ----------
function rrNum(v){
  if(typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v ?? "").trim().replace(/[R$\s]/g,"");
  if(!s) return 0;
  if(s.includes(",")) s = s.replace(/\./g,"").replace(",",".");
  const n = Number(s); return isFinite(n) ? n : 0;
}
function rr2(n){ return Math.round((Number(n)||0)*100)/100; }
function rrBRL(n){ return (Number(n)||0).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2}); }
function rrId(){ return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

// Valor por extenso (reais e centavos)
function rrExtenso(valor){
  const n = rr2(Math.abs(valor||0));
  const reais = Math.floor(n), cent = Math.round((n - reais)*100);
  const u = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const d = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const c = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  const ate999 = x => {
    if(x === 0) return "";
    if(x === 100) return "cem";
    const partes = [];
    if(x >= 100){ partes.push(c[Math.floor(x/100)]); x %= 100; }
    if(x >= 20){ partes.push(d[Math.floor(x/10)]); x %= 10; if(x) partes.push(u[x]); }
    else if(x > 0) partes.push(u[x]);
    return partes.join(" e ");
  };
  const grupos = [];
  let r = reais, i = 0;
  const nomes = [["",""],["mil","mil"],["milhão","milhões"],["bilhão","bilhões"]];
  while(r > 0){ grupos.push({v: r % 1000, i}); r = Math.floor(r/1000); i++; }
  const textoGrupos = grupos.filter(g=>g.v).reverse().map(g=>{
    if(g.i === 1 && g.v === 1) return "mil";
    const t = ate999(g.v);
    return g.i ? t + " " + (g.v === 1 ? nomes[g.i][0] : nomes[g.i][1]) : t;
  });
  let txt = "";
  if(textoGrupos.length){
    const ultimo = grupos.find(g=>g.i===0);
    const juntar = (ultimo && ultimo.v && (ultimo.v < 100 || ultimo.v % 100 === 0) && textoGrupos.length > 1);
    txt = juntar ? textoGrupos.slice(0,-1).join(" ") + " e " + textoGrupos[textoGrupos.length-1] : textoGrupos.join(" ");
    const milhaoRedondo = reais >= 1000000 && reais % 1000000 === 0;
    txt += (milhaoRedondo ? " de" : "") + (reais === 1 ? " real" : " reais");
  }
  if(cent) txt += (txt ? " e " : "") + ate999(cent) + (cent === 1 ? " centavo" : " centavos");
  return txt || "zero real";
}

// ---------- datas (AAAA-MM-DD, sem fuso) ----------
function rrData(iso){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||"")); return m ? new Date(Date.UTC(+m[1], +m[2]-1, +m[3])) : null; }
function rrISO(d){ return d ? d.toISOString().slice(0,10) : ""; }
function rrAddDias(iso, n){ const d = rrData(iso); if(!d) return ""; d.setUTCDate(d.getUTCDate()+n); return rrISO(d); }
function rrAddMeses(iso, n){
  const d = rrData(iso); if(!d) return "";
  const dia = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+n);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo)); return rrISO(d);
}
function rrDiasEntre(a, b){ const x = rrData(a), y = rrData(b); return (x && y) ? Math.round((y - x)/86400000) : 0; } // b - a
function rrAnosCompletos(inicio, fim){
  const a = rrData(inicio), b = rrData(fim); if(!a || !b) return 0;
  let anos = b.getUTCFullYear() - a.getUTCFullYear();
  if(b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) anos--;
  return Math.max(0, anos);
}
function rrDataBR(iso){ const d = rrData(iso); return d ? String(d.getUTCDate()).padStart(2,"0")+"/"+String(d.getUTCMonth()+1).padStart(2,"0")+"/"+d.getUTCFullYear() : ""; }
function rrHoje(){ const h = new Date(); return h.getFullYear()+"-"+String(h.getMonth()+1).padStart(2,"0")+"-"+String(h.getDate()).padStart(2,"0"); }
function rrUltimoDiaDoMes(iso){ const d = rrData(iso); return d ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)).getUTCDate() === d.getUTCDate() : false; }

// ---------- INSS e IRRF ----------
function rrCalcINSS(base){
  const t = rrState().tabelas.inss;
  let resto = Math.max(0, base), anterior = 0, total = 0;
  for(const f of t){
    if(resto <= 0) break;
    const faixa = Math.min(resto, f.ate - anterior);
    if(faixa > 0){ total += faixa * f.aliq/100; resto -= faixa; }
    anterior = f.ate;
  }
  return rr2(total); // acima do teto não incide
}
// IRRF mensal: base = rendimentos tributáveis − (INSS + dependentes) ou − desconto simplificado (o que for melhor)
function rrCalcIRRF(rendimentos, inss, dependentes, semSimplificado){
  const t = rrState().tabelas.irrf;
  if(rendimentos <= 0) return 0;
  const legal = (inss||0) + (dependentes||0) * t.dependente;
  const base = Math.max(0, rendimentos - (semSimplificado ? legal : Math.max(legal, t.simplificado)));
  const faixa = t.faixas.find(f => f.ate === null || base <= f.ate);
  let imposto = Math.max(0, base * faixa.aliq/100 - faixa.ded);
  let reducao = 0;
  if(rendimentos <= t.reducaoIsentoAte) reducao = Math.min(imposto, t.reducaoMax);
  else if(rendimentos <= t.reducaoAte) reducao = Math.max(0, t.reducaoA - t.reducaoB * rendimentos);
  imposto = Math.max(0, imposto - reducao);
  return rr2(imposto);
}

// ---------- empresas e funcionários ----------
function rrEmpresas(){ return (state.empresas||[]).slice().sort((a,b)=>(parseInt(a.codigo)||0)-(parseInt(b.codigo)||0)); }
function rrEmpresa(cod){ return (state.empresas||[]).find(e=>String(e.codigo)===String(cod)) || null; }
function rrComplEmpresa(cod){ const r = rrState(); if(!r.empresas[cod]) r.empresas[cod] = {}; return r.empresas[cod]; }

// Lista funcionários registrados (do fechamento) + avulsos da empresa
function rrFuncionariosDaEmpresa(empCod){
  const emp = rrEmpresa(empCod); if(!emp) return [];
  const reg = (emp.funcionarios||[]).filter(f=>!f.excluidoApartir).map(f=>({
    ref: "reg:" + f.codigo, codigo: f.codigo, nome: f.nome, funcao: f.funcao||"", admissao: f.admissao||"",
    salario: rrNum(typeof salarioNaCompetencia === "function" ? salarioNaCompetencia(f, (typeof comp==="function"?comp():"")) : f.salario),
    avulso: false, inativo: !!f.funcionarioInativo || f.statusDetectado === "Inativo"
  }));
  const av = rrState().avulsos.filter(a=>String(a.empCod)===String(empCod)).map(a=>({
    ref: "av:" + a.id, codigo: "AV", nome: a.nome, funcao: a.funcao||"", admissao: a.admissao||"", salario: rrNum(a.salario), avulso: true, inativo: false
  }));
  return reg.concat(av).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
}
function rrFuncionario(empCod, ref){ return rrFuncionariosDaEmpresa(empCod).find(f=>f.ref===ref) || null; }
// Complemento (CPF, PIS etc.): registrados ficam em funcionarios["emp|cod"]; avulsos guardam no próprio registro
function rrComplFuncionario(empCod, ref){
  const r = rrState();
  if(String(ref).startsWith("av:")) return r.avulsos.find(a=>a.id===ref.slice(3)) || {};
  const k = empCod + "|" + String(ref).slice(4);
  if(!r.funcionarios[k]) r.funcionarios[k] = {};
  return r.funcionarios[k];
}

const RR_CAMPOS_EMPRESA = [["cnpj","CNPJ / CPF","","doc"],["cep","CEP (busca o endereço)","","cep"],["endereco","Endereço (rua, número)"],["bairro","Bairro"],["cidade","Município"],["uf","UF"],["cnae","CNAE"]];
const RR_CAMPOS_FUNC = [["cpf","CPF","","doc"],["pis","PIS/PASEP/NIT","","pis"],["ctps","CTPS (nº)"],["serieCtps","CTPS (série/UF)"],["nascimento","Data de nascimento","date"],["mae","Nome da mãe"],["cep","CEP (busca o endereço)","","cep"],["endereco","Endereço (rua, número)"],["bairro","Bairro"],["cidade","Município"],["uf","UF"]];

// Bloco "Quem": empresa, funcionário (ou avulso) e complemento do cadastro.
// doc: objeto do documento em edição (precisa de empCod e ref); onChange: nome da função que re-renderiza.
function rrHtmlQuem(doc, onChange){
  const emps = rrEmpresas();
  const funcs = doc.empCod ? rrFuncionariosDaEmpresa(doc.empCod) : [];
  const f = doc.ref ? funcs.find(x=>x.ref===doc.ref) : null;
  const ce = doc.empCod ? rrComplEmpresa(doc.empCod) : {};
  const cf = (doc.empCod && doc.ref) ? rrComplFuncionario(doc.empCod, doc.ref) : {};
  const faltaEmp = doc.empCod ? RR_CAMPOS_EMPRESA.filter(([k])=>["cnpj","endereco","cidade","uf"].includes(k) && !ce[k]).length : 0;
  const faltaFun = (doc.empCod && doc.ref) ? RR_CAMPOS_FUNC.filter(([k])=>["cpf","pis"].includes(k) && !cf[k]).length : 0;
  const campos = (lista, obj, alvo) => lista.map(([k,rot,tipo,mask])=>`<div><label>${rot}</label><input ${tipo?`type="${tipo}"`:""} data-k="${alvo}.${k}" data-alvo="${alvo}" ${mask?`data-mask="${mask}" inputmode="numeric"`:""} value="${esc(obj[k]||"")}" ${tipo==="date"?"onblur":"onchange"}="rrSalvarCompl('${alvo}','${k}',this.value)"></div>`).join("");
  return `<div class="rr-bloco">
    <div class="rr-bloco-tit">1. Empresa e funcionário</div>
    <div class="row" style="grid-template-columns:1fr 1fr auto;gap:10px;align-items:end">
      <div><label>Empresa</label><select onchange="rrDoc().empCod=this.value; rrDoc().ref=''; rrAgendar(${onChange})"><option value="">Selecione...</option>${emps.map(e=>`<option value="${esc(e.codigo)}"${String(e.codigo)===String(doc.empCod)?" selected":""}>${esc(e.codigo)} - ${esc(e.nome)}</option>`).join("")}</select></div>
      <div><label>Funcionário</label><select ${doc.empCod?"":"disabled"} onchange="rrEscolherFuncionario(this.value); rrAgendar(${onChange})"><option value="">${doc.empCod?"Selecione...":"Escolha a empresa"}</option>${funcs.map(x=>`<option value="${esc(x.ref)}"${x.ref===doc.ref?" selected":""}>${x.avulso?"[sem registro] ":esc(x.codigo)+" - "}${esc(x.nome)}${x.inativo?" (inativo)":""}</option>`).join("")}</select></div>
      <div><button class="btn out" type="button" ${doc.empCod?"":"disabled"} onclick="rrNovoAvulso('${onChange}')">+ Funcionário sem registro</button></div>
    </div>
    ${doc.empCod ? `<details class="rr-compl"${faltaEmp?" open":""}><summary>Dados da empresa para o documento ${faltaEmp?`<span class="badge red">faltam ${faltaEmp}</span>`:`<span class="badge ok">completo</span>`}</summary><div class="rr-grid">${campos(RR_CAMPOS_EMPRESA, ce, "emp")}</div></details>` : ""}
    ${f ? `<details class="rr-compl"${faltaFun?" open":""}><summary>Dados do funcionário para o documento ${faltaFun?`<span class="badge red">faltam ${faltaFun}</span>`:`<span class="badge ok">completo</span>`}${f.avulso?' <span class="badge pend">sem registro</span>':""}</summary>
        ${f.avulso ? `<div class="rr-grid">${[["nome","Nome"],["funcao","Função"],["salario","Salário (R$)","","moeda"],["admissao","Admissão","date"]].map(([k,rot,tipo,mask])=>`<div><label>${rot}</label><input ${tipo?`type="${tipo}"`:""} data-k="av.${k}" ${mask?`data-mask="${mask}" inputmode="numeric"`:""} value="${esc(cf[k]||"")}" ${tipo==="date"?"onblur":"onchange"}="if(rrSalvarCompl('fun','${k}',this.value)) rrAgendar(${onChange})"></div>`).join("")}</div>` : ""}
        <div class="rr-grid">${campos(RR_CAMPOS_FUNC, cf, "fun")}</div>
        ${f.avulso ? `<button class="btn small red" type="button" style="margin-top:8px" onclick="rrExcluirAvulso('${esc(f.ref)}','${onChange}')">Excluir este funcionário sem registro</button>` : ""}
      </details>` : ""}
  </div>`;
}

function rrSalvarCompl(alvo, campo, valor){
  const d = rrDoc(); if(!d || !d.empCod) return;
  const obj = alvo === "emp" ? rrComplEmpresa(d.empCod) : rrComplFuncionario(d.empCod, d.ref);
  const novo = campo === "salario" ? formatMoneyInput(valor) : String(valor||"").trim();
  if(String(obj[campo]??"") === novo) return false;
  obj[campo] = novo;
  // Funcionário sem registro: salário/admissão/função também valem para o documento aberto
  if(alvo === "fun" && String(d.ref).startsWith("av:") && ["salario","admissao","funcao"].includes(campo)) d[campo] = obj[campo];
  save();
  return true;
}
function rrEscolherFuncionario(ref){
  const d = rrDoc(); d.ref = ref;
  const f = rrFuncionario(d.empCod, ref);
  if(f){ d.salario = rrBRL(f.salario); d.admissao = f.admissao || d.admissao || ""; d.funcao = f.funcao || ""; }
}
async function rrNovoAvulso(onChange){
  const d = rrDoc(); if(!d.empCod) return;
  const nome = await perguntar("Nome do funcionário sem registro:", "");
  if(!nome || !nome.trim()) return;
  const novo = {id: rrId(), empCod: d.empCod, nome: nome.trim(), funcao: "", salario: "", admissao: ""};
  rrState().avulsos.push(novo);
  d.ref = "av:" + novo.id; d.salario = ""; d.admissao = "";
  saved();
  rrAgendar(window[onChange]);
  aviso("Funcionário sem registro criado. Preencha função, salário, admissão e os dados do documento logo abaixo.");
}
async function rrExcluirAvulso(ref, onChange){
  const r = rrState(); const id = String(ref).slice(3);
  const a = r.avulsos.find(x=>x.id===id); if(!a) return;
  if(!await confirmar(`Excluir o funcionário sem registro "${a.nome}"?\n\nDocumentos já salvos dele continuam no histórico.`)) return;
  r.avulsos = r.avulsos.filter(x=>x.id!==id);
  const d = rrDoc(); if(d && d.ref === ref) d.ref = "";
  saved(); rrAgendar(window[onChange]);
}

// ---------- navegação do módulo ----------
let rrAba = "rescisao";
function rrDoc(){ return rrAba === "rescisao" ? rrRescisaoAtual : rrAba === "ferias" ? rrFeriasAtual : rrPagamentoAtual; }
function rrMostrar(aba){
  if(aba) rrAba = aba;
  document.querySelectorAll(".rr-aba").forEach(b=>b.classList.toggle("ativa", b.dataset.aba===rrAba));
  const alvo = document.getElementById("rrConteudo"); if(!alvo) return;
  rrState();
  if(rrAba === "rescisao") rrRenderRescisao();
  else if(rrAba === "ferias") rrRenderFerias();
  else if(rrAba === "pagamento") rrRenderPagamento();
  else rrRenderTabelas();
}
function dpAbrirRescisoes(){
  document.getElementById("dp-home").hidden = true;
  document.body.classList.remove("dp-home-active");
  show("rr");
}

// Aviso no topo quando as tabelas ainda não foram conferidas
function rrHtmlAvisoTabelas(){
  const t = rrState().tabelas;
  return t.conferidas ? "" : `<div class="rr-alerta">⚠️ As tabelas de INSS e IRRF ${t.ano} vieram preenchidas, mas ainda <b>não foram conferidas</b>. Confira na aba <button class="link-btn" onclick="rrMostrar('tabelas')">Tabelas INSS/IRRF</button> antes de entregar documentos.</div>`;
}

// ---------- verbas (proventos/descontos) ----------
// verba: {id, cod, desc, ref, tipo:'P'|'D', valor, incluir, auto, editado, inss, irrf, fgts, grupo}
function rrTotais(verbas){
  const inc = (verbas||[]).filter(v=>v.incluir);
  const prov = rr2(inc.filter(v=>v.tipo==="P").reduce((s,v)=>s+rrNum(v.valor),0));
  const desc = rr2(inc.filter(v=>v.tipo==="D").reduce((s,v)=>s+rrNum(v.valor),0));
  return {prov, desc, liquido: rr2(prov - desc)};
}
// Tabela editável de verbas: incluir/excluir, editar referência e valor, adicionar e remover avulsas
function rrHtmlVerbas(verbas, onChange){
  const linha = (v) => `<tr class="${v.incluir?"":"rr-excluida"}">
      <td style="width:34px;text-align:center"><input type="checkbox" ${v.incluir?"checked":""} title="Incluir no documento" onchange="rrVerbaAlterar('${v.id}','incluir',this.checked,'${onChange}')"></td>
      <td>${v.auto?`<span class="rr-cod">${esc(v.cod||"")}</span> `:""}${v.auto?esc(v.desc):`<input data-k="v.${v.id}.desc" value="${esc(v.desc)}" onchange="rrVerbaAlterar('${v.id}','desc',this.value,'${onChange}')">`}${v.dica?`<div class="muted" style="font-size:11px">${esc(v.dica)}</div>`:""}${(!v.auto && v.tipo==="P") ? `<label class="rr-trib"><input type="checkbox" ${v.inss?"checked":""} onchange="rrVerbaTributavel('${v.id}',this.checked,'${onChange}')"> entra no INSS/IRRF/FGTS</label>` : ""}</td>
      <td style="width:110px"><input data-k="v.${v.id}.ref" value="${esc(v.ref||"")}" onchange="rrVerbaAlterar('${v.id}','ref',this.value,'${onChange}')"></td>
      <td style="width:130px"><input class="rr-valor" data-k="v.${v.id}.valor" data-mask="moeda" inputmode="numeric" value="${rrBRL(rrNum(v.valor))}" onchange="rrVerbaAlterar('${v.id}','valor',this.value,'${onChange}')">${v.editado?'<div class="muted" style="font-size:11px">valor alterado à mão</div>':""}</td>
      <td style="width:40px">${v.auto?"":`<button class="btn small red" type="button" title="Remover" onclick="rrVerbaRemover('${v.id}','${onChange}')">🗑</button>`}</td>
    </tr>`;
  const prov = verbas.filter(v=>v.tipo==="P"), desc = verbas.filter(v=>v.tipo==="D");
  const t = rrTotais(verbas);
  const cab = '<thead><tr><th></th><th>Verba</th><th>Referência</th><th>Valor (R$)</th><th></th></tr></thead>';
  return `<div class="rr-verbas">
    <div class="rr-verbas-col"><div class="rr-verbas-tit rr-prov">Proventos</div><table class="rr-tab">${cab}<tbody>${prov.map(linha).join("")||'<tr><td colspan="5" class="muted">Nenhum provento</td></tr>'}</tbody></table>
      <div class="rr-add">${rrHtmlProntas('P', onChange)}<button class="btn small out" type="button" onclick="rrVerbaAdicionar('P','${onChange}')">+ Outro provento</button></div></div>
    <div class="rr-verbas-col"><div class="rr-verbas-tit rr-desc">Descontos</div><table class="rr-tab">${cab}<tbody>${desc.map(linha).join("")||'<tr><td colspan="5" class="muted">Nenhum desconto</td></tr>'}</tbody></table>
      <div class="rr-add">${rrHtmlProntas('D', onChange)}<button class="btn small out" type="button" onclick="rrVerbaAdicionar('D','${onChange}')">+ Outro desconto</button></div></div>
  </div>
  <div class="rr-totais"><div>Proventos<b>R$ ${rrBRL(t.prov)}</b></div><div>Descontos<b>R$ ${rrBRL(t.desc)}</b></div><div class="rr-liq">Líquido a receber<b>R$ ${rrBRL(t.liquido)}</b></div></div>`;
}
function rrVerbaAlterar(id, campo, valor, onChange){
  const v = (rrDoc().verbas||[]).find(x=>x.id===id); if(!v) return;
  if(campo === "valor"){ const n = rr2(rrNum(valor)); if(n === rr2(rrNum(v.valor))) return; v.valor = n; if(v.auto) v.editado = true; }
  else { if(v[campo] === valor) return; v[campo] = valor; }
  rrAgendar(window[onChange]);
}
async function rrVerbaAdicionar(tipo, onChange){
  const desc = await perguntar(tipo==="P" ? "Descrição do provento (ex.: Horas extras 50%, Comissões):" : "Descrição do desconto (ex.: Vale, Adiantamento, Faltas):", "");
  if(!desc || !desc.trim()) return;
  const val = await perguntar("Valor (R$):", "");
  if(val === null) return;
  const d = rrDoc(); if(!Array.isArray(d.verbas)) d.verbas = [];
  const trib = tipo === "P"; // provento lançado à mão: por padrão entra no INSS/IRRF/FGTS (dá para desmarcar)
  d.verbas.push({id: rrId(), cod: "", desc: desc.trim(), ref: "", tipo, valor: rr2(rrNum(val)), incluir: true, auto: false, inss: trib, irrf: trib, fgts: trib});
  rrAgendar(window[onChange]);
}
function rrVerbaTributavel(id, marcado, onChange){
  const v = (rrDoc().verbas||[]).find(x=>x.id===id); if(!v) return;
  v.inss = v.irrf = v.fgts = !!marcado; rrAgendar(window[onChange]);
}
function rrVerbaRemover(id, onChange){ const d = rrDoc(); d.verbas = (d.verbas||[]).filter(v=>v.id!==id); rrAgendar(window[onChange]); }

// ---------- impressão ----------
function rrAbrirImpressao(titulo, corpo, estiloExtra){
  const w = window.open("", "_blank");
  if(!w){ aviso("O navegador bloqueou a janela de impressão. Libere pop-ups para este site e tente de novo."); return; }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
    @page{size:A4;margin:10mm}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11px}
    .barra{position:sticky;top:0;background:#1B3A6B;color:#fff;padding:8px 12px;display:flex;gap:10px;align-items:center;justify-content:space-between}
    .barra button{background:#fff;color:#1B3A6B;border:0;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer}
    @media print{.barra{display:none}}
    ${estiloExtra||""}
  </style></head><body><div class="barra"><span>${esc(titulo)}</span><button onclick="window.print()">Imprimir / salvar PDF</button></div>${corpo}</body></html>`);
  w.document.close();
}
function rrDadosDocumento(d){
  const emp = rrEmpresa(d.empCod) || {};
  const ce = rrComplEmpresa(d.empCod);
  const f = rrFuncionario(d.empCod, d.ref) || {};
  const cf = d.ref ? rrComplFuncionario(d.empCod, d.ref) : {};
  return {emp, ce, f, cf};
}


// ---------- digitação sem atrapalhar ----------
// Recalcular redesenha a tela. Para não tirar o cursor do lugar nem "engolir" cliques:
//  - o redesenho acontece depois do clique terminar (se o mouse estiver pressionado);
//  - o campo que estava com o cursor volta a ficar com o cursor (pelo data-k);
//  - campos de data só gravam quando você sai deles (onblur), então dá para digitar a data inteira.
let rrPonteiroPressionado = false;
document.addEventListener("pointerdown", ()=>{ rrPonteiroPressionado = true; }, true);
document.addEventListener("pointerup", ()=>{ setTimeout(()=>{ rrPonteiroPressionado = false; }, 0); }, true);
function rrAgendar(render){
  if(typeof render !== "function") return;
  const rodar = () => { const foco = rrCapturarFoco(); render(); rrRestaurarFoco(foco); };
  if(rrPonteiroPressionado) document.addEventListener("pointerup", ()=>setTimeout(rodar, 0), {once: true, capture: true});
  else setTimeout(rodar, 0);
}
function rrCapturarFoco(){
  const a = document.activeElement;
  if(!a || !a.dataset || !a.dataset.k || !a.closest("#rrConteudo")) return null;
  let sel = null; try{ sel = [a.selectionStart, a.selectionEnd]; }catch(e){}
  return {k: a.dataset.k, sel};
}
function rrRestaurarFoco(f){
  if(!f) return;
  const el = document.querySelector(`#rrConteudo [data-k="${CSS.escape(f.k)}"]`);
  if(!el) return;
  el.focus({preventScroll: true});
  try{ if(f.sel && f.sel[0] != null) el.setSelectionRange(f.sel[0], f.sel[1]); }catch(e){}
}
function rrCommit(obj, campo, valor, render){
  if(String(obj[campo] ?? "") === String(valor)) return;
  obj[campo] = valor;
  rrAgendar(render);
}
// Campo padrão das telas do módulo. mascara: "moeda" | "doc" | "pis" | "cep"
function rrInput(nomeObj, obj, k, tipo, mascara, extra, nomeRender){
  const ev = tipo === "date" ? "onblur" : "onchange";
  return `<input ${tipo?`type="${tipo}"`:""} data-k="${k}" ${mascara?`data-mask="${mascara}" inputmode="numeric"`:""} value="${esc(obj[k]??"")}" ${ev}="rrCommit(${nomeObj},'${k}',this.value,${nomeRender})" ${extra||""}>`;
}

// ---------- máscaras (CPF/CNPJ, PIS, CEP, valores) ----------
function rrMascarar(tipo, valor){
  const dig = String(valor||"").replace(/\D/g, "");
  if(tipo === "moeda"){
    if(!dig) return "";
    return (parseInt(dig.slice(0, 13), 10) / 100).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  const aplicar = (d, padrao) => { let i = 0, out = ""; for(const ch of padrao){ if(i >= d.length) break; out += ch === "#" ? d[i++] : ch; } return out; };
  if(tipo === "doc") return dig.length <= 11 ? aplicar(dig, "###.###.###-##") : aplicar(dig.slice(0,14), "##.###.###/####-##");
  if(tipo === "pis") return aplicar(dig.slice(0,11), "###.#####.##-#");
  if(tipo === "cep") return aplicar(dig.slice(0,8), "#####-###");
  return valor;
}
document.addEventListener("input", (ev)=>{
  const el = ev.target;
  if(!el || !el.dataset || !el.dataset.mask) return;
  const novo = rrMascarar(el.dataset.mask, el.value);
  if(novo !== el.value){ el.value = novo; try{ el.setSelectionRange(novo.length, novo.length); }catch(e){} }
  if(el.dataset.mask === "cep" && novo.replace(/\D/g,"").length === 8) rrBuscarCep(el, novo);
}, true);
// Valor colado como "3.000,00" ou "3000" vira o valor certo (e não centavos)
document.addEventListener("paste", (ev)=>{
  const el = ev.target;
  if(!el || !el.dataset || el.dataset.mask !== "moeda") return;
  const txt = (ev.clipboardData || window.clipboardData)?.getData("text") || "";
  ev.preventDefault();
  el.value = rrBRL(rrNum(txt));
  el.dispatchEvent(new Event("change", {bubbles: true}));
}, true);

// ---------- CEP → endereço (ViaCEP) ----------
let rrUltimoCep = "";
async function rrBuscarCep(el, cep){
  const dig = cep.replace(/\D/g, "");
  if(dig === rrUltimoCep) return;
  rrUltimoCep = dig;
  const alvo = el.dataset.alvo; // "emp" ou "fun"
  try{
    const r = await fetch(`https://viacep.com.br/ws/${dig}/json/`);
    const j = await r.json();
    if(!r.ok || j.erro){ aviso("CEP não encontrado. Confira o número ou preencha o endereço à mão."); return; }
    const d = rrDoc(); if(!d || !d.empCod) return;
    const obj = alvo === "emp" ? rrComplEmpresa(d.empCod) : rrComplFuncionario(d.empCod, d.ref);
    obj.cep = cep;
    if(j.logradouro) obj.endereco = j.logradouro + ", ";
    if(j.bairro) obj.bairro = j.bairro;
    if(j.localidade) obj.cidade = j.localidade;
    if(j.uf) obj.uf = j.uf;
    save();
    const render = rrAba === "rescisao" ? rrRenderRescisao : rrAba === "ferias" ? rrRenderFerias : rrRenderPagamento;
    render();
    const campoEnd = document.querySelector(`#rrConteudo [data-k="${alvo}.endereco"]`);
    if(campoEnd){ campoEnd.focus(); const n = campoEnd.value.length; try{ campoEnd.setSelectionRange(n, n); }catch(e){} }
  }catch(e){
    aviso("Não consegui buscar o CEP agora (sem internet?). Preencha o endereço à mão.");
  }
}


// ---------- tempo de serviço (anos, meses e dias) ----------
function rrTempoServico(inicio, fim){
  if(!rrData(inicio) || !rrData(fim) || fim < inicio) return null;
  const ate = rrAddDias(fim, 1); // conta o último dia
  let anos = 0, meses = 0, p = inicio;
  while(rrAddMeses(p, 12) <= ate){ p = rrAddMeses(p, 12); anos++; }
  while(rrAddMeses(p, 1) <= ate){ p = rrAddMeses(p, 1); meses++; }
  const dias = rrDiasEntre(p, ate);
  return {anos, meses, dias};
}
function rrTempoServicoTexto(inicio, fim){
  const t = rrTempoServico(inicio, fim); if(!t) return "—";
  const partes = [];
  if(t.anos) partes.push(t.anos + (t.anos===1 ? " ano" : " anos"));
  if(t.meses) partes.push(t.meses + (t.meses===1 ? " mês" : " meses"));
  if(t.dias || !partes.length) partes.push(t.dias + (t.dias===1 ? " dia" : " dias"));
  return partes.length > 1 ? partes.slice(0,-1).join(", ") + " e " + partes[partes.length-1] : partes[0];
}

// ---------- dias úteis (sábado, domingo e feriados) ----------
function rrPascoa(ano){
  const a = ano % 19, b = Math.floor(ano/100), c = ano % 100, d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25), g = Math.floor((b-f+1)/3);
  const h = (19*a + b - d - g + 15) % 30, i = Math.floor(c/4), k = c % 4, l = (32 + 2*e + 2*i - h - k) % 7, m = Math.floor((a + 11*h + 22*l)/451);
  const mes = Math.floor((h + l - 7*m + 114)/31), dia = ((h + l - 7*m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
}
function rrEhFeriado(iso){
  const d = rrData(iso); if(!d) return false;
  const mmdd = iso.slice(5);
  if(typeof FERIADOS_NACIONAIS === "object" && FERIADOS_NACIONAIS[mmdd]) return true;
  if(iso === rrAddDias(rrPascoa(d.getUTCFullYear()), -2)) return true; // Sexta-feira Santa
  const ddmm = iso.slice(8,10) + "/" + iso.slice(5,7);
  if((state.feriadosFixos||[]).some(f=>String(f.data||"").padStart(5,"0") === ddmm)) return true; // feriados cadastrados (municipais etc.)
  const fech = (state.fechamentos||{})[iso.slice(0,7)];
  if(fech && Array.isArray(fech.feriadosExtras) && fech.feriadosExtras.some(f=>f.data===iso)) return true;
  return false;
}
function rrEhDiaUtil(iso){ const d = rrData(iso); if(!d) return false; const dia = d.getUTCDay(); return dia !== 0 && dia !== 6 && !rrEhFeriado(iso); }
function rrDiaUtilAnterior(iso){ let x = iso; for(let i=0; i<15 && x && !rrEhDiaUtil(x); i++) x = rrAddDias(x, -1); return x; }
function rrDiaSemana(iso){ const d = rrData(iso); return d ? ["domingo","segunda","terça","quarta","quinta","sexta","sábado"][d.getUTCDay()] : ""; }

// ---------- verbas prontas (proventos e descontos mais usados) ----------
// tipo: "horas" (qtd de horas × valor-hora × fator), "dias" (salário/30 × dias), "pct" (% do salário), "valor" (valor digitado), "dsr" (DSR sobre horas extras)
// trib: entra no INSS/IRRF/FGTS (proventos) · reduz: desconto que diminui a base do INSS/IRRF (faltas, atrasos, DSR)
const RR_VERBAS_PRONTAS = {
  P: [
    {nome: "Horas extras 50%", tipo: "horas", fator: 1.5, trib: true},
    {nome: "Horas extras 100%", tipo: "horas", fator: 2, trib: true},
    {nome: "Adicional noturno 20%", tipo: "horas", fator: 0.2, trib: true},
    {nome: "DSR sobre horas extras", tipo: "dsr", trib: true},
    {nome: "Comissões", tipo: "valor", trib: true},
    {nome: "Gratificação", tipo: "valor", trib: true},
    {nome: "Adicional de insalubridade", tipo: "valor", trib: true},
    {nome: "Prêmio", tipo: "valor", trib: false},
    {nome: "Ajuda de custo", tipo: "valor", trib: false}
  ],
  D: [
    {nome: "Faltas", tipo: "dias", reduz: true},
    {nome: "Atrasos", tipo: "horas", fator: 1, reduz: true},
    {nome: "DSR (faltas)", tipo: "dias", reduz: true},
    {nome: "Vale-transporte (6%)", tipo: "pct", pct: 6},
    {nome: "Adiantamento salarial", tipo: "valor"},
    {nome: "Vale / empréstimo", tipo: "valor"},
    {nome: "Pensão alimentícia", tipo: "valor"}
  ]
};
function rrHtmlProntas(tipo, onChange){
  return `<select onchange="if(this.value!==''){rrVerbaPronta('${tipo}',Number(this.value),'${onChange}')}; this.value=''"><option value="">${tipo==="P"?"+ Provento pronto...":"+ Desconto pronto..."}</option>${RR_VERBAS_PRONTAS[tipo].map((v,i)=>`<option value="${i}">${esc(v.nome)}</option>`).join("")}</select>`;
}
// "7:30" ou "7,5" → 7.5 horas
function rrHoras(txt){
  const t = String(txt||"").trim();
  const m = /^(\d+):(\d{1,2})$/.exec(t);
  return m ? Number(m[1]) + Number(m[2])/60 : rrNum(t);
}
async function rrVerbaPronta(tipo, i, onChange){
  const def = RR_VERBAS_PRONTAS[tipo][i]; if(!def) return;
  const d = rrDoc(); if(!Array.isArray(d.verbas)) d.verbas = [];
  const sal = rrNum(d.salario);
  const divisor = rrNum(d.divisor) || 220;
  const precisaSalario = ["horas","dias","pct","dsr"].includes(def.tipo);
  if(precisaSalario && !sal && def.tipo !== "dsr") return aviso("Informe o salário antes, para o sistema calcular " + def.nome + ".");
  let valor = 0, ref = "";
  if(def.tipo === "horas"){
    const r = await perguntar(`${def.nome}: quantas horas? (ex.: 10 ou 7:30)`, ""); if(r === null || !String(r).trim()) return;
    const h = rrHoras(r); const hora = sal / divisor;
    valor = hora * def.fator * h; ref = rrBRL(h).replace(",00","") + " h";
  } else if(def.tipo === "dias"){
    const r = await perguntar(`${def.nome}: quantos dias?`, ""); if(r === null || !String(r).trim()) return;
    const n = rrNum(r); valor = sal/30 * n; ref = rrBRL(n).replace(",00","") + (n===1 ? " dia" : " dias");
  } else if(def.tipo === "pct"){
    const r = await perguntar(`${def.nome}: percentual sobre o salário`, String(def.pct)); if(r === null) return;
    const pc = rrNum(r); valor = sal * pc/100; ref = rrBRL(pc).replace(",00","") + "%";
  } else if(def.tipo === "dsr"){
    const he = (d.verbas||[]).filter(v=>v.incluir && v.tipo==="P" && /horas extras|adicional noturno/i.test(v.desc)).reduce((s,v)=>s+rrNum(v.valor),0);
    if(!he) return aviso("Lance primeiro as horas extras (ou adicional noturno); o DSR é calculado sobre elas.");
    const cal = typeof calcCalendarioMes === "function" ? calcCalendarioMes(typeof comp === "function" ? comp() : "") : {};
    const uteis = await perguntar("DSR: quantos dias úteis no mês (segunda a sábado, sem feriados)?", String((cal.uteis||0) + (cal.sabados||0) || 26)); if(uteis === null) return;
    const desc = await perguntar("DSR: quantos domingos e feriados no mês?", String(cal.domingos || 4)); if(desc === null) return;
    const u = rrNum(uteis), df = rrNum(desc);
    if(!u) return aviso("Informe os dias úteis.");
    valor = he / u * df; ref = `${df}/${u}`;
  } else {
    const r = await perguntar(`${def.nome}: valor (R$)`, ""); if(r === null || !String(r).trim()) return;
    valor = rrNum(r);
  }
  d.verbas.push({id: rrId(), cod: "", desc: def.nome, ref, tipo, valor: rr2(valor), incluir: true, auto: false,
    inss: !!def.trib, irrf: !!def.trib, fgts: !!def.trib, reduzBase: !!def.reduz});
  rrAgendar(window[onChange]);
}
// Soma dos descontos que diminuem a base do INSS/IRRF (faltas, atrasos, DSR)
function rrReducaoBase(verbas){
  return (verbas||[]).filter(v=>v.incluir && v.tipo==="D" && v.reduzBase).reduce((s,v)=>s+rrNum(v.valor),0);
}
