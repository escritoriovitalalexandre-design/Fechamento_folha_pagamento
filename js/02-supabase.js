// ========== SUPABASE CONFIG ==========
// URL e chave PÚBLICA do projeto (pode ficar no código: sem login, o RLS não libera nada).
// Nunca coloque aqui a chave "secret" / service_role.
const SB_URL = "https://gxltcyiyoclmaqsulfir.supabase.co";
const SB_PUBLISHABLE_KEY = "sb_publishable_9516gbfWQAdwIYB0jPCBGg_MLJMgJa1";
const SB_TABLE = "dados_app";
const SB_CHAVE_STATE = "folha_state";
const SB_CHAVE_PAINEL = "folha_painelMsg";
const SB_BUCKET = "anexos-folha"; // bucket do Supabase Storage p/ arquivos anexados (evita inchar o estado)
let sbClient = null;
let leituraInicialOk = false;
let versaoNuvemEstado = null; // "atualizado_em" da versão do estado que este navegador leu/gravou por último

// ========== VERSÕES AUTOMÁTICAS (tabela dados_app_historico) ==========
async function carregarVersoes(){
  const info = document.getElementById("versoesInfo");
  const tab = document.getElementById("tabVersoes");
  if(!sbClient){ info.textContent = "Supabase não conectado."; return; }
  info.textContent = "Carregando...";
  const {data, error} = await sbClient.from("dados_app_historico")
    .select("id, criado_em, versao_de, substituida_por")
    .eq("chave", SB_CHAVE_STATE).order("criado_em", {ascending: false}).limit(200);
  if(error){ info.textContent = "Não consegui carregar as versões: " + error.message; tab.innerHTML = ""; return; }
  const fmt = (d)=> d ? new Date(d).toLocaleString("pt-BR") : "—";
  info.textContent = data.length ? data.length + " versão(ões) guardada(s)." : "Nenhuma versão guardada ainda.";
  tab.innerHTML = data.length ? "<thead><tr><th>Versão de</th><th>Guardada em</th><th>Substituída por</th><th></th></tr></thead><tbody>"
    + data.map(v=>`<tr><td>${esc(fmt(v.versao_de))}</td><td>${esc(fmt(v.criado_em))}</td><td>${esc(v.substituida_por||"—")}</td><td><button class="btn small out" onclick="baixarVersao(${Number(v.id)})">⬇️ Baixar</button></td></tr>`).join("")
    + "</tbody>" : "";
}
async function baixarVersao(id){
  const {data, error} = await sbClient.from("dados_app_historico").select("dados, versao_de").eq("id", id).single();
  if(error || !data){ aviso("Não consegui baixar esta versão: " + (error?.message || "não encontrada")); return; }
  const d = new Date(data.versao_de || Date.now());
  const nome = "versao-folha-" + d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0")
    + "_" + String(d.getHours()).padStart(2,"0") + "h" + String(d.getMinutes()).padStart(2,"0") + ".json";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data.dados, null, 2)], {type: "application/json"}));
  a.download = nome; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

// Outra pessoa gravou depois que este navegador leu os dados.
function tratarConflitoGravacao(){
  modoSomenteLeitura = true;
  if(_lockTimer) clearInterval(_lockTimer);
  showSync("error", "NÃO salvou (conflito)");
  setConexao(false);
  const baixar = confirm("⚠️ Outra pessoa salvou alterações no sistema depois que você abriu esta tela.\n\n"
    + "Sua última alteração NÃO foi gravada, para não apagar o trabalho dela.\n\n"
    + "OK = baixar um arquivo com as SUAS alterações e recarregar a versão mais nova (depois refaça o que faltar).\n"
    + "Cancelar = continuar olhando esta tela em modo somente leitura.");
  if(baixar){ downloadBackup(); setTimeout(()=>location.reload(), 1200); }
  else mostrarBarraSomenteLeitura();
}
// ===== Trava de presença (aviso de "sistema em uso") =====
const SB_CHAVE_LOCK = "folha_lock";
const LOCK_JANELA_MS = 60000;   // considera "em uso" se o sinal for dos últimos 60s
const LOCK_PING_MS = 30000;     // atualiza o sinal de vida a cada 30s
const MINHA_SESSAO = "s" + Date.now() + "-" + Math.floor(Math.random()*1e6);
let modoSomenteLeitura = false;
let _lockTimer = null;
let avisoFalhaSupabase = false; // evita repetir o pop-up a cada tentativa de salvar

