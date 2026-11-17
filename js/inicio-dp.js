function dpAbrirControle(){
  document.getElementById('dp-home').hidden=true;
  document.body.classList.remove('dp-home-active');
}
function dpVoltarPlataforma(){
  document.getElementById('dp-home').hidden=false;
  document.body.classList.add('dp-home-active');
}
