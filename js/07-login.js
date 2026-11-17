async function init(){
  const cfg = getSBConfig();
  if(!window.supabase){
    aviso("Não consegui carregar a biblioteca do Supabase. Verifique a internet e recarregue a página (F5).");
    return;
  }
  sbClient = window.supabase.createClient(cfg.url, cfg.anon);
  // Se a sessão expirar ou alguém clicar em "Sair" em outra aba, volta para o login.
  sbClient.auth.onAuthStateChange((evento)=>{ if(evento === "SIGNED_OUT") location.reload(); });
  const {data} = await sbClient.auth.getSession();
  if(!data?.session){ mostrarLogin(); return; }
  await iniciarSeAutorizado();
}

function mostrarLogin(msg){
  document.getElementById("tela-setup").classList.add("open");
  const st = document.getElementById("setupStatus");
  st.className = "setup-status" + (msg ? " err" : "");
  st.textContent = msg || "";
}

async function entrar(){
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;
  const st = document.getElementById("setupStatus");
  const btn = document.getElementById("loginBtn");
  btn.disabled = true; st.className = "setup-status"; st.textContent = "Entrando...";
  const {error} = await sbClient.auth.signInWithPassword({email, password: senha});
  btn.disabled = false;
  if(error){
    st.className = "setup-status err";
    st.textContent = /invalid/i.test(error.message) ? "E-mail ou senha incorretos." : "Não foi possível entrar: " + error.message;
    return;
  }
  document.getElementById("loginSenha").value = "";
  await iniciarSeAutorizado();
}

// Só abre o sistema para e-mails cadastrados na tabela "equipe" do Supabase.
async function iniciarSeAutorizado(){
  const {data: autorizado, error} = await sbClient.rpc("is_equipe");
  if(error || autorizado !== true){
    const {data} = await sbClient.auth.getUser();
    await sbClient.auth.signOut({scope: "local"});
    mostrarLogin(error
      ? "Não consegui verificar sua permissão agora. Tente de novo em instantes."
      : "O e-mail " + (data?.user?.email || "") + " não está autorizado. Peça ao escritório para incluí-lo na equipe.");
    return;
  }
  document.getElementById("tela-setup").classList.remove("open");
  const quem = document.getElementById("sbUsuario");
  if(quem){ const {data} = await sbClient.auth.getUser(); quem.textContent = data?.user?.email || ""; }
  iniciarApp();
}

async function sair(){
  if(!await confirmar("Deseja sair do sistema neste navegador?")) return;
  try{ if(!modoSomenteLeitura) await sbClient.from(SB_TABLE).delete().eq("chave", SB_CHAVE_LOCK); }catch(e){}
  await sbClient.auth.signOut({scope: "local"});
  location.reload();
}

async function iniciarApp(){
  await testarConexao();
  // Carrega do Supabase
  state = await loadFromSupabase();
  // Verifica se já tem alguém usando (trava de presença)
  await verificarPresenca();
  // Limpa eventos sem cadastro
  setTimeout(()=>{ if(typeof limparEventosSemCadastro==="function" && limparEventosSemCadastro(false)>0) save(); },0);
  // Setup da UI
  document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>show(b.dataset.sec));
  // FIX v2.4b: competência inicial = mês atual, não o mês do SEED
  const hoje=new Date()
  const compAtual=hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0")
  comp1.value=compAtual; comp2.value=compAtual;
  const rc=document.getElementById("regraComp"); if(rc)rc.value=compAtual;
  comp1.onchange=()=>{comp2.value=comp1.value;renderAll()};
  comp2.onchange=()=>{comp1.value=comp2.value;renderAll()};
  emp1.onchange=()=>{emp2.value=emp1.value;renderAll()};
  emp2.onchange=()=>{emp1.value=emp2.value;renderAll()};
  popularEmpresas(); facRenderLinhas(); renderAll();
}