function getSBConfig(){
  return {url: SB_URL, anon: SB_PUBLISHABLE_KEY};
}

function showSync(tipo, msg){
  const el = document.getElementById("syncIndicator");
  const dot = document.getElementById("sbDot");
  if(!el) return;

  // Corrige o aviso visual para aparecer novamente a cada salvamento.
  // Antes, após o primeiro "Salvo ✓", o indicador podia ficar preso em display:none.
  el.style.display = "block";
  el.style.opacity = "1";
  el.style.animation = "none";

  // Força o navegador a reiniciar a animação do aviso.
  void el.offsetWidth;
  el.style.animation = "";

  el.className = "sync-indicator " + tipo;
  el.textContent = msg || "";

  if(tipo === "saved"){
    setTimeout(()=> {
      el.style.display = "none";
    }, 2200);

    if(dot) dot.style.background = "#22c55e";
  } else if(tipo === "saving"){
    if(dot) dot.style.background = "#f59e0b";
  } else if(tipo === "error"){
    if(dot) dot.style.background = "#dc2626";
  }
}

function setConexao(ok){
  const dot = document.getElementById("sbDot");
  const txt = document.getElementById("sbDotText");
  if(dot) dot.style.background = ok ? "#22c55e" : "#dc2626";
  if(txt){
    txt.textContent = ok ? "Supabase conectado" : "SEM gravação — verifique";
    txt.style.color = ok ? "rgba(255,255,255,.75)" : "#fca5a5";
  }
}

async function testarConexao(){
  if(!sbClient){ setConexao(false); return false; }
  try{
    const {error} = await sbClient.from(SB_TABLE).select("chave").limit(1);
    const ok = !error;
    setConexao(ok);
    return ok;
  }catch(e){ setConexao(false); return false; }
}

async function lerLock(){
  if(!sbClient) return null;
  try{
    const {data, error} = await sbClient.from(SB_TABLE).select("dados").eq("chave", SB_CHAVE_LOCK).maybeSingle();
    if(error) return null;
    return data?.dados || null;
  }catch(e){ return null; }
}
async function gravarLock(){
  if(!sbClient || modoSomenteLeitura) return;
  try{
    await sbClient.from(SB_TABLE).upsert({chave: SB_CHAVE_LOCK, dados: {sessao: MINHA_SESSAO, ping: Date.now()}}, {onConflict: "chave"});
  }catch(e){}
}
function iniciarHeartbeat(){
  if(_lockTimer) clearInterval(_lockTimer);
  _lockTimer = setInterval(gravarLock, LOCK_PING_MS);
}
function mostrarBarraSomenteLeitura(){
  if(document.getElementById("barraLeitura")) return;
  const bar = document.createElement("div");
  bar.id = "barraLeitura";
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:100000;background:#b91c1c;color:#fff;padding:10px 16px;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;gap:14px;box-shadow:0 3px 10px rgba(0,0,0,.25)";
  bar.innerHTML = '🔒 MODO SOMENTE LEITURA — o sistema já está sendo usado em outro navegador. Suas alterações NÃO serão salvas. <button onclick="location.reload()" style="background:#fff;color:#b91c1c;border:0;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer">Tentar novamente</button>';
  document.body.appendChild(bar);
  document.body.style.paddingTop = "46px";
}
async function verificarPresenca(){
  if(!sbClient) return;
  const lock = await lerLock();
  const agora = Date.now();
  const emUso = lock && lock.sessao && lock.sessao !== MINHA_SESSAO && (agora - (lock.ping||0)) < LOCK_JANELA_MS;
  if(emUso){
    // Já tem alguém usando: entra somente leitura e bloqueia gravação.
    modoSomenteLeitura = true;
    mostrarBarraSomenteLeitura();
    return;
  }
  // Livre: assume o controle e passa a emitir o sinal de vida.
  modoSomenteLeitura = false;
  await gravarLock();
  iniciarHeartbeat();
}

