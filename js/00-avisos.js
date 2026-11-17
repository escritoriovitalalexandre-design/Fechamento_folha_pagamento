// ========== AVISOS NA TELA ==========
// Substitui o alert() do navegador por uma janela do próprio sistema.
// aviso(msg) não trava a página; devolve uma Promise que termina quando a
// pessoa clica em OK (útil para "await aviso(...)"). Vários avisos seguidos
// aparecem um depois do outro, na ordem.
const _filaAvisos = [];
let _avisoAberto = false;

function aviso(mensagem){
  return new Promise(resolve => {
    _filaAvisos.push({mensagem: String(mensagem ?? ""), resolve});
    if(!_avisoAberto) _mostrarProximoAviso();
  });
}

function _mostrarProximoAviso(){
  const item = _filaAvisos.shift();
  if(!item){ _avisoAberto = false; return; }
  _avisoAberto = true;
  const fundo = document.createElement("div");
  fundo.className = "aviso-fundo";
  const caixa = document.createElement("div");
  caixa.className = "aviso-caixa" + (/^\s*⚠️/.test(item.mensagem) ? " aviso-alerta" : "");
  caixa.setAttribute("role", "alertdialog");
  caixa.setAttribute("aria-modal", "true");
  const texto = document.createElement("div");
  texto.className = "aviso-texto";
  texto.textContent = item.mensagem;          // texto puro: nunca interpreta HTML
  const botao = document.createElement("button");
  botao.className = "btn pri aviso-ok";
  botao.type = "button";
  botao.textContent = "OK";
  caixa.append(texto, botao);
  fundo.append(caixa);
  const anterior = document.activeElement;
  const fechar = () => {
    document.removeEventListener("keydown", teclas, true);
    fundo.remove();
    if(anterior && anterior.focus) try{ anterior.focus(); }catch(e){}
    item.resolve();
    _mostrarProximoAviso();
  };
  const teclas = (ev) => {
    if(ev.key === "Enter" || ev.key === "Escape"){ ev.preventDefault(); ev.stopPropagation(); fechar(); }
  };
  botao.addEventListener("click", fechar);
  document.addEventListener("keydown", teclas, true);
  (document.body || document.documentElement).append(fundo);
  botao.focus();
}
