// ========== HISTÓRICO DE SALÁRIOS DO FUNCIONÁRIO ==========
// Cada funcionário tem f.salarios = [{valor, data, motivo, registradoEm}],
// em ordem de data. "data" é o dia em que o salário passa a valer (AAAA-MM-DD);
// vale da competência (mês) dessa data em diante. Data vazia = desde sempre
// (salário que já existia antes do histórico).
// f.salario continua guardando o salário ATUAL (o último), para compatibilidade.

function normalizarSalariosFuncionario(f){
  if(!f) return [];
  if(!Array.isArray(f.salarios)){
    f.salarios = String(f.salario||"").trim()
      ? [{valor: f.salario, data: "", motivo: "Salário já cadastrado antes do histórico", registradoEm: ""}]
      : [];
  }
  f.salarios = f.salarios
    .filter(s => s && String(s.valor||"").trim())
    .sort((a,b) => String(a.data||"").localeCompare(String(b.data||"")));
  if(f.salarios.length) f.salario = f.salarios[f.salarios.length-1].valor;
  return f.salarios;
}

// Salário que vale na competência "AAAA-MM".
function salarioNaCompetencia(f, competencia){
  const lista = normalizarSalariosFuncionario(f);
  if(!lista.length) return f?.salario || "";
  const c = String(competencia||"").slice(0,7);
  let atual = null;
  for(const s of lista){
    if(!s.data || !c || s.data.slice(0,7) <= c) atual = s;
  }
  // Competência anterior ao primeiro registro: mostra o primeiro salário conhecido.
  return (atual || lista[0]).valor;
}

// Registro que começou exatamente nesta competência (para destacar "reajuste").
function salarioMudouNaCompetencia(f, competencia){
  const c = String(competencia||"").slice(0,7);
  return normalizarSalariosFuncionario(f).find(s => s.data && s.data.slice(0,7) === c) || null;
}

// Chamado ao salvar o cadastro: funcionário novo começa o histórico com o
// salário digitado; funcionário com histórico mantém o salário do histórico.
function ajustarSalarioAoSalvarCadastro(f, valorDigitado){
  const lista = normalizarSalariosFuncionario(f);
  if(lista.length){ f.salario = lista[lista.length-1].valor; return; }
  const v = formatMoneyInput(valorDigitado);
  f.salario = v;
  if(v) f.salarios = [{valor: v, data: f.admissao || "", motivo: "Salário inicial", registradoEm: new Date().toISOString()}];
}

function _acharFuncionario(empCod, funCod){
  const emp = (state.empresas||[]).find(e => String(e.codigo) === String(empCod));
  const f = emp?.funcionarios?.find(x => String(x.codigo) === String(funCod));
  return {emp, f};
}

// Campo de salário do cadastro: com histórico, fica só leitura e o botão 📈 abre o histórico.
function atualizarCampoSalario(idCampo, f){
  const campo = document.getElementById(idCampo);
  if(!campo) return;
  const temHistorico = !!(f && normalizarSalariosFuncionario(f).length);
  campo.readOnly = temHistorico;
  campo.title = temHistorico ? "Para mudar o salário, use o botão 📈 (guarda o histórico)" : "";
  campo.classList.toggle("campo-travado", temHistorico);
  if(temHistorico) campo.value = f.salario || "";
}

function abrirHistoricoSalarioCadastro(){
  if(!funcionarioEditando) return aviso("Salve o funcionário primeiro. O salário digitado no cadastro vira o primeiro salário do histórico.");
  abrirHistoricoSalario(funcionarioEditando.empCod, funcionarioEditando.funCod);
}

let _salarioAberto = null; // {empCod, funCod}
function abrirHistoricoSalario(empCod, funCod){
  const {f} = _acharFuncionario(empCod, funCod);
  if(!f) return aviso("Funcionário não localizado. Salve o cadastro primeiro.");
  _salarioAberto = {empCod: String(empCod), funCod: String(funCod)};
  let fundo = document.getElementById("modalSalario");
  if(!fundo){
    fundo = document.createElement("div");
    fundo.id = "modalSalario";
    fundo.className = "aviso-fundo";
    fundo.style.zIndex = "150000";
    fundo.innerHTML = `<div class="aviso-caixa salario-caixa" role="dialog" aria-modal="true">
      <h3 style="margin:0 0 4px;color:var(--pri)">📈 Histórico de salários</h3>
      <div id="salarioQuem" class="muted" style="margin-bottom:10px"></div>
      <div class="table-wrap"><table id="tabSalarios"></table></div>
      <div class="salario-novo">
        <b style="color:var(--pri)">Novo salário</b>
        <div class="row" style="grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
          <div><label>Salário</label><input id="salNovoValor" placeholder="2.500,00" onblur="this.value=formatMoneyInput(this.value)"></div>
          <div><label>Vale a partir de</label><input id="salNovoData" type="date"></div>
        </div>
        <div style="margin-top:6px"><label>Motivo (opcional)</label><input id="salNovoMotivo" placeholder="Ex.: dissídio 2026, promoção, acordo"></div>
      </div>
      <div class="aviso-botoes">
        <button type="button" class="btn out" onclick="fecharHistoricoSalario()">Fechar</button>
        <button type="button" class="btn pri" onclick="adicionarSalarioHistorico()">Adicionar salário</button>
      </div>
    </div>`;
    document.body.append(fundo);
  }
  document.getElementById("salNovoValor").value = "";
  const hoje = new Date(); // data local (toISOString usaria o fuso UTC)
  document.getElementById("salNovoData").value = hoje.getFullYear() + "-" + String(hoje.getMonth()+1).padStart(2,"0") + "-" + String(hoje.getDate()).padStart(2,"0");
  document.getElementById("salNovoMotivo").value = "";
  renderHistoricoSalario();
  fundo.style.display = "flex";
  document.getElementById("salNovoValor").focus();
}

