function facToggle(id){
  const el=document.getElementById(id)
  if(!el)return
  const open=el.style.display==="block"
  el.style.display=open?"none":"block"
  const chev=document.getElementById(id+"Chev")
  if(chev)chev.textContent=open?"▼":"▲"
  if(!open){
    if(id==="facJornada")fjRender()
    if(id==="facConv")facCalcConv()
    if(id==="facFicta")facCalcFicta()
    if(id==="facNot")facCalcNot()
    if(id==="facCalcH")facCalc()
  }
}
function facMinToHHMM(min){
  const neg=min<0;min=Math.abs(min)
  const h=Math.floor(min/60),m=Math.round(min%60)
  return (neg?"-":"")+(String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"))
}
function facHHMMToMin(s){
  s=String(s||"").trim()
  const m=s.match(/^(\d+):(\d{2})$/)
  if(!m)return NaN
  return parseInt(m[1])*60+parseInt(m[2])
}
function facTimeInputToMin(id){
  const v=document.getElementById(id)?.value||""
  return facHHMMToMin(v)
}

const FJ_DIAS_SEMANA=[
  {id:1,nome:"Segunda-feira"},
  {id:2,nome:"Terça-feira"},
  {id:3,nome:"Quarta-feira"},
  {id:4,nome:"Quinta-feira"},
  {id:5,nome:"Sexta-feira"},
  {id:6,nome:"Sábado"},
  {id:0,nome:"Domingo"}
]
let fjDados=FJ_DIAS_SEMANA.map(d=>({id:d.id,nome:d.nome,ent:"",salm:"",ret:"",sai:""}))

function facToggle(id){
  const el=document.getElementById(id)
  if(!el)return
  const open=el.style.display!=="none"
  el.style.display=open?"none":"block"
  const chev=document.getElementById(id+"Chev")
  if(chev)chev.textContent=open?"▼":"▲"
  if(!open){
    if(id==="facJornada")fjRender()
    if(id==="facConv")facCalcConv()
    if(id==="facFicta")facCalcFicta()
    if(id==="facNot")facCalcNot()
    if(id==="facCalcH")facRenderLinhas()
  }
}

function facMinToHHMM(min){
  const neg=min<0;min=Math.abs(Math.round(min))
  const h=Math.floor(min/60),m=min%60
  return (neg?"-":"")+(String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"))
}
function facHHMMToMin(s){
  s=String(s||"").trim()
  const m=s.match(/^(\d+):(\d{2})$/)
  if(!m)return NaN
  return parseInt(m[1])*60+parseInt(m[2])
}

function fjCopiarDeAcima(i){
  if(i===0)return
  const acima=fjDados[i-1]
  fjDados[i].ent=acima.ent
  fjDados[i].salm=acima.salm
  fjDados[i].ret=acima.ret
  fjDados[i].sai=acima.sai
  fjRender()
}
function fjRender(){
  const tbody=document.getElementById("fjTabBody")
  if(!tbody)return
  tbody.innerHTML=fjDados.map((d,i)=>`
    <tr style="border-bottom:0.5px solid var(--line);${i%2===1?'background:var(--bg2)':''}">
      <td style="padding:8px 14px;font-weight:500">${d.nome}</td>
      <td style="padding:5px 8px"><input type="time" value="${d.ent}" oninput="fjDados[${i}].ent=this.value;fjCalc()" style="font-size:13px"></td>
      <td style="padding:5px 8px"><input type="time" value="${d.salm}" oninput="fjDados[${i}].salm=this.value;fjCalc()" style="font-size:13px"></td>
      <td style="padding:5px 8px"><input type="time" value="${d.ret}" oninput="fjDados[${i}].ret=this.value;fjCalc()" style="font-size:13px"></td>
      <td style="padding:5px 8px"><input type="time" value="${d.sai}" oninput="fjDados[${i}].sai=this.value;fjCalc()" style="font-size:13px"></td>
      <td style="padding:5px 8px;font-weight:700;color:var(--pri);text-align:center" id="fjDiaTotal${i}">—</td>
      <td style="padding:5px 8px;white-space:nowrap">
        ${i>0?`<button class="btn small out" style="font-size:11px;background:#dbeafe;color:#1e40af;border-color:#93c5fd" onclick="fjCopiarDeAcima(${i})" title="Copiar horário da linha acima">↑ Igual</button> `:''}
        <button class="btn small out" style="font-size:11px" onclick="fjLimparDia(${i})">×</button>
      </td>
    </tr>
  `).join("")
  fjCalc()
}
function fjCalc(){
  const noturno=document.getElementById("fjNoturnoGlobal")?.checked
  let totalSem=0
  fjDados.forEach((d,i)=>{
    const el=document.getElementById("fjDiaTotal"+i)
    if(!d.ent||!d.sai){if(el)el.textContent="—";return}
    const entMin=facHHMMToMin(d.ent)
    const saiMin=facHHMMToMin(d.sai)
    const salmMin=d.salm?facHHMMToMin(d.salm):NaN
    const retMin=d.ret?facHHMMToMin(d.ret):NaN
    if(isNaN(entMin)||isNaN(saiMin)){if(el)el.textContent="—";return}
    const saiAdj=saiMin<entMin?saiMin+24*60:saiMin
    let trabMin, periodos
    if(!isNaN(salmMin)&&!isNaN(retMin)){
      const salmAdj=salmMin<entMin?salmMin+24*60:salmMin
      const retAdj=retMin<entMin?retMin+24*60:retMin
      trabMin=(salmAdj-entMin)+(saiAdj-retAdj)
      periodos=[[entMin,salmAdj],[retAdj,saiAdj]]
    }else{
      trabMin=saiAdj-entMin
      periodos=[[entMin,saiAdj]]
    }
    if(trabMin<0)trabMin=0
    let ficta=0
    if(noturno){
      let horasNot=0
      periodos.forEach(([s,e])=>{
        // horas entre meia-noite e 05:00
        const fim2=Math.min(e,5*60)
        if(s<5*60&&fim2>s)horasNot+=fim2-s
        // horas de 22:00 em diante
        const ini=Math.max(s,22*60)
        if(e>ini)horasNot+=e-ini
      })
      ficta=Math.round(horasNot/7)
    }
    const total=trabMin+ficta
    totalSem+=total
    if(el)el.textContent=facMinToHHMM(trabMin)+(ficta?" (+"+facMinToHHMM(ficta)+" ficta) = "+facMinToHHMM(total):"")
  })
  const ts=document.getElementById("fjTotalSem")
  if(ts)ts.textContent=totalSem>0?facMinToHHMM(totalSem):"—"
}
function fjLimparDia(i){
  fjDados[i].ent="";fjDados[i].salm="";fjDados[i].ret="";fjDados[i].sai=""
  fjRender()
}
function fjLimparTudo(){
  fjDados=FJ_DIAS_SEMANA.map(d=>({id:d.id,nome:d.nome,ent:"",salm:"",ret:"",sai:""}))
  fjRender()
}

let facOp="soma"
let facLinhas=["",""]
function facSetOp(op){
  facOp=op
  ;["soma","sub","mul","div"].forEach(o=>{
    const btn=document.getElementById("facOp"+o.charAt(0).toUpperCase()+o.slice(1))
    if(btn)btn.className=o===op?"btn small pri":"btn small out"
  })
  facLinhas=["",""]
  facRenderLinhas()
}
function facAddLinha(){facLinhas.push("");facRenderLinhas()}
function facLimparCalc(){facLinhas=["",""];facRenderLinhas();const r=document.getElementById("facCalcHRes");if(r)r.style.display="none"}
function facApplyMask(el,i){
  let v=el.value.replace(/\D/g,"").slice(0,4)
  if(v.length>=3)v=v.slice(0,v.length-2)+":"+v.slice(v.length-2)
  el.value=v
  facLinhas[i]=v
  facCalc()
}
function facRenderLinhas(){
  const box=document.getElementById("facCalcHLinhas")
  if(!box)return
  const isMulDiv=facOp==="mul"||facOp==="div"
  const opSym={"soma":"+","sub":"−","mul":"×","div":"÷"}[facOp]
  box.innerHTML=facLinhas.map((v,i)=>{
    const isFator=isMulDiv&&i>0
    if(isFator){
      return `<div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px;color:var(--muted);min-width:20px">${opSym}</span>
        <input type="number" value="${v}" placeholder="Ex: 3" style="width:110px;font-size:13px" oninput="facLinhas[${i}]=this.value;facCalc()">
        ${i>1?`<button class="btn small red" onclick="facLinhas.splice(${i},1);facRenderLinhas();facCalc()">×</button>`:""}
      </div>`
    }
    return `<div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:18px;color:var(--muted);min-width:20px">${i>0?opSym:""}</span>
      <input type="text" value="${v}" placeholder="HH:MM" style="width:110px;font-size:13px" oninput="facApplyMask(this,${i})">
      ${i>1?`<button class="btn small red" onclick="facLinhas.splice(${i},1);facRenderLinhas();facCalc()">×</button>`:""}
    </div>`
  }).join("")
}
function facCalc(){
  const isMulDiv=facOp==="mul"||facOp==="div"
  const vals=facLinhas.map((v,i)=>{
    if(isMulDiv&&i>0){const n=parseFloat(String(v).replace(",","."));return isNaN(n)?NaN:n}
    return facHHMMToMin(v)
  })
  if(vals.some(v=>isNaN(v)))return
  let result=vals[0]
  for(let i=1;i<vals.length;i++){
    if(facOp==="soma")result+=vals[i]
    else if(facOp==="sub")result-=vals[i]
    else if(facOp==="mul")result=Math.round(result*vals[i])
    else if(facOp==="div")result=vals[i]?Math.round(result/vals[i]):NaN
  }
  if(isNaN(result))return
  const r=document.getElementById("facCalcHRes");if(r)r.style.display="block"
  const rv=document.getElementById("facCalcHResVal");if(rv)rv.textContent=facMinToHHMM(result)
  const rl=document.getElementById("facCalcHResLabel")
  if(rl){
    const opSym={"soma":"+","sub":"−","mul":"×","div":"÷"}[facOp]
    rl.textContent=facLinhas.filter(v=>v!=="").join(" "+opSym+" ")+" = "+facMinToHHMM(result)
  }
}

function facCalcFicta(){
  const hh=parseInt(document.getElementById("facFictaHH")?.value)||0
  const mm=parseInt(document.getElementById("facFictaMM")?.value)||0
  const totalMin=hh*60+mm
  const rv=document.getElementById("facFictaResVal")
  const rl=document.getElementById("facFictaResLabel")
  const rt=document.getElementById("facFictaResTotal")
  if(!totalMin){if(rv)rv.textContent="—";if(rl)rl.textContent="";if(rt)rt.textContent="";return}
  const ficta=Math.round(totalMin/7)
  const total=totalMin+ficta
  if(rv)rv.textContent=facMinToHHMM(ficta)
  if(rl)rl.textContent=facMinToHHMM(totalMin)+" ÷ 7 = "+facMinToHHMM(ficta)+" de hora ficta"
  if(rt)rt.textContent="Total com ficta: "+facMinToHHMM(total)
}
function facCalcNot(){
  const ini=document.getElementById("facNotIni")?.value||""
  const fim=document.getElementById("facNotFim")?.value||""
  const rv=document.getElementById("facNotResVal")
  const rl=document.getElementById("facNotResLabel")
  const rd=document.getElementById("facNotResDetalhe")
  if(!ini||!fim){if(rv)rv.textContent="—";return}
  const toMin=t=>{const[h,m]=t.split(":").map(Number);return h*60+m}
  let iniM=toMin(ini),fimM=toMin(fim)
  // FIX v2.4: jornada que começa entre 00:00 e 05:59 já está dentro do noturno
  // (continuação das 22h do dia anterior). Ex: 03:00–05:00 → representa 27:00–29:00.
  if(iniM<6*60&&fimM>iniM){iniM+=24*60;fimM+=24*60}
  else if(fimM<=iniM){fimM+=24*60}
  const noturnoIni=22*60,noturnoFim=29*60
  const start=Math.max(iniM,noturnoIni),end=Math.min(fimM,noturnoFim)
  const horasNot=Math.max(0,end-start)
  if(!horasNot){if(rv)rv.textContent="0:00";if(rl)rl.textContent="Nenhuma hora no período noturno (22h–5h)";if(rd)rd.textContent="";return}
  const adicional=Math.round(horasNot*0.2)
  const ficta=Math.round(horasNot/7)
  const total=horasNot+adicional+ficta
  if(rv)rv.textContent=facMinToHHMM(horasNot)
  if(rl)rl.textContent="Horas noturnas reais: "+facMinToHHMM(horasNot)
  if(rd)rd.innerHTML="Adicional 20%: <b>"+facMinToHHMM(adicional)+"</b><br>Hora ficta (1/7): <b>"+facMinToHHMM(ficta)+"</b><br><b style='font-size:14px'>Total lançar: "+facMinToHHMM(total)+"</b>"
}
let facConvModo="HA"
function facConvSetModo(m){
  facConvModo=m
  document.getElementById("facConvInputHA").style.display=m==="HA"?"block":"none"
  document.getElementById("facConvInputAH").style.display=m==="AH"?"block":"none"
  document.getElementById("facConvModoHA").className=m==="HA"?"btn small pri":"btn small out"
  document.getElementById("facConvModoAH").className=m==="AH"?"btn small pri":"btn small out"
  facCalcConv()
}
function facCalcConv(){
  const rv=document.getElementById("facConvResVal")
  const rl=document.getElementById("facConvResLabel")
  if(facConvModo==="HA"){
    const v=document.getElementById("facConvHora")?.value||""
    const min=facHHMMToMin(v)
    if(isNaN(min))return
    const dec=(min/60).toFixed(4).replace(/0+$/,"").replace(/\.$/,"")
    if(rv)rv.textContent=dec.replace(".",",")
    if(rl)rl.textContent=v+" = "+dec.replace(".",",")+" decimal"
  }else{
    const raw=document.getElementById("facConvDec")?.value||""
    const dec=parseFloat(raw.replace(",","."))
    if(isNaN(dec))return
    const totalMin=Math.round(dec*60)
    const h=Math.floor(totalMin/60),m=totalMin%60
    const hhmm=String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")
    if(rv)rv.textContent=hhmm
    if(rl)rl.textContent=raw+" decimal = "+hhmm
  }
}

