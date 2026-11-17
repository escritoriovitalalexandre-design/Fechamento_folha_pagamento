// ========== LOAD / SAVE ==========
let state;
let _saveTimer = null;

function loadLocal(){
  try{const s=JSON.parse(localStorage.getItem(KEY)); if(s&&s.empresas)return normalizarState(s)}catch(e){}
  for(const k of OLD_KEYS){try{const s=JSON.parse(localStorage.getItem(k)); if(s&&s.empresas)return normalizarState(s)}catch(e){}}
  const s=clone(SEED); return normalizarState(s)
}

async function loadFromSupabase(){
  if(!sbClient){ leituraInicialOk = false; return loadLocal(); }
  try{
    const {data, error} = await sbClient
      .from(SB_TABLE)
      .select("dados, atualizado_em")
      .eq("chave", SB_CHAVE_STATE)
      .maybeSingle();
    if(error) throw error;
    leituraInicialOk = true; // conseguimos LER a nuvem
    versaoNuvemEstado = data?.atualizado_em || null;
    if(data && data.dados && data.dados.empresas){
      setConexao(true);
      return normalizarState(data.dados);
    }
    // Não existe registro ainda: sobe a base local uma única vez
    const local = loadLocal();
    await sbSet(SB_CHAVE_STATE, local);
    return local;
  }catch(e){
    // Falha de leitura: NÃO sobrescreve a nuvem. Usa local só para visualizar.
    leituraInicialOk = false;
    setConexao(false);
    console.error("Falha ao ler do Supabase; usando cópia local sem sobrescrever a nuvem:", e);
    alert("⚠️ Não consegui LER seus dados do Supabase agora.\n\nO app abriu com a última cópia local, mas NÃO vou sobrescrever a nuvem.\n\nNão faça alterações até a bolinha ficar VERDE (Supabase conectado), para não perder trabalho.");
    return loadLocal();
  }
}

