// ========== AVISOS, CONFIRMAÇÕES E PERGUNTAS NA TELA ==========
// Substituem alert(), confirm() e prompt() do navegador por janelas do sistema.
//   await aviso(msg)                 -> só OK
//   await confirmar(msg)             -> true (OK) ou false (Cancelar/Esc)
//   await perguntar(msg, padrao)     -> texto digitado, ou null se cancelar
// Diferente das janelas do navegador, elas NÃO travam a página: quem chama
// precisa usar "await" (dentro de uma função async) para esperar a resposta.
// Várias janelas seguidas aparecem uma depois da outra, na ordem.
const _filaDialogos = [];
let _dialogoAberto = false;

function aviso(mensagem){ return _enfileirarDialogo("aviso", mensagem); }
function confirmar(mensagem){ return _enfileirarDialogo("confirmar", mensagem); }
function perguntar(mensagem, padrao){ return _enfileirarDialogo("perguntar", mensagem, padrao); }

function _enfileirarDialogo(tipo, mensagem, padrao){
  return new Promise(resolve => {
    _filaDialogos.push({tipo, mensagem: String(mensagem ?? ""), padrao: padrao == null ? "" : String(padrao), resolve});
    if(!_dialogoAberto) _mostrarProximoDialogo();
  });
}

function _mostrarProximoDialogo(){
  const item = _filaDialogos.shift();
  if(!item){ _dialogoAberto = false; return; }
  _dialogoAberto = true;

  const fundo = document.createElement("div");
  fundo.className = "aviso-fundo";
  const caixa = document.createElement("div");
  caixa.className = "aviso-caixa" + (/^\s*⚠️/.test(item.mensagem) ? " aviso-alerta" : "");
  caixa.setAttribute("role", item.tipo === "aviso" ? "alertdialog" : "dialog");
  caixa.setAttribute("aria-modal", "true");

  const texto = document.createElement("div");
  texto.className = "aviso-texto";
  texto.textContent = item.mensagem;            // texto puro: nunca interpreta HTML
  caixa.append(texto);

  let campo = null;
  if(item.tipo === "perguntar"){
    campo = document.createElement("input");
    campo.className = "aviso-campo";
    campo.type = "text";
    campo.value = item.padrao;
    caixa.append(campo);
  }

  const botoes = document.createElement("div");
  botoes.className = "aviso-botoes";
  let cancelar = null;
  if(item.tipo !== "aviso"){
    cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "btn out";
    cancelar.textContent = "Cancelar";
    botoes.append(cancelar);
  }
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "btn pri aviso-ok";
  ok.textContent = "OK";
  botoes.append(ok);
  caixa.append(botoes);
  fundo.append(caixa);

  const anterior = document.activeElement;
  const fechar = (confirmou) => {
    document.removeEventListener("keydown", teclas, true);
    fundo.remove();
    if(anterior && anterior.focus) try{ anterior.focus(); }catch(e){}
    if(item.tipo === "aviso") item.resolve();
    else if(item.tipo === "confirmar") item.resolve(!!confirmou);
    else item.resolve(confirmou ? campo.value : null);
    _mostrarProximoDialogo();
  };
  const teclas = (ev) => {
    if(ev.key === "Enter"){ ev.preventDefault(); ev.stopPropagation(); fechar(true); }
    else if(ev.key === "Escape"){ ev.preventDefault(); ev.stopPropagation(); fechar(item.tipo === "aviso"); }
    else if(ev.key === "Tab"){
      // mantém o foco dentro da janela
      const foco = [campo, cancelar, ok].filter(Boolean);
      const i = foco.indexOf(document.activeElement);
      ev.preventDefault();
      foco[(i + (ev.shiftKey ? foco.length - 1 : 1)) % foco.length].focus();
    }
  };
  ok.addEventListener("click", () => fechar(true));
  if(cancelar) cancelar.addEventListener("click", () => fechar(false));
  document.addEventListener("keydown", teclas, true);
  (document.body || document.documentElement).append(fundo);
  if(campo){ campo.focus(); campo.select(); } else ok.focus();
}