// ========== ANEXOS PRIVADOS ==========
// O bucket deixa de ser público. Os links salvos no estado continuam no formato
// ".../storage/v1/object/public/anexos-folha/<arquivo>"; ao clicar, trocamos por
// um link assinado que vale 5 minutos e só é gerado para quem está logado.
const PREFIXO_ANEXO_PUBLICO = "/storage/v1/object/public/" + SB_BUCKET + "/";
document.addEventListener("click", async (ev)=>{
  const a = ev.target.closest && ev.target.closest("a[href]");
  if(!a || !sbClient) return;
  const href = a.getAttribute("href") || "";
  const i = href.indexOf(PREFIXO_ANEXO_PUBLICO);
  if(i < 0) return;
  ev.preventDefault();
  const caminho = decodeURIComponent(href.slice(i + PREFIXO_ANEXO_PUBLICO.length).split("?")[0]);
  const baixar = a.hasAttribute("download") ? (a.getAttribute("download") || true) : false;
  const janela = window.open("", "_blank"); // abre já no clique para o navegador não bloquear
  const {data, error} = await sbClient.storage.from(SB_BUCKET).createSignedUrl(caminho, 300, baixar ? {download: baixar} : undefined);
  if(error || !data?.signedUrl){
    if(janela) janela.close();
    aviso("Não consegui abrir o anexo: " + (error?.message || "link indisponível") + ".\n\nVerifique se você está logado.");
    return;
  }
  if(janela) janela.location.href = data.signedUrl; else location.href = data.signedUrl;
}, true);

async function sbGet(chave){
  if(!sbClient) return null;
  try{
    const {data, error} = await sbClient.from(SB_TABLE).select("dados").eq("chave", chave).single();
    if(error && error.code !== "PGRST116") return null; // PGRST116 = not found
    return data?.dados || null;
  }catch(e){ return null; }
}

function avisarFalhaSalvamento(motivo){
  // Pop-up de aviso. Aparece só uma vez por episódio de falha (não repete a cada tentativa).
  if(avisoFalhaSupabase)return;
  avisoFalhaSupabase=true;
  aviso("⚠️ ATENÇÃO — sua última alteração NÃO foi salva no Supabase.\n\nMotivo: "+motivo+"\n\nExiste uma cópia local de segurança neste navegador, mas não confie só nela. Assim que a conexão/permissão voltar, faça uma alteração e espere aparecer o \"Salvo ✓\" verde e a bolinha verde \"Supabase conectado\".");
}
async function sbSet(chave, dados){
  if(!sbClient){
    setConexao(false);
    showSync("error", "Supabase não conectado");
    avisarFalhaSalvamento("O Supabase não está conectado.");
    return false;
  }
  try{
    showSync("saving", "Salvando...");
    // .select() faz o Supabase DEVOLVER a linha realmente gravada.
    // Sem isso, um bloqueio de permissão (RLS) pode "não dar erro" e mesmo
    // assim não gravar nada — era o que fazia aparecer "Salvo" sem salvar.
    // Para o estado principal, só grava se a nuvem ainda estiver na versão que
    // este navegador leu; se outra pessoa gravou antes, não apaga o trabalho dela.
    const comVersao = chave === SB_CHAVE_STATE && !!versaoNuvemEstado;
    const {data, error} = comVersao
      ? await sbClient.from(SB_TABLE).update({dados}).eq("chave", chave).eq("atualizado_em", versaoNuvemEstado).select("chave, atualizado_em")
      : await sbClient.from(SB_TABLE).upsert({chave, dados}, {onConflict: "chave"}).select("chave, atualizado_em");
    if(error) throw error;
    if((!data || data.length === 0) && comVersao){
      const {data: atual} = await sbClient.from(SB_TABLE).select("atualizado_em").eq("chave", chave).maybeSingle();
      if(atual && atual.atualizado_em !== versaoNuvemEstado){
        tratarConflitoGravacao();
        return false;
      }
    }
    if(!data || data.length === 0){
      // Sem erro, porém 0 linhas gravadas: quase sempre RLS bloqueando o anon.
      showSync("error", "NÃO salvou (permissão)");
      setConexao(false);
      console.error("Upsert retornou 0 linhas para a chave '" + chave + "'. Verifique as políticas RLS/constraint da tabela " + SB_TABLE + ".");
      avisarFalhaSalvamento("A gravação foi bloqueada por permissão (RLS) da tabela do Supabase.");
      return false;
    }
    if(chave === SB_CHAVE_STATE) versaoNuvemEstado = data[0].atualizado_em;
    showSync("saved", "Salvo ✓");
    setConexao(true);
    avisoFalhaSupabase=false; // salvou de novo: libera o aviso para uma futura falha
    return true;
  }catch(e){
    showSync("error", "Erro ao salvar");
    setConexao(false);
    console.error("Supabase save error:", e);
    avisarFalhaSalvamento("O Supabase pode estar fora do ar ou sem internet.");
    return false;
  }
}

