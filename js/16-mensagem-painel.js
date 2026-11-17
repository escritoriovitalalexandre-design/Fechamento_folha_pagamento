const PAINEL_MSG_DEFAULT=`Karina e Natália,
Cada etapa que vocês estão ajudando a construir faz diferença. O esforço, a atenção aos detalhes e a dedicação de vocês tornam esse projeto mais forte a cada dia.

Continuem firmes, com foco e confiança. Grandes resultados nascem de pequenas melhorias feitas com carinho, responsabilidade e vontade de fazer dar certo.

Vocês são parte importante dessa evolução. Vamos juntos!`
function painelMsgLoad(){const v=document.getElementById("painelMsgView");if(!v)return;sbGet(SB_CHAVE_PAINEL).then(txt=>{v.textContent=txt||localStorage.getItem("painelMsg")||PAINEL_MSG_DEFAULT}).catch(()=>{v.textContent=localStorage.getItem("painelMsg")||PAINEL_MSG_DEFAULT})}
function painelMsgEditar(){const txt=document.getElementById("painelMsgView").textContent||PAINEL_MSG_DEFAULT;document.getElementById("painelMsgTxt").value=txt;document.getElementById("painelMsgView").style.display="none";document.getElementById("painelMsgEdit").style.display="block"}
function painelMsgCancelar(){document.getElementById("painelMsgView").style.display="block";document.getElementById("painelMsgEdit").style.display="none"}
function painelMsgSalvar(){const txt=document.getElementById("painelMsgTxt").value;localStorage.setItem("painelMsg",txt);sbSet(SB_CHAVE_PAINEL,txt);document.getElementById("painelMsgView").textContent=txt;painelMsgCancelar()}



