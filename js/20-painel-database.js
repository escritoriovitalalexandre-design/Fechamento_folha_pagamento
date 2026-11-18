// ========== PAINEL DE DATA-BASE AGRUPADO POR SINDICATO ==========
// Uma linha por sindicato (não por empresa): é para quem liga no sindicato.
// As regras de status continuam as mesmas (statusDB, statusDBSindicatoAdicional,
// statusDataBasePainel); aqui só muda a forma de mostrar e agrupar.
// Registro de contatos: state.contatosSindicato[nomeDoSindicato] = [{data, quem, nota}].

let _gruposDB = [];          // grupos da última renderização (os botões usam o índice)
let _filtroMesDB = null;     // mês (1-12) escolhido na linha do ano, ou null
const _MESES_CURTOS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const _ORDEM_STATUS = {"Vencida": 0, "Aguardando": 1, "Em dia": 2};

function _montarGruposDataBase(){
  const grupos = new Map();
  const semSindicato = [];
  const mesAtual = Number((comp()||"").split("-")[1]||0);
  empSelecionadas().forEach(e=>{
    if(!String(e.sindicato||"").trim()) semSindicato.push(e);
    const adicionais = sindicatoAdicionalDetalhesNormalizados(e);
    const itens = [{principal:true, nome:e.sindicato||"", dataBase:dataBaseReferencia(e), status:statusDB(e), dissidio:e.dissidio||"", idx:-1, cadastro:e}]
      .concat(adicionais.map((x,idx)=>({principal:false, nome:x.nome, dataBase:x.dataBase, status:statusDBSindicatoAdicional(x), dissidio:x.dissidio||"", idx, cadastro:x})));
    itens.forEach(it=>{
      const nome = String(it.nome||"").trim();
      if(!nome) return;
      const st = statusDataBasePainel(it.status, it.dataBase, it.cadastro?.dataBaseEmDiaAno);
      if(!grupos.has(nome)) grupos.set(nome, {nome, itens:[]});
      grupos.get(nome).itens.push({empCod:e.codigo, empNome:e.nome, status:st, principal:it.principal, idx:it.idx, dataBase:it.dataBase, dissidio:it.dissidio});
    });
  });
  const lista = [...grupos.values()].map(g=>{
    const s = (state.sindicatos||[]).find(x=>String(x.nome||"").trim()===g.nome) || null;
    const dataBase = (s && s.dataBase) || (g.itens.find(i=>i.dataBase)||{}).dataBase || "";
    const mes = mesDataBaseNumeroValor(dataBase);
    const status = g.itens.reduce((pior,i)=>_ORDEM_STATUS[i.status] < _ORDEM_STATUS[pior] ? i.status : pior, "Em dia");
    const atraso = (status==="Vencida" && mes && mes < mesAtual) ? mesAtual - mes : 0;
    const contatos = (state.contatosSindicato||{})[g.nome] || [];
    return {...g, s, dataBase, mes, status, atraso, doMes: !!mes && mes===mesAtual, contatos};
  });
  lista.sort((a,b)=> (_ORDEM_STATUS[a.status]-_ORDEM_STATUS[b.status]) || (b.atraso-a.atraso) || (Number(b.doMes)-Number(a.doMes)) || a.nome.localeCompare(b.nome));
  return {lista, semSindicato, mesAtual};
}

function _contarEmpresas(grupos){
  const s = new Set(); grupos.forEach(g=>g.itens.forEach(i=>s.add(String(i.empCod)))); return s.size;
}

function _rotuloStatusGrupo(g){
  if(g.status==="Vencida") return {cls:"red", txt: g.atraso ? `Vencida há ${g.atraso} ${g.atraso===1?"mês":"meses"}` : "Vencida"};
  if(g.status==="Aguardando") return {cls:"pend", txt: g.doMes ? "Data-base neste mês" : "Aguardando"};
  return {cls:"ok", txt:"Em dia"};
}

function _telefoneLink(t){
  const digitos = String(t||"").replace(/\D/g,"");
  return digitos ? `<a href="tel:${esc(digitos)}">${esc(t)}</a>` : esc(t);
}

function _fmtDataHora(iso){
  const d = new Date(iso); if(isNaN(d)) return "";
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}

