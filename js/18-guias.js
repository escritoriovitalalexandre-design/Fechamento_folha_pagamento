/* ===== Senhas de portais no cofre do Supabase (Vault) =====
   O estado guarda só "senhaRef" (id do segredo). A senha é lida sob demanda
   pela função ler_senha_portal, que só responde para a equipe logada.
   Objetos antigos ainda com "senha" em texto continuam sendo exibidos. */
let gtSenhaOriginal={ref:null,valor:'',carregando:false};
async function guardarSenhaPortal(senha){
  // Devolve o id do segredo, null se a senha estiver vazia, ou undefined se falhar.
  if(!senha) return null;
  const {data,error}=await sbClient.rpc('salvar_senha_portal',{p_senha:senha});
  if(error||!data){ alert('Não consegui guardar a senha no cofre do Supabase: '+(error?.message||'sem resposta')+'.\n\nNada foi alterado.'); return undefined; }
  return data;
}
async function lerSenhaPortal(ref){
  const {data,error}=await sbClient.rpc('ler_senha_portal',{p_ref:ref});
  if(error){ alert('Não consegui ler a senha: '+error.message); return null; }
  return data||'';
}
function htmlSenhaPortal(t){
  if(t.senhaRef) return '<span class="senha-portal">••••••••</span> <button class="btn small out" type="button" onclick="mostrarSenhaPortal(this,\''+esc(t.senhaRef)+'\')">Mostrar</button>';
  if(t.senha) return '<span class="senha-portal" data-senha="'+esc(t.senha)+'">••••••••</span> <button class="btn small out" type="button" onclick="mostrarSenhaPortal(this,null)">Mostrar</button>';
  return 'Não informado';
}
async function mostrarSenhaPortal(btn,ref){
  const span=btn.previousElementSibling;
  if(btn.dataset.aberta){ span.textContent='••••••••'; btn.textContent='Mostrar'; delete btn.dataset.aberta; return; }
  btn.disabled=true;
  const senha= ref ? await lerSenhaPortal(ref) : (span.dataset.senha||'');
  btn.disabled=false;
  if(senha===null) return;
  span.textContent=senha||'(vazia)'; btn.textContent='Ocultar'; btn.dataset.aberta='1';
}
async function preencherSenhaEdicao(d){
  const campo=document.getElementById('gtSenha');
  const ref=d.senhaRef||null;
  gtSenhaOriginal={ref,valor:d.senha||'',carregando:!!ref};
  campo.value=d.senha||'';
  if(!ref) return;
  campo.value=''; campo.placeholder='carregando do cofre...';
  const senha=await lerSenhaPortal(ref);
  if(gtSenhaOriginal.ref!==ref) return; // usuário trocou de tela enquanto carregava
  if(senha===null){
    // Não conseguiu ler: deixa o campo vazio e, se continuar vazio, mantém a senha atual.
    gtSenhaOriginal={ref,valor:null,carregando:false};
    campo.placeholder='não carregou — deixe vazio para manter';
    return;
  }
  gtSenhaOriginal={ref,valor:senha,carregando:false};
  campo.value=senha; campo.placeholder='';
}
function alternarVerSenha(id,btn){const c=document.getElementById(id); if(!c)return; const ver=c.type==='password'; c.type=ver?'text':'password'; btn.textContent=ver?'🙈':'👁';}

