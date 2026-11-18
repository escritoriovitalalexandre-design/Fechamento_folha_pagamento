// ========== ATUALIZAÇÃO AUTOMÁTICA ==========
// O GitHub Pages deixa o navegador guardar a página por até 10 minutos. Para ninguém
// ficar usando uma versão velha depois de uma publicação:
//  - ao abrir, compara a versão desta página (<meta name="versao-sistema">) com a
//    publicada; se mudou, recarrega uma vez sozinho (antes do login, nada se perde);
//  - com o sistema aberto, confere a cada 5 minutos e, se houver versão nova, mostra
//    uma faixa com o botão "Atualizar agora" (não recarrega sozinho para não perder
//    algo que esteja sendo digitado).
(function(){
  const meta = document.querySelector('meta[name="versao-sistema"]');
  const minhaVersao = meta && meta.content;
  if(!minhaVersao || location.protocol === "file:") return;

  async function versaoPublicada(){
    try{
      const r = await fetch(location.pathname + "?verificar-versao=" + Date.now(), {cache: "no-store"});
      if(!r.ok) return null;
      const m = (await r.text()).match(/<meta name="versao-sistema" content="([^"]+)"/);
      return m ? m[1] : null;
    }catch(e){ return null; }
  }

  function mostrarFaixa(){
    if(document.getElementById("faixaVersaoNova")) return;
    const faixa = document.createElement("div");
    faixa.id = "faixaVersaoNova";
    faixa.className = "faixa-versao-nova";
    faixa.innerHTML = '🔄 Saiu uma versão nova do sistema. <button type="button" class="btn small">Atualizar agora</button>';
    faixa.querySelector("button").onclick = () => location.reload();
    if(document.body) document.body.appendChild(faixa);
    else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(faixa));
  }

  // Ao abrir
  versaoPublicada().then(v => {
    if(!v || v === minhaVersao){ try{ sessionStorage.removeItem("folha_recarregou_para"); }catch(e){} return; }
    let jaTentou = null;
    try{ jaTentou = sessionStorage.getItem("folha_recarregou_para"); }catch(e){}
    if(jaTentou === v){ mostrarFaixa(); return; }   // já recarregou e ainda veio a velha: só avisa
    try{ sessionStorage.setItem("folha_recarregou_para", v); }catch(e){}
    location.reload();
  });

  // Com o sistema aberto
  setInterval(async () => {
    const v = await versaoPublicada();
    if(v && v !== minhaVersao) mostrarFaixa();
  }, 5 * 60 * 1000);
})();