// ========== UPLOAD DE ANEXOS (Supabase Storage) ==========
// NOVO (v6.1): anexos passam a ir para o Storage em vez de virar base64 dentro do
// estado. Isso evita estourar o localStorage e evita o upsert de "dados_app" falhar
// (erro 500) quando o JSON do estado fica grande demais com muitos anexos.
// Anexos antigos (salvos como base64 em a.dataUrl) continuam funcionando normalmente;
// só os NOVOS uploads passam a usar a.url.
async function uploadAnexoStorage(file, tipo){
  if(!sbClient){
    avisarFalhaSalvamento("O Supabase não está conectado (não foi possível enviar o anexo).");
    return null;
  }
  try{
    const nomeSeguro = Date.now()+"_"+Math.floor(Math.random()*1e6)+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const {error: upErr} = await sbClient.storage.from(SB_BUCKET).upload(nomeSeguro, file, {upsert:false});
    if(upErr) throw upErr;
    const {data: pub} = sbClient.storage.from(SB_BUCKET).getPublicUrl(nomeSeguro);
    return {id: Date.now()+Math.random(), tipo: tipo||"Documento", nome: file.name, tamanho: file.size, url: pub?.publicUrl||"", path: nomeSeguro, criadoEm: new Date().toISOString()};
  }catch(e){
    console.error("Falha ao enviar anexo para o Storage:", e);
    aviso("⚠️ Não consegui enviar o arquivo \""+file.name+"\" para o Supabase Storage.\n\nMotivo: "+(e?.message||e)+"\n\nVerifique se o bucket \""+SB_BUCKET+"\" existe e se há política de acesso (policy) para o anon. O anexo NÃO foi salvo.");
    return null;
  }
}
function anexoLink(a){ return a && (a.url || a.dataUrl) || "#" }