function save(){
  if(modoSomenteLeitura){
    showSync("error", "Somente leitura — não salvo");
    return;
  }
  const payload = JSON.stringify(state);

  // IMPORTANTE:
  // O app salva no Supabase, mas antes tentava gravar tudo no navegador.
  // Quando o localStorage fica cheio, o erro "exceeded the quota" travava a função
  // antes de chegar no Supabase. Agora o erro local não impede o salvamento na nuvem.
  try{
    localStorage.setItem(KEY, payload);
  }catch(e){
    console.warn("Backup local não foi salvo porque o armazenamento do navegador está cheio:", e);
    try{ OLD_KEYS.forEach(k=>localStorage.removeItem(k)); }catch(_e){}
    showSync("saving", "Salvando no Supabase...");
  }

  // Salva na nuvem logo em seguida. Assim, mesmo com o navegador cheio,
  // o app continua gravando no Supabase e o F5 não deve mais perder a alteração.
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async ()=>{
    // Proteção: se não conseguimos LER a nuvem ao abrir, não gravamos por cima
    // (evita substituir dados bons por uma base vazia/local).
    if(!leituraInicialOk){
      showSync("error", "Gravação bloqueada (sem leitura)");
      setConexao(false);
      avisarFalhaSalvamento("Ao abrir, o app não conseguiu LER seus dados na nuvem, então bloqueou a gravação para não sobrescrever o que está no Supabase.");
      return;
    }
    const ok = await sbSet(SB_CHAVE_STATE, state);

    // Se o Supabase salvou, tenta manter uma cópia local apenas se couber.
    // Se não couber, não tem problema: na próxima abertura o app carrega do Supabase.
    if(ok){
      try{ localStorage.setItem(KEY, payload); }catch(_e){}
    }
  }, 150);
}
function saved(){save(); renderAll()}
function clone(x){return JSON.parse(JSON.stringify(x))}
function parseEventoLabel(label){const m=String(label||"").trim().match(/^(\d+)\s*-\s*(.+)$/); return m?{codigo:m[1],descricao:m[2].trim()}:null}
function labelEventoObj(e){return `${e.codigo} - ${e.descricao}`}
function normalizarEventosCadastradosFuncionario(fun){
  // Ao alterar evento padrão/automático do funcionário, atualiza o cadastro existente.
  // Mesmo evento = mesmo código/descrição selecionado.
  if(!fun)return fun
  const dedupUltimoPorChave=(lista,campo)=>{
    const mapa=new Map()
    ;(Array.isArray(lista)?lista:[]).forEach(item=>{
      const chave=String(item?.[campo]||"").trim()
      if(!chave){ mapa.set(Symbol(),item); return }
      mapa.set(chave,{...item})
    })
    return Array.from(mapa.values())
  }
  // Eventos padrão com o mesmo código podem representar vigências distintas.
  fun.eventos=(Array.isArray(fun.eventos)?fun.eventos:[]).map(ev=>({...ev,inicio:ev.inicio||"",fim:ev.fim||"",status:ev.status||"Pendente"}))
  fun.autoEventos=dedupUltimoPorChave(fun.autoEventos||[],"evento").map(a=>({...a,inicio:a.inicio||"",fim:a.fim||""}))
  if(!Array.isArray(fun.eventosManuais))fun.eventosManuais=[]
  fun.eventosManuais=fun.eventosManuais.map(m=>({desc:m.desc||"",valor:m.valor||"",obs:m.obs||"",inicio:m.inicio||"",fim:m.fim||"",status:m.status||"Pendente"}))
  return fun
}
function normalizarTempPorChave(lista,campo){
  const mapa=new Map()
  ;(Array.isArray(lista)?lista:[]).forEach(item=>{
    const chave=String(item?.[campo]||"").trim()
    if(!chave){ mapa.set(Symbol(),item); return }
    mapa.set(chave,{...item})
  })
  return Array.from(mapa.values())
}
function normalizarState(s){
  if(!s.fechamentos)s.fechamentos={}
  if(!Array.isArray(s.eventos))s.eventos=[]
  if(!Array.isArray(s.sindicatos))s.sindicatos=[]
  if(!Array.isArray(s.asos))s.asos=[]
  if(!Array.isArray(s.laudos))s.laudos=[]
  if(!Array.isArray(s.ferias))s.ferias=[]
  s.sindicatos=s.sindicatos.map(x=>({...x,id:x.id||(Date.now()+Math.random()),razao:x.razao||"",cnpj:x.cnpj||"",resumoConvencao:x.resumoConvencao||"",anexos:Array.isArray(x.anexos)?x.anexos:[],abreDomingoFeriado:x.abreDomingoFeriado||"",anexoLiberacao:x.anexoLiberacao||null,beneficios:Array.isArray(x.beneficios)?x.beneficios:[]}))
  s.eventos=s.eventos.map(e=>({...e,tipo:e.tipo||"Valor"}))
  const cods=new Set(s.eventos.map(e=>String(e.codigo)))
  ;(s.empresas||[]).forEach(emp=>{
    // FIX v2.4: NÃO reconstruir eventosPermitidos a partir dos funcionários.
    // Isso reincluía eventos removidos manualmente. Agora só garante que o
    // cadastro global contenha os eventos usados, sem forçar vínculo na empresa.
    const permitidos=(Array.isArray(emp.eventosPermitidos)?emp.eventosPermitidos:[]).filter(l=>parseEventoLabel(l))
    emp.eventosPermitidos=permitidos.sort((a,b)=>Number((a.match(/^\d+/)||[999999])[0])-Number((b.match(/^\d+/)||[999999])[0]) || a.localeCompare(b))
    ;(emp.funcionarios||[]).forEach(fun=>{
      ;(fun.eventos||[]).forEach(ev=>{
        const parsed=parseEventoLabel(ev.desc)
        if(parsed&&!cods.has(parsed.codigo)){
          s.eventos.push({codigo:parsed.codigo,descricao:parsed.descricao,tipo:"Valor"})
          cods.add(parsed.codigo)
        }
      })
    })
    if(!emp.statusFechamento)emp.statusFechamento="Pendente"
    if(!emp.vinculoSindicato)emp.vinculoSindicato="Normal"
    if(!emp.dataBaseObs)emp.dataBaseObs=""
    if(!emp.naoContribuiSindicatoObs)emp.naoContribuiSindicatoObs=""
    if(!emp.contribuicaoSindicatoStatus)emp.contribuicaoSindicatoStatus=emp.naoContribuiSindicatoObs?"NAO":"OK"
    if(!Array.isArray(emp.sindicatosAdicionais))emp.sindicatosAdicionais=[]
    emp.possuiMaisDeUmSindicato=!!(emp.possuiMaisDeUmSindicato||emp.sindicatosAdicionais.length)
    if(!emp.statusDataBase)emp.statusDataBase=(String(emp.dissidio||"").toUpperCase().includes("OK")?"Em dia":"Aguardando")
    if(emp.statusDataBase==="Pendente")emp.statusDataBase="Aguardando"
    if(emp.statusDataBase==="Atrasado"||emp.statusDataBase==="Vencida")emp.statusDataBase="Em dia"
    if(emp.statusDataBase==="Em dia"&&!emp.dataBaseEmDiaAno)emp.dataBaseEmDiaAno=Number((SEED.competenciaBase||"").split("-")[0]||new Date().getFullYear())
    if(!emp.obsInterna)emp.obsInterna=""
    ;(emp.funcionarios||[]).forEach(fun=>{if(!fun.autoEventos)fun.autoEventos=[]; if(!fun.admissao)fun.admissao=""; normalizarEventosCadastradosFuncionario(fun)})
  })
  const sindSet=new Set(s.sindicatos.map(x=>String(x.nome||"").trim()).filter(Boolean))
  ;(s.empresas||[]).forEach(emp=>{
    const nome=String(emp.sindicato||"").trim()
    if(nome&&!sindSet.has(nome)){
      s.sindicatos.push({id:Date.now()+Math.random(),nome,contatoNome:"",contato:"",email:"",dataBase:emp.dataBase||"",beneficio:"Normal",obs:"Criado automaticamente a partir do cadastro da empresa.",resumoConvencao:"",anexos:[],abreDomingoFeriado:"",anexoLiberacao:null,beneficios:[]})
      sindSet.add(nome)
    }
  })
  s.sindicatos.sort((a,b)=>String(a.nome).localeCompare(String(b.nome)))
  s.eventos.sort((a,b)=>Number(a.codigo)-Number(b.codigo) || String(a.descricao).localeCompare(String(b.descricao)))
  return s
}
function load(){
  return loadLocal();
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

const MESES_EXTENSO=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
function normalizarMesExtenso(v){
  const s=String(v||"").trim().toLowerCase()
  if(!s)return ""
  const mapa={jan:"Janeiro",janeiro:"Janeiro",fev:"Fevereiro",fevereiro:"Fevereiro",mar:"Março",marco:"Março",março:"Março",abr:"Abril",abril:"Abril",mai:"Maio",maio:"Maio",jun:"Junho",junho:"Junho",jul:"Julho",julho:"Julho",ago:"Agosto",agosto:"Agosto",set:"Setembro",setembro:"Setembro",out:"Outubro",outubro:"Outubro",nov:"Novembro",novembro:"Novembro",dez:"Dezembro",dezembro:"Dezembro"}
  if(mapa[s])return mapa[s]
  const n=parseInt(s,10); if(n>=1&&n<=12)return MESES_EXTENSO[n-1]
  return String(v||"").trim()
}
function mesesOptions(valor){
  const v=normalizarMesExtenso(valor)
  return '<option value="">Selecione...</option>'+MESES_EXTENSO.map(m=>`<option value="${esc(m)}"${m===v?' selected':''}>${esc(m)}</option>`).join("")
}
function valorSelectMultiplo(id){
  const el=document.getElementById(id); if(!el)return []
  return Array.from(el.selectedOptions||[]).map(o=>o.value).filter(Boolean)
}
function setSelectMultiplo(id,vals){
  const set=new Set(Array.isArray(vals)?vals:[])
  const el=document.getElementById(id); if(!el)return
  Array.from(el.options||[]).forEach(o=>o.selected=set.has(o.value))
}
function salvarAgora(){
  localStorage.setItem(KEY, JSON.stringify(state));
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=null;
  if(typeof sbSet==="function")sbSet(SB_CHAVE_STATE,state);
}