function fecharHistoricoSalario(){
  const fundo = document.getElementById("modalSalario");
  if(fundo) fundo.style.display = "none";
  _salarioAberto = null;
}

function renderHistoricoSalario(){
  if(!_salarioAberto) return;
  const {emp, f} = _acharFuncionario(_salarioAberto.empCod, _salarioAberto.funCod);
  if(!f) return;
  const lista = normalizarSalariosFuncionario(f);
  document.getElementById("salarioQuem").textContent = `${f.codigo} - ${f.nome} · ${emp?.nome||""}`;
  const ultimo = lista.length - 1;
  document.getElementById("tabSalarios").innerHTML = lista.length
    ? "<thead><tr><th>Vale a partir de</th><th>Salário</th><th>Motivo</th><th></th></tr></thead><tbody>"
      + lista.map((s,i)=>`<tr${i===ultimo?' class="salario-atual"':''}><td>${s.data?esc(fmtDataBR(s.data)):"Desde o início"}</td><td><b>R$ ${money(s.valor)}</b>${i===ultimo?' <span class="badge ok">atual</span>':''}</td><td>${esc(s.motivo||"")}</td><td><button type="button" class="btn small red" title="Remover este registro" onclick="removerSalarioHistorico(${i})">🗑</button></td></tr>`).reverse().join("")
      + "</tbody>"
    : "<tbody><tr><td>Nenhum salário registrado ainda.</td></tr></tbody>";
}

async function adicionarSalarioHistorico(){
  if(!_salarioAberto) return;
  const {f} = _acharFuncionario(_salarioAberto.empCod, _salarioAberto.funCod);
  if(!f) return;
  const valor = formatMoneyInput(document.getElementById("salNovoValor").value);
  const data = document.getElementById("salNovoData").value;
  const motivo = document.getElementById("salNovoMotivo").value.trim();
  if(!valor) return aviso("Informe o novo salário.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)) return aviso("Informe a data a partir da qual o novo salário vale.");
  const lista = normalizarSalariosFuncionario(f);
  const mesmoDia = lista.findIndex(s => s.data === data);
  if(mesmoDia >= 0){
    if(!await confirmar(`Já existe um salário a partir de ${fmtDataBR(data)} (R$ ${money(lista[mesmoDia].valor)}).\n\nSubstituir por R$ ${money(valor)}?`)) return;
    lista.splice(mesmoDia, 1);
  } else if(!await confirmar(`Registrar salário de R$ ${money(valor)} a partir de ${fmtDataBR(data)}?\n\nOs meses anteriores continuam com o salário antigo.`)) return;
  lista.push({valor, data, motivo, registradoEm: new Date().toISOString()});
  normalizarSalariosFuncionario(f);
  document.getElementById("salNovoValor").value = "";
  document.getElementById("salNovoMotivo").value = "";
  _atualizarTelasSalario(f);
  saved();
  renderHistoricoSalario();
}

async function removerSalarioHistorico(i){
  if(!_salarioAberto) return;
  const {f} = _acharFuncionario(_salarioAberto.empCod, _salarioAberto.funCod);
  const lista = normalizarSalariosFuncionario(f);
  const s = lista[i]; if(!s) return;
  if(!await confirmar(`Remover o salário de R$ ${money(s.valor)} ${s.data?"a partir de "+fmtDataBR(s.data):"(desde o início)"}?\n\nEsta ação não pode ser desfeita (a não ser pelas versões salvas em Backup).`)) return;
  lista.splice(i, 1);
  if(!lista.length) f.salario = "";
  normalizarSalariosFuncionario(f);
  _atualizarTelasSalario(f);
  saved();
  renderHistoricoSalario();
}

// Atualiza os campos de salário abertos no cadastro/modal deste funcionário.
function _atualizarTelasSalario(f){
  if(funcionarioEditando && _salarioAberto && funcionarioEditando.empCod === _salarioAberto.empCod && funcionarioEditando.funCod === _salarioAberto.funCod){
    atualizarCampoSalario("funSalCad", f);
  }
  if(document.getElementById("mfSal") && document.getElementById("mfSal").dataset.funcionario === _salarioAberto.empCod + "|" + _salarioAberto.funCod){
    atualizarCampoSalario("mfSal", f);
  }
}

// Botão 📈 do modal "Editar funcionário" (o campo guarda "empresa|funcionário").
function abrirHistoricoSalarioModal(){
  const [empCod, funCod] = String(document.getElementById("mfSal")?.dataset.funcionario || "|").split("|");
  abrirHistoricoSalario(empCod, funCod);
}