// ========== MIGRAÇÃO DE ANEXOS ANTIGOS (base64 -> Storage) ==========
// Anexos salvos ANTES da v3.2 ficaram gravados como base64 dentro do estado
// (campo a.dataUrl). Isso continua funcionando, mas mantém o estado pesado e
// pode voltar a travar o salvamento. Esta função reenvia esses anexos antigos
// para o Storage e troca dataUrl por url, sem apagar nada caso algo falhe.
async function dataUrlParaBlob(dataUrl){
  const resp = await fetch(dataUrl);
  return await resp.blob();
}
async function migrarAnexoObjeto(a){
  if(!a || !a.dataUrl || a.url) return a; // vazio ou já migrado
  try{
    const blob = await dataUrlParaBlob(a.dataUrl);
    const nomeSeguro = Date.now()+"_"+Math.floor(Math.random()*1e6)+"_"+String(a.nome||"arquivo").replace(/[^a-zA-Z0-9._-]/g,"_");
    const {error: upErr} = await sbClient.storage.from(SB_BUCKET).upload(nomeSeguro, blob, {upsert:false, contentType: blob.type||undefined});
    if(upErr) throw upErr;
    const {data: pub} = sbClient.storage.from(SB_BUCKET).getPublicUrl(nomeSeguro);
    return {id:a.id||(Date.now()+Math.random()), tipo:a.tipo, nome:a.nome, tamanho:a.tamanho, url: pub?.publicUrl||"", path: nomeSeguro, criadoEm: a.criadoEm||new Date().toISOString()};
  }catch(e){
    console.error("Falha ao migrar anexo antigo:", a?.nome, e);
    return a; // mantém como estava — nada é perdido
  }
}
async function migrarAnexosAntigos(){
  if(!sbClient){ aviso("Conecte ao Supabase primeiro (verifique a bolinha de conexão)."); return; }
  if(!confirm("Isso vai reenviar para o Supabase Storage os documentos anexados ANTES da atualização (v3.2). Nada é apagado; se algum arquivo falhar, ele continua como está. Pode demorar alguns minutos dependendo da quantidade de anexos. Continuar?")) return;
  const info = document.getElementById("migracaoAnexosInfo");
  if(info) info.textContent = "Migrando, aguarde...";
  let total=0, ok=0;
  for(const s of (state.sindicatos||[])){
    if(Array.isArray(s.anexos)){
      for(let i=0;i<s.anexos.length;i++){
        if(s.anexos[i] && s.anexos[i].dataUrl && !s.anexos[i].url){
          total++; s.anexos[i]=await migrarAnexoObjeto(s.anexos[i]); if(s.anexos[i].url) ok++;
          if(info) info.textContent = "Migrando... "+ok+" de "+total+" concluídos";
        }
      }
    }
    if(s.anexoLiberacao && s.anexoLiberacao.dataUrl && !s.anexoLiberacao.url){
      total++; s.anexoLiberacao = await migrarAnexoObjeto(s.anexoLiberacao); if(s.anexoLiberacao.url) ok++;
    }
  }
  const g = guiasState();
  if(Array.isArray(g.tipos)){
    for(const t of g.tipos){
      if(t.anexo && t.anexo.dataUrl && !t.anexo.url){
        total++; t.anexo = await migrarAnexoObjeto(t.anexo); if(t.anexo.url) ok++;
      }
    }
  }
  // NOVO: acesso ESPECÍFICO por empresa (t.acesso.anexo dentro de guias.empresas[].guias[])
  // — estrutura separada do anexo "padrão" do tipo de guia, descoberta em jul/2026.
  if(Array.isArray(g.empresas)){
    for(const e of g.empresas){
      if(Array.isArray(e.guias)){
        for(const x of e.guias){
          if(x.acesso && x.acesso.anexo && x.acesso.anexo.dataUrl && !x.acesso.anexo.url){
            total++; x.acesso.anexo = await migrarAnexoObjeto(x.acesso.anexo); if(x.acesso.anexo.url) ok++;
            if(info) info.textContent = "Migrando... "+ok+" de "+total+" concluídos";
          }
        }
      }
    }
  }
  if(total===0){
    if(info) info.textContent = "Nenhum anexo antigo encontrado — já está tudo migrado.";
    aviso("Não encontrei anexos antigos (em base64) para migrar. Já está tudo certo.");
    return;
  }
  saved();
  const msg = "Migração concluída: "+ok+" de "+total+" anexo(s) movidos para o Storage.";
  if(info) info.textContent = msg + (ok<total?" Os que falharam continuam funcionando normalmente; você pode rodar de novo depois.":"");
  aviso(msg+(ok<total?"\n\nOs que falharam (falha de conexão) continuam funcionando como estavam — pode rodar a migração de novo depois.":"\n\nO estado ficou mais leve; o salvamento deve voltar ao normal."));
}