/* ===== v3.1 — Módulo Guias (controle mensal por empresa) ===== */
const GUIA_STATUS=['A gerar','Solicitada','Gerada','Paga','Atrasada'];
const GUIA_MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let guiaExpand=new Set();
let guiaDraft={};
let guiaListaVisivel=false;
let guiaTipoAnexoTemp=null;
let guiaTipoEditAnexoTemp=null;
function numCod(c){const n=parseInt(String(c).replace(/\D/g,''),10); return isNaN(n)?9e9:n;}
function guiasState(){
  if(!state.guias||typeof state.guias!=='object') state.guias={};
  const g=state.guias;
  if(!Array.isArray(g.tipos)) g.tipos=['Guia assistencial','Guia odontológica','Cartão alimentação'];
  g.tipos=g.tipos.map(t=> typeof t==='string'
    ? {nome:t,forma:'',url:'',usuario:'',senhaRef:null,infos:'',vencimento:'',anexo:null}
    : {nome:t.nome||'',forma:t.forma||'',url:t.url||'',usuario:t.usuario||'',senhaRef:t.senhaRef||null,...(t.senha?{senha:t.senha}:{}),infos:t.infos||'',vencimento:t.vencimento||'',anexo:t.anexo||null});
  if(!Array.isArray(g.empresas)) g.empresas=[];
  g.empresas.forEach(e=>{
    if(!Array.isArray(e.guias)){
      e.guias = Array.isArray(e.tipos)? e.tipos.map(nm=>({tipo:nm,meses:'todos',inicio:'',fim:'',acesso:null})) : [];
    } else {
      e.guias=e.guias.map(x=>({tipo:x.tipo||'',meses:(x.meses==='todos'||!Array.isArray(x.meses))?'todos':x.meses,inicio:x.inicio||'',fim:x.fim||'',acesso:x.acesso||null}));
    }
    if('tipos' in e) delete e.tipos;
  });
  if(!g.lanc||typeof g.lanc!=='object') g.lanc={};
  Object.keys(g.lanc).forEach(k=>{if(g.lanc[k]&&g.lanc[k].status==='Enviada')g.lanc[k].status='Gerada';});
  return g;
}
function guiasComp(){const el=document.getElementById('guiasComp'); return (el&&el.value)|| comp();}
function guiasTodas(){return !!document.getElementById('guiasTodasComp')?.checked;}
function compMesNum(c){return parseInt(String(c).slice(5,7),10)||0;}
function compAddMes(c,delta){let y=parseInt(c.slice(0,4),10), m=parseInt(c.slice(5,7),10)-1+delta; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+'-'+String(m+1).padStart(2,'0');}
function fmtComp(c){return fmtMesAnoRel(c);}
function fmtVenc(v){return v?('Dia '+v):'Não informado';}
function guiaNomeEmp(cod){const e=(state.empresas||[]).find(x=>String(x.codigo)===String(cod)); return e?(e.codigo+' - '+e.nome):String(cod);}
function guiaTipoObj(nome){return guiasState().tipos.find(t=>t.nome===nome);}
function guiaEmpresasOrdenadas(){return guiasState().empresas.slice().sort((a,b)=>numCod(a.codigo)-numCod(b.codigo));}
function guiaGuiasDe(cod){if(guiaDraft[cod])return guiaDraft[cod]; const e=guiasState().empresas.find(x=>String(x.codigo)===String(cod)); return e?(e.guias||[]):[];}
function guiaEntryFor(cod,tipo){return guiaGuiasDe(cod).find(x=>x.tipo===tipo);}
function guiaEnsureDraft(cod){cod=String(cod); if(!guiaDraft[cod]){const e=guiasState().empresas.find(x=>String(x.codigo)===cod); guiaDraft[cod]= e? clone(e.guias||[]) : [];} return guiaDraft[cod];}
function guiaRec(c,empCod,tipo){const g=guiasState(); const k=c+'|'+empCod+'|'+tipo; if(!g.lanc[k]) g.lanc[k]={status:'A gerar',dataEnvio:'',dataCobranca:''}; return g.lanc[k];}
function guiaStatusClass(s){return s==='Paga'?'ok':s==='Atrasada'?'red':s==='Gerada'?'teal':s==='Solicitada'?'blue':'pend';}
function guiaAtiva(entry,c){if(!entry)return false; if(entry.inicio&&c<entry.inicio)return false; if(entry.fim&&c>entry.fim)return false; return true;}
function guiaAplica(g,c){if(g.inicio&&c<g.inicio)return false; if(g.fim&&c>g.fim)return false; if(g.meses!=='todos'&&Array.isArray(g.meses)&&!g.meses.includes(compMesNum(c)))return false; return true;}
function guiaLinhasComp(c){
  const linhas=[];
  guiaEmpresasOrdenadas().forEach(e=>{(e.guias||[]).forEach(g=>{if(!guiaAplica(g,c))return; const r=guiaRec(c,e.codigo,g.tipo); linhas.push({comp:c,empCod:e.codigo,tipo:g.tipo,status:r.status,dataEnvio:r.dataEnvio,dataCobranca:r.dataCobranca});});});
  return linhas;
}
function guiaLinhasTodas(){
  const g=guiasState(); const linhas=[]; const comps={};
  Object.keys(g.lanc).forEach(k=>{comps[k.split('|')[0]]=true;});
  Object.keys(comps).sort().forEach(c=>{
    guiaEmpresasOrdenadas().forEach(e=>{(e.guias||[]).forEach(gg=>{if(!guiaAplica(gg,c))return; const key=c+'|'+e.codigo+'|'+gg.tipo; if(!g.lanc[key])return; const r=g.lanc[key]; linhas.push({comp:c,empCod:e.codigo,tipo:gg.tipo,status:r.status,dataEnvio:r.dataEnvio,dataCobranca:r.dataCobranca});});});
  });
  return linhas;
}
function guiaSetStatus(c,empCod,tipo,val){const r=guiaRec(c,empCod,tipo); r.status=val; save(); renderGuias();}
function guiaSetData(c,empCod,tipo,campo,val){const r=guiaRec(c,empCod,tipo); r[campo]=val; save();}
function guiaAddEmpresa(){
  const sel=document.getElementById('guiaEmpAdd'); const cod=sel&&sel.value;
  if(!cod)return alert('Selecione uma empresa.');
  const g=guiasState();
  if(g.empresas.some(x=>String(x.codigo)===String(cod)))return alert('Empresa já incluída no controle de guias.');
  g.empresas.push({codigo:cod,guias:[]});
  guiaListaVisivel=true; guiaExpand.add(String(cod)); guiaEnsureDraft(cod);
  saved();
}
function guiaRemoveEmpresa(cod){
  if(!confirm('Remover esta empresa do controle de guias? O histórico de lançamentos dela é mantido.'))return;
  const g=guiasState(); g.empresas=g.empresas.filter(x=>String(x.codigo)!==String(cod)); guiaExpand.delete(String(cod)); delete guiaDraft[String(cod)]; saved();
}
function guiaToggleExpand(cod){
  cod=String(cod);
  if(guiaExpand.has(cod)){
    const e=guiasState().empresas.find(x=>String(x.codigo)===cod);
    if(guiaDraft[cod] && JSON.stringify(guiaDraft[cod])!==JSON.stringify((e&&e.guias)||[])){
      if(!confirm('Há alterações não salvas nesta empresa. Descartar?'))return;
    }
    delete guiaDraft[cod]; guiaExpand.delete(cod);
  } else { guiaEnsureDraft(cod); guiaExpand.add(cod); }
  renderGuias();
}
function guiaExpandirTodas(abrir){
  guiaListaVisivel=!!abrir;
  if(!abrir){ guiaExpand.clear(); guiaDraft={}; }
  renderGuias();
}
function guiaSalvarEmpresa(cod){
  cod=String(cod);
  const e=guiasState().empresas.find(x=>String(x.codigo)===cod);
  if(e) e.guias = guiaDraft[cod]? clone(guiaDraft[cod]) : (e.guias||[]);
  delete guiaDraft[cod]; guiaExpand.delete(cod); saved();
}
function guiaCancelarEmpresa(cod){
  cod=String(cod); delete guiaDraft[cod]; guiaExpand.delete(cod); renderGuias();
}
function guiaToggleGuia(cod,tipo,checked){
  const arr=guiaEnsureDraft(cod);
  let entry=arr.find(x=>x.tipo===tipo);
  if(checked){
    if(!entry){arr.push({tipo,meses:'todos',inicio:'',fim:'',acesso:null});}
    else{entry.fim='';}
    renderGuias();
  } else {
    if(!entry){renderGuias();return;}
    if(!confirm('Tem certeza que deseja desmarcar a guia "'+tipo+'" da empresa '+guiaNomeEmp(cod)+'?\n\nVocê vai informar a partir de qual competência ela deixa de aparecer. Os meses anteriores continuam no controle.')){renderGuias();return;}
    const resp=prompt('A partir de qual competência a guia "'+tipo+'" NÃO deve mais aparecer?\n\nDigite no formato AAAA-MM (ex.: 2026-08). Ela continua aparecendo até a competência anterior.', guiasComp());
    if(resp===null){renderGuias();return;}
    const c=(resp||'').trim();
    if(!/^\d{4}-\d{2}$/.test(c)){alert('Competência inválida. Use o formato AAAA-MM (ex.: 2026-08).');renderGuias();return;}
    entry.fim=compAddMes(c,-1); renderGuias();
  }
}
function guiaSetMesesTodos(cod,tipo,todos){
  const arr=guiaEnsureDraft(cod); const entry=arr.find(x=>x.tipo===tipo); if(!entry)return;
  entry.meses = todos ? 'todos' : (Array.isArray(entry.meses)?entry.meses:[]); renderGuias();
}
function guiaToggleMes(cod,tipo,mesNum,checked){
  const arr=guiaEnsureDraft(cod); const entry=arr.find(x=>x.tipo===tipo); if(!entry)return;
  let m=Array.isArray(entry.meses)?entry.meses.slice():[];
  if(checked){if(!m.includes(mesNum))m.push(mesNum);} else {m=m.filter(x=>x!==mesNum);}
  m.sort((a,b)=>a-b); entry.meses=m; renderGuias();
}
async function guiaAddTipoAnexo(files){
  const file=Array.from(files||[])[0]; if(!file)return;
  if(file.size>10*1024*1024){alert('O arquivo '+file.name+' tem mais de 10 MB.');return;}
  const tipo='Formulário da guia';
  guiaTipoAnexoTemp={tipo,nome:file.name,tamanho:file.size,enviando:true}; renderGuiaTipoAnexoTemp();
  const anexo=await uploadAnexoStorage(file,tipo);
  guiaTipoAnexoTemp=anexo; renderGuiaTipoAnexoTemp();
}
function renderGuiaTipoAnexoTemp(){const box=document.getElementById('guiaTipoAnexoLista'); if(!box)return; box.innerHTML=guiaTipoAnexoTemp?anexoLinhaSindHtml(guiaTipoAnexoTemp,'guiaTipoAnexoTemp=null;renderGuiaTipoAnexoTemp()'):'Nenhum documento anexado.';}
async function guiaAddTipo(){
  const nome=(document.getElementById('guiaTipoNovo').value||'').trim();
  if(!nome)return alert('Informe o nome do tipo de guia.');
  const g=guiasState();
  if(g.tipos.some(t=>t.nome.toLowerCase()===nome.toLowerCase()))return alert('Esse tipo de guia já existe.');
  const senhaRef=await guardarSenhaPortal(document.getElementById('guiaTipoSenha').value||'');
  if(senhaRef===undefined)return;
  g.tipos.push({nome,forma:document.getElementById('guiaTipoForma').value||'',url:(document.getElementById('guiaTipoUrl').value||'').trim(),usuario:(document.getElementById('guiaTipoUsuario').value||'').trim(),senhaRef,infos:(document.getElementById('guiaTipoInfos').value||'').trim(),vencimento:(document.getElementById('guiaTipoVenc').value||'').trim(),anexo:guiaTipoAnexoTemp||null});
  ['guiaTipoNovo','guiaTipoUrl','guiaTipoUsuario','guiaTipoSenha','guiaTipoInfos','guiaTipoVenc'].forEach(id=>{const el=document.getElementById(id); if(el)el.value='';});
  const f=document.getElementById('guiaTipoForma'); if(f)f.value='';
  guiaTipoAnexoTemp=null; renderGuiaTipoAnexoTemp(); saved();
}
function guiaRenomearTipo(old){
  const novo=prompt('Novo nome para a guia "'+old+'":', old);
  if(novo===null)return;
  const nome=novo.trim();
  if(!nome)return alert('Informe um nome.');
  if(nome===old)return;
  const g=guiasState();
  if(g.tipos.some(t=>t.nome.toLowerCase()===nome.toLowerCase()))return alert('Já existe uma guia com esse nome.');
  const t=g.tipos.find(x=>x.nome===old); if(!t)return;
  t.nome=nome;
  g.empresas.forEach(e=>{(e.guias||[]).forEach(x=>{if(x.tipo===old)x.tipo=nome;});});
  Object.keys(guiaDraft).forEach(cod=>{(guiaDraft[cod]||[]).forEach(x=>{if(x.tipo===old)x.tipo=nome;});});
  const nl={};
  Object.keys(g.lanc).forEach(k=>{const p=k.split('|'); const tp=p.slice(2).join('|'); if(tp===old){nl[p[0]+'|'+p[1]+'|'+nome]=g.lanc[k];}else{nl[k]=g.lanc[k];}});
  g.lanc=nl;
  saved();
}
function guiaRemoveTipo(nome){
  if(!confirm('Remover o tipo "'+nome+'"? Ele deixa de aparecer no controle. Lançamentos antigos são mantidos.'))return;
  const g=guiasState(); g.tipos=g.tipos.filter(t=>t.nome!==nome);
  g.empresas.forEach(e=>{e.guias=(e.guias||[]).filter(x=>x.tipo!==nome);});
  Object.keys(guiaDraft).forEach(cod=>{guiaDraft[cod]=(guiaDraft[cod]||[]).filter(x=>x.tipo!==nome);});
  saved();
}
function guiaAcessoEfetivo(nome,empCod){
  const t=guiaTipoObj(nome);
  if(empCod){const entry=guiaEntryFor(empCod,nome); if(entry&&entry.acesso) return {fonte:'empresa',dados:entry.acesso};}
  return {fonte:'geral',dados:t||{forma:'',url:'',usuario:'',senha:'',infos:'',vencimento:'',anexo:null}};
}
function abrirGuiaTipo(nome,empCod){
  const t=guiaTipoObj(nome); if(!t)return;
  document.getElementById('guiaTipoEditNome').value=t.nome;
  document.getElementById('guiaTipoEditEmp').value=empCod||'';
  document.getElementById('modalGuiaTipoTitulo').textContent='Guia: '+t.nome+(empCod?' — '+guiaNomeEmp(empCod):'');
  renderGuiaTipoView();
  document.getElementById('guiaTipoView').style.display='block';
  document.getElementById('guiaTipoEdit').style.display='none';
  modalGuiaTipo.classList.add('open');
}
function renderGuiaTipoView(){
  const nome=document.getElementById('guiaTipoEditNome').value;
  const empCod=document.getElementById('guiaTipoEditEmp').value;
  const ef=guiaAcessoEfetivo(nome,empCod); const t=ef.dados; const a=t.anexo;
  const badge = ef.fonte==='empresa'
    ? '<span class="badge teal">Específico desta empresa</span>'
    : '<span class="badge blue">Cadastro geral (todas as empresas)</span>';
  document.getElementById('guiaTipoView').innerHTML='<div style="margin-bottom:10px">'+badge+'</div><div class="sind-grid">'+
    '<div class="sind-info"><b>Forma de solicitação</b>'+esc(t.forma||'Não informado')+'</div>'+
    '<div class="sind-info"><b>Vencimento</b>'+esc(fmtVenc(t.vencimento))+'</div>'+
    '<div class="sind-info"><b>URL do site / portal</b>'+(t.url?'<a href="'+esc(t.url)+'" target="_blank" rel="noopener">'+esc(t.url)+'</a>':'Não informado')+'</div>'+
    '<div class="sind-info"><b>Usuário</b>'+esc(t.usuario||'Não informado')+'</div>'+
    '<div class="sind-info"><b>Senha</b>'+htmlSenhaPortal(t)+'</div>'+
    '<div class="sind-info" style="grid-column:1/-1"><b>Informações adicionais</b><div style="white-space:pre-wrap">'+esc(t.infos||'-')+'</div></div>'+
    '<div class="sind-info" style="grid-column:1/-1"><b>Formulário / anexo</b>'+(a?'<div class="anexo-item"><div><b>'+esc(a.tipo||'Documento')+'</b><br><span class="muted">'+esc(a.nome||'')+' '+(a.tamanho?'· '+esc(formatFileSize(a.tamanho)):'')+'</span></div><a class="btn small out" href="'+esc(anexoLink(a))+'" download="'+esc(a.nome||'documento')+'" target="_blank">Abrir/baixar</a></div>':'Nenhum documento anexado.')+'</div>'+
  '</div><div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn pri" onclick="guiaTipoIniciarEdicao()">Editar</button></div>';
}
function guiaTipoPreencherEdicao(d){
  document.getElementById('gtForma').value=d.forma||'';
  document.getElementById('gtVenc').value=d.vencimento||'';
  document.getElementById('gtUrl').value=d.url||'';
  document.getElementById('gtUsuario').value=d.usuario||'';
  preencherSenhaEdicao(d);
  document.getElementById('gtInfos').value=d.infos||'';
  guiaTipoEditAnexoTemp=d.anexo?clone(d.anexo):null; renderGtAnexo();
}
function guiaTipoIniciarEdicao(){
  const nome=document.getElementById('guiaTipoEditNome').value;
  const empCod=document.getElementById('guiaTipoEditEmp').value;
  const t=guiaTipoObj(nome); if(!t)return;
  const row=document.getElementById('gtEscopoRow');
  if(empCod){
    row.style.display='block';
    document.getElementById('gtEscopoLabel').textContent=guiaNomeEmp(empCod);
    const ef=guiaAcessoEfetivo(nome,empCod);
    document.getElementById('gtEscopoEmp').checked=(ef.fonte==='empresa');
    guiaTipoPreencherEdicao(ef.dados);
  } else {
    row.style.display='none';
    document.getElementById('gtEscopoEmp').checked=false;
    guiaTipoPreencherEdicao(t);
  }
  document.getElementById('guiaTipoView').style.display='none';
  document.getElementById('guiaTipoEdit').style.display='block';
}
function guiaTipoEscopoToggle(){
  const nome=document.getElementById('guiaTipoEditNome').value;
  const empCod=document.getElementById('guiaTipoEditEmp').value;
  if(document.getElementById('gtEscopoEmp').checked){
    const entry=guiaEntryFor(empCod,nome);
    guiaTipoPreencherEdicao(entry&&entry.acesso?entry.acesso:guiaTipoObj(nome));
  } else {
    guiaTipoPreencherEdicao(guiaTipoObj(nome));
  }
}
function guiaTipoCancelarEdicao(){
  renderGuiaTipoView();
  document.getElementById('guiaTipoEdit').style.display='none';
  document.getElementById('guiaTipoView').style.display='block';
}
function renderGtAnexo(){const box=document.getElementById('gtAnexoLista'); if(!box)return; box.innerHTML=guiaTipoEditAnexoTemp?anexoLinhaSindHtml(guiaTipoEditAnexoTemp,'guiaTipoEditAnexoTemp=null;renderGtAnexo()'):'Nenhum documento anexado.';}
async function guiaTipoEditAnexo(files){
  const file=Array.from(files||[])[0]; if(!file)return;
  if(file.size>10*1024*1024){alert('O arquivo '+file.name+' tem mais de 10 MB.');return;}
  const tipo='Formulário da guia';
  guiaTipoEditAnexoTemp={tipo,nome:file.name,tamanho:file.size,enviando:true}; renderGtAnexo();
  const anexo=await uploadAnexoStorage(file,tipo);
  guiaTipoEditAnexoTemp=anexo; renderGtAnexo();
}
async function guiaTipoSalvarEdicao(){
  const nome=document.getElementById('guiaTipoEditNome').value;
  const empCod=document.getElementById('guiaTipoEditEmp').value;
  const t=guiaTipoObj(nome); if(!t)return;
  if(gtSenhaOriginal.carregando){ alert('Aguarde: a senha ainda está sendo carregada do cofre.'); return; }
  const senhaDigitada=document.getElementById('gtSenha').value||'';
  let senhaRef;
  if(!senhaDigitada) senhaRef = gtSenhaOriginal.valor===null ? gtSenhaOriginal.ref : null;
  else if(senhaDigitada===gtSenhaOriginal.valor && gtSenhaOriginal.ref) senhaRef=gtSenhaOriginal.ref;
  else { senhaRef=await guardarSenhaPortal(senhaDigitada); if(senhaRef===undefined) return; }
  const dados={forma:document.getElementById('gtForma').value||'',vencimento:(document.getElementById('gtVenc').value||'').trim(),url:(document.getElementById('gtUrl').value||'').trim(),usuario:(document.getElementById('gtUsuario').value||'').trim(),senhaRef,infos:(document.getElementById('gtInfos').value||'').trim(),anexo:guiaTipoEditAnexoTemp||null};
  const aplicarNoTipo=()=>{ t.forma=dados.forma;t.vencimento=dados.vencimento;t.url=dados.url;t.usuario=dados.usuario;t.senhaRef=dados.senhaRef;delete t.senha;t.infos=dados.infos;t.anexo=dados.anexo; };
  const especifico = empCod && document.getElementById('gtEscopoEmp').checked;
  if(empCod){
    const entry=guiaEntryFor(empCod,nome);
    if(especifico){ if(entry)entry.acesso=dados; }
    else { if(entry)entry.acesso=null; aplicarNoTipo(); }
  } else {
    aplicarNoTipo();
  }
  fecharGuiaTipo(); saved();
}
function fecharGuiaTipo(){modalGuiaTipo.classList.remove('open');}
function renderGuias(){
  if(typeof tabGuias==='undefined')return;
  const g=guiasState();
  const cel=document.getElementById('guiasComp'); if(cel && !cel.value) cel.value=comp();
  const c=guiasComp(); const todas=guiasTodas();
  const fEmp=document.getElementById('guiasEmpFiltro');
  if(fEmp){const v=fEmp.value; fEmp.innerHTML='<option value="">Todas</option>'+guiaEmpresasOrdenadas().map(e=>'<option value="'+esc(e.codigo)+'">'+esc(guiaNomeEmp(e.codigo))+'</option>').join(''); if(v)fEmp.value=v;}
  const empF=document.getElementById('guiasEmpFiltro')?.value||'';
  const stF=document.getElementById('guiasStatusFiltro')?.value||'';
  const addSel=document.getElementById('guiaEmpAdd');
  if(addSel){const disp=(state.empresas||[]).filter(e=>!g.empresas.some(x=>String(x.codigo)===String(e.codigo))).slice().sort((a,b)=>numCod(a.codigo)-numCod(b.codigo)); addSel.innerHTML='<option value="">Selecione uma empresa...</option>'+disp.map(e=>'<option value="'+esc(e.codigo)+'">'+esc(e.codigo)+' - '+esc(e.nome)+'</option>').join('');}
  const tiposBox=document.getElementById('guiaTiposLista');
  if(tiposBox){tiposBox.innerHTML=g.tipos.length?g.tipos.map(t=>{const nJs=esc(t.nome).replaceAll("'","&#39;"); return '<span class="badge blue" style="margin:3px 4px;display:inline-flex;gap:8px;align-items:center;cursor:pointer" title="Ver/editar dados da guia" onclick="abrirGuiaTipo(\''+nJs+'\')">'+esc(t.nome)+(t.url?' 🔗':'')+(t.anexo?' 📎':'')+'<button class="link-btn" style="color:inherit;text-decoration:none;font-weight:900" title="Renomear guia" onclick="event.stopPropagation();guiaRenomearTipo(\''+nJs+'\')">✎</button><button class="link-btn" style="color:inherit;text-decoration:none;font-weight:900" title="Remover tipo" onclick="event.stopPropagation();guiaRemoveTipo(\''+nJs+'\')">✕</button></span>';}).join(''):'Nenhum tipo cadastrado.';}
  const cfg=document.getElementById('guiaEmpresasConfig');
  if(cfg){
    const emps=guiaEmpresasOrdenadas();
    if(!emps.length){ cfg.innerHTML='<p class="muted">Nenhuma empresa incluída ainda.</p>'; }
    else if(!guiaListaVisivel){ cfg.innerHTML='<div class="muted" style="padding:8px 2px;font-size:14px">🏢 '+emps.length+' empresa(s) adicionada(s). Clique em <b>Mostrar todas</b> para ver e editar a relação.</div>'; }
    else { cfg.innerHTML=emps.map(e=>{
      const codJs=esc(e.codigo).replaceAll("'","&#39;");
      const aberta=guiaExpand.has(String(e.codigo));
      let body='';
      if(aberta){
        const arr=guiaGuiasDe(e.codigo);
        if(!g.tipos.length){body='<p class="muted" style="margin-top:8px">Nenhum tipo de guia cadastrado.</p>';}
        else{
          body='<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">'+g.tipos.map(t=>{
            const tpJs=esc(t.nome).replaceAll("'","&#39;");
            const entry=arr.find(x=>x.tipo===t.nome);
            const ativa=guiaAtiva(entry,c);
            let sub='';
            if(ativa){
              const todosM=entry.meses==='todos';
              let mesesUI='<label style="display:inline-flex;gap:5px;align-items:center;margin-right:12px;font-weight:700"><input type="checkbox" '+(todosM?'checked':'')+' onchange="guiaSetMesesTodos(\''+codJs+'\',\''+tpJs+'\',this.checked)"> Todos os meses</label>';
              if(!todosM){const m=Array.isArray(entry.meses)?entry.meses:[]; mesesUI+=GUIA_MESES.map((nm,i)=>{const mn=i+1;const on=m.includes(mn); return '<label style="display:inline-flex;gap:4px;align-items:center;margin:2px 8px 2px 0"><input type="checkbox" '+(on?'checked':'')+' onchange="guiaToggleMes(\''+codJs+'\',\''+tpJs+'\','+mn+',this.checked)"> '+nm.slice(0,3)+'</label>';}).join('');}
              const vig=(entry.inicio||entry.fim)?'<div class="muted" style="margin-top:4px;font-size:12px">Vigência: '+(entry.inicio?'a partir de '+fmtComp(entry.inicio):'desde o início')+(entry.fim?' · até '+fmtComp(entry.fim):'')+'</div>':'';
              sub='<div style="margin:6px 0 4px 26px">'+mesesUI+vig+'</div>';
            } else if(entry&&entry.fim){
              sub='<div class="muted" style="margin:4px 0 4px 26px;font-size:12px">Encerrada — aparece até '+fmtComp(entry.fim)+' (histórico mantido). Marque para reativar.</div>';
            }
            return '<div><label style="display:inline-flex;gap:7px;align-items:center"><input type="checkbox" '+(ativa?'checked':'')+' onchange="guiaToggleGuia(\''+codJs+'\',\''+tpJs+'\',this.checked)"> <b class="link-btn" style="text-decoration:none;cursor:pointer" title="Ver/editar dados da guia" onclick="abrirGuiaTipo(\''+tpJs+'\',\''+codJs+'\')">'+esc(t.nome)+'</b>'+((entry&&entry.acesso)?' <span class="badge teal" style="font-size:10px;padding:2px 6px" title="Tem informações de acesso específicas para esta empresa">específico</span>':'')+'</label>'+sub+'</div>';
          }).join('')+'</div>';
        }
        body+='<div class="actions" style="justify-content:flex-end;margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><button class="btn out" onclick="guiaCancelarEmpresa(\''+codJs+'\')">Cancelar</button><button class="btn pri" onclick="guiaSalvarEmpresa(\''+codJs+'\')">Salvar</button></div>';
      }
      return '<div class="card" style="box-shadow:none;margin-bottom:10px;padding:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><button class="link-btn" style="text-decoration:none;font-size:16px;cursor:pointer" onclick="guiaToggleExpand(\''+codJs+'\')">'+(aberta?'▾':'▸')+' '+esc(guiaNomeEmp(e.codigo))+'</button><button class="btn small red" onclick="guiaRemoveEmpresa(\''+codJs+'\')">Remover</button></div>'+body+'</div>';
    }).join(''); }
  }
  const _emps=guiaEmpresasOrdenadas();
  const _bm=document.getElementById('guiaBtnMostrar'), _bo=document.getElementById('guiaBtnOcultar');
  if(_bm) _bm.className='btn small '+(guiaListaVisivel?'pri':'out');
  if(_bo) _bo.className='btn small '+(guiaListaVisivel?'out':'pri');
  let base = todas ? guiaLinhasTodas() : guiaLinhasComp(c);
  if(empF) base=base.filter(l=>String(l.empCod)===String(empF));
  let k={total:0,gerar:0,solic:0,gerada:0,paga:0,atrasada:0};
  base.forEach(l=>{k.total++; if(l.status==='A gerar')k.gerar++; else if(l.status==='Solicitada')k.solic++; else if(l.status==='Gerada')k.gerada++; else if(l.status==='Paga')k.paga++; else if(l.status==='Atrasada')k.atrasada++;});
  if(typeof guiaTotal!=='undefined'){guiaTotal.textContent=k.total; guiaGerar.textContent=k.gerar; guiaSolic.textContent=k.solic; guiaGerada.textContent=k.gerada; guiaPaga.textContent=k.paga; guiaAtrasada.textContent=k.atrasada;}
  let linhas = stF ? base.filter(l=>l.status===stF) : base;
  const colComp = todas ? '<th>Competência</th>' : '';
  tabGuias.innerHTML='<thead><tr>'+colComp+'<th>Empresa</th><th>Tipo de guia</th><th>Status</th><th>Data de envio</th><th>Data de cobrança</th></tr></thead><tbody>'+(linhas.length?linhas.map(l=>{
    const cJs=esc(l.comp); const eJs=esc(l.empCod).replaceAll("'","&#39;"); const tJs=esc(l.tipo).replaceAll("'","&#39;");
    const sel='<select onchange="guiaSetStatus(\''+cJs+'\',\''+eJs+'\',\''+tJs+'\',this.value)">'+GUIA_STATUS.map(o=>'<option '+(o===l.status?'selected':'')+'>'+o+'</option>').join('')+'</select>';
    const cCell = todas ? '<td>'+esc(fmtComp(l.comp))+'</td>' : '';
    const ov = guiaAcessoEfetivo(l.tipo,l.empCod).fonte==='empresa';
    const mk = ov?' <span class="badge teal" style="font-size:10px;padding:2px 6px" title="Informações de acesso específicas desta empresa">específico</span>':'';
    return '<tr>'+cCell+'<td>'+esc(guiaNomeEmp(l.empCod))+'</td><td><b class="link-btn" style="text-decoration:none;cursor:pointer" title="Ver/editar dados da guia" onclick="abrirGuiaTipo(\''+tJs+'\',\''+eJs+'\')">'+esc(l.tipo)+'</b>'+mk+'</td><td><span class="badge '+guiaStatusClass(l.status)+'" style="margin-bottom:4px">'+esc(l.status)+'</span><br>'+sel+'</td><td><input type="date" value="'+esc(l.dataEnvio||'')+'" onchange="guiaSetData(\''+cJs+'\',\''+eJs+'\',\''+tJs+'\',\'dataEnvio\',this.value)"></td><td><input type="date" value="'+esc(l.dataCobranca||'')+'" onchange="guiaSetData(\''+cJs+'\',\''+eJs+'\',\''+tJs+'\',\'dataCobranca\',this.value)"></td></tr>';
  }).join(''):'<tr><td colspan="'+(todas?6:5)+'" class="muted">Nenhuma guia para o filtro atual.</td></tr>')+'</tbody>';
}
function gerarPDFGuiasGerar(){
  const todas=guiasTodas(); const c=guiasComp(); const empF=document.getElementById('guiasEmpFiltro')?.value||'';
  let base = todas ? guiaLinhasTodas() : guiaLinhasComp(c);
  if(empF)base=base.filter(l=>String(l.empCod)===String(empF));
  base=base.filter(l=>l.status==='A gerar');
  const headers = todas?['Competência','Empresa','Tipo de guia']:['Empresa','Tipo de guia'];
  const rows=base.map(l=> todas?[fmtComp(l.comp),guiaNomeEmp(l.empCod),l.tipo]:[guiaNomeEmp(l.empCod),l.tipo]);
  const titulo = todas?'Guias a gerar — todas as competências':'Guias a gerar — '+fmtComp(c);
  abrirPDFModuloTeste(titulo,'Guias com status "A gerar"','Período: '+(todas?'Todas as competências':fmtComp(c))+' | Empresa: '+(empF?guiaNomeEmp(empF):'Todas'),headers,rows);
}
function gerarPDFGuiasSituacao(){
  const todas=guiasTodas(); const c=guiasComp(); const empF=document.getElementById('guiasEmpFiltro')?.value||''; const stF=document.getElementById('guiasStatusFiltro')?.value||'';
  let base = todas ? guiaLinhasTodas() : guiaLinhasComp(c);
  if(empF)base=base.filter(l=>String(l.empCod)===String(empF));
  if(stF)base=base.filter(l=>l.status===stF);
  const headers = todas?['Competência','Empresa','Tipo de guia','Status','Data de envio','Data de cobrança']:['Empresa','Tipo de guia','Status','Data de envio','Data de cobrança'];
  const rows=base.map(l=>{const b=[guiaNomeEmp(l.empCod),l.tipo,l.status,fmtDataBR(l.dataEnvio)||'-',fmtDataBR(l.dataCobranca)||'-']; return todas?[fmtComp(l.comp)].concat(b):b;});
  const titulo= todas?'Situação das guias — todas as competências':'Situação das guias — '+fmtComp(c);
  abrirPDFModuloTeste(titulo,'Status das guias por empresa','Período: '+(todas?'Todas as competências':fmtComp(c))+' | Empresa: '+(empF?guiaNomeEmp(empF):'Todas')+' | Status: '+(stF||'Todos'),headers,rows);
}