function _htmlGrupo(g, i){
  const r = _rotuloStatusGrupo(g);
  const s = g.s || {};
  const contato = [
    s.contato ? `📞 ${_telefoneLink(s.contato)}` : "",
    s.contatoNome ? esc(s.contatoNome) : "",
    s.email ? `✉️ <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ""
  ].filter(Boolean).join(" · ");
  const semContato = !s.contato && !s.email;
  const empresas = g.itens.map(x=>`<span class="db-emp db-emp-${x.status==="Vencida"?"venc":x.status==="Aguardando"?"agu":"ok"}" title="${esc(x.status)}${x.principal?"":" · sindicato adicional"}${x.dissidio?" · "+esc(x.dissidio):""}">${esc(x.empCod)} - ${esc(x.empNome)}${x.principal?"":" ⁺"}</span>`).join("");
  const ultimo = g.contatos.length ? g.contatos[g.contatos.length-1] : null;
  const botaoStatus = g.status==="Em dia"
    ? `<button class="btn small out" onclick="marcarStatusGrupoDB(${i},'Aguardando')">↩ Marcar aguardando</button>`
    : `<button class="btn small green" onclick="marcarStatusGrupoDB(${i},'Em dia')">✔ Marcar em dia</button>`;
  return `<div class="db-grupo db-grupo-${r.cls}">
    <div class="db-grupo-topo">
      <div>
        <span class="badge ${r.cls}">${esc(r.txt)}</span>
        <span class="badge" style="background:#f1f5f9;color:#475569">data-base ${esc(g.dataBase||"não informada")}</span>
        <div class="db-grupo-nome">${esc(g.nome)}</div>
      </div>
      <div class="db-grupo-acoes">
        <button class="btn small out" onclick="registrarContatoSindicato(${i})">📞 Registrar contato</button>
        ${botaoStatus}
        <button class="btn small out" onclick="abrirSindicatoPainel(_gruposDB[${i}].nome)">Ver sindicato →</button>
      </div>
    </div>
    <div class="db-grupo-contato">${contato || ""}${semContato ? `<span class="db-sem-contato">⚠️ Sem telefone/e-mail cadastrado${g.s?"":" (sindicato não cadastrado na aba Sindicatos)"}</span>` : ""}</div>
    <div class="db-grupo-empresas"><span class="muted">${g.itens.length} ${g.itens.length===1?"empresa":"empresas"}:</span> ${empresas}</div>
    <div class="db-grupo-ultimo">${ultimo
      ? `💬 Último contato ${esc(_fmtDataHora(ultimo.data))}${ultimo.quem?" ("+esc(ultimo.quem)+")":""}: “${esc(ultimo.nota)}” ${g.contatos.length>1?`<button class="link-btn" onclick="verContatosSindicato(${i})">ver os ${g.contatos.length}</button>`:""}`
      : `<span class="muted">Nenhum contato registrado ainda</span>`}</div>
  </div>`;
}

function renderAlertas(){
  const box = document.getElementById("alertas");
  if(!box) return;
  const {lista, semSindicato, mesAtual} = _montarGruposDataBase();
  _gruposDB = lista;

  const venc = lista.filter(g=>g.status==="Vencida");
  const agu = lista.filter(g=>g.status==="Aguardando");
  const ok = lista.filter(g=>g.status==="Em dia");
  const cartao = (cls, titulo, grupos, filtro) => `<button type="button" class="db-resumo-item db-resumo-${cls}" onclick="setFiltroAlerta('${filtro}')"><span>${titulo}</span><b>${grupos.length} ${grupos.length===1?"sindicato":"sindicatos"}</b><small>${_contarEmpresas(grupos)} empresas</small></button>`;
  const resumo = `<div class="db-resumo">
    ${cartao("red","Vencidas",venc,"vencido")}
    ${cartao("pend",`Aguardando / neste mês (${_MESES_CURTOS[mesAtual-1]||"-"})`,agu,"aguardando")}
    ${cartao("ok","Em dia",ok,"emdia")}
    <details class="db-resumo-item db-resumo-gray"><summary><span>Sem sindicato</span><b>${semSindicato.length}</b><small>empresas</small></summary>
      <div class="db-sem-sind">${semSindicato.length ? semSindicato.map(e=>`<span class="db-emp">${esc(e.codigo)} - ${esc(e.nome)}</span>`).join("") : "Todas têm sindicato."}</div></details>
  </div>`;

  const meses = _MESES_CURTOS.map((m,k)=>{
    const n = k+1;
    const doMes = lista.filter(g=>g.mes===n);
    const cls = !doMes.length ? "vazio" : doMes.some(g=>g.status==="Vencida") ? "red" : doMes.some(g=>g.status==="Aguardando") ? "pend" : "ok";
    return `<button type="button" class="db-mes db-mes-${cls}${n===mesAtual?" db-mes-atual":""}${_filtroMesDB===n?" db-mes-sel":""}" title="${doMes.map(g=>esc(g.nome)).join("\n")||"Nenhum sindicato"}" onclick="filtrarMesDataBase(${n})">${m}<br><b>${doMes.length||"–"}</b></button>`;
  }).join("");
  const linhaAno = `<div class="muted" style="font-size:12px;margin:12px 0 4px">Data-base no ano — clique no mês para filtrar${_filtroMesDB?` · <button class="link-btn" onclick="filtrarMesDataBase(null)">limpar filtro de mês</button>`:""}</div><div class="db-meses">${meses}</div>`;

  let visiveis = lista.map((g,i)=>({g,i}));
  if(_filtroMesDB) visiveis = visiveis.filter(x=>x.g.mes===_filtroMesDB);
  if(_filtroAlerta==="vencido") visiveis = visiveis.filter(x=>x.g.status==="Vencida");
  else if(_filtroAlerta==="aguardando") visiveis = visiveis.filter(x=>x.g.status==="Aguardando");
  else if(_filtroAlerta==="emdia") visiveis = visiveis.filter(x=>x.g.status==="Em dia");

  const pendentes = visiveis.filter(x=>x.g.status!=="Em dia");
  const emDia = visiveis.filter(x=>x.g.status==="Em dia");
  const mostrarEmDiaAberto = _filtroAlerta==="emdia" || !!_filtroMesDB;
  const titulo = `<div class="db-titulo">Para ligar <span class="muted">· vencidas e do mês, a mais atrasada primeiro</span></div>`;
  const corpoPendentes = pendentes.length ? pendentes.map(x=>_htmlGrupo(x.g,x.i)).join("") : (_filtroAlerta==="emdia" ? "" : `<div class="alert"><strong>Nenhum sindicato vencido ou aguardando${_filtroMesDB||_filtroAlerta!=="todos"?" com este filtro":""}.</strong></div>`);
  const corpoEmDia = emDia.length ? `<details class="db-em-dia"${mostrarEmDiaAberto?" open":""}><summary>Em dia (${emDia.length} ${emDia.length===1?"sindicato":"sindicatos"})</summary>${emDia.map(x=>_htmlGrupo(x.g,x.i)).join("")}</details>` : "";

  box.innerHTML = resumo + linhaAno + (_filtroAlerta==="emdia" ? "" : titulo + corpoPendentes) + corpoEmDia;
}

function filtrarMesDataBase(n){
  _filtroMesDB = (_filtroMesDB===n) ? null : n;
  renderAlertas();
}

async function registrarContatoSindicato(i){
  const g = _gruposDB[i]; if(!g) return;
  const nota = await perguntar(`Contato com o sindicato:\n${g.nome}\n\nO que foi conversado? (ex.: convenção ainda não assinada, ligar de novo dia 25)`, "");
  if(nota===null) return;
  if(!nota.trim()) return aviso("Escreva uma anotação para registrar o contato.");
  if(!state.contatosSindicato || typeof state.contatosSindicato!=="object") state.contatosSindicato = {};
  if(!Array.isArray(state.contatosSindicato[g.nome])) state.contatosSindicato[g.nome] = [];
  const quem = (document.getElementById("sbUsuario")?.textContent||"").trim();
  state.contatosSindicato[g.nome].push({data: new Date().toISOString(), quem, nota: nota.trim(), competencia: comp()});
  saved();
}

function verContatosSindicato(i){
  const g = _gruposDB[i]; if(!g) return;
  const linhas = g.contatos.slice().reverse().map(c=>`• ${_fmtDataHora(c.data)}${c.quem?" ("+c.quem+")":""}\n  ${c.nota}`).join("\n\n");
  aviso(`Contatos com ${g.nome}\n\n${linhas||"Nenhum contato registrado."}`);
}

async function marcarStatusGrupoDB(i, novo){
  const g = _gruposDB[i]; if(!g) return;
  const ok = await confirmar(`Marcar a data-base do sindicato\n${g.nome}\ncomo "${novo}"?\n\nVale para as ${g.itens.length} empresa(s) vinculadas:\n${g.itens.map(x=>"• "+x.empCod+" - "+x.empNome).join("\n")}`);
  if(!ok) return;
  if(g.s){
    // Mesma regra do cadastro do sindicato: o status do sindicato vale para todas as empresas dele.
    salvarStatusSindicato(g.s, novo);
  } else {
    g.itens.forEach(x=>{
      const emp = state.empresas.find(e=>String(e.codigo)===String(x.empCod)); if(!emp) return;
      let alvo = emp;
      if(!x.principal){
        const lista = sindicatoAdicionalDetalhesNormalizados(emp);
        alvo = lista[x.idx]; if(!alvo) return;
        alvo.statusDataBase = novo;
        if(novo==="Em dia") alvo.dataBaseEmDiaAno = anoCompetencia(); else delete alvo.dataBaseEmDiaAno;
        emp.sindicatosAdicionaisDetalhes = normalizarListaSindicatosAdic(lista, emp.sindicato);
        emp.sindicatosAdicionais = emp.sindicatosAdicionaisDetalhes.map(y=>y.nome);
        return;
      }
      alvo.statusDataBase = novo;
      if(novo==="Em dia") alvo.dataBaseEmDiaAno = anoCompetencia(); else delete alvo.dataBaseEmDiaAno;
    });
  }
  saved();
}
