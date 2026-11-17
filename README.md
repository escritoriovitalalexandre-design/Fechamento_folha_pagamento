# Controle de Fechamento da Folha — Contabilidade Vital

Sistema web do Departamento Pessoal, publicado pelo GitHub Pages em
https://escritoriovitalalexandre-design.github.io/Fechamento_folha_pagamento/

Os dados ficam no Supabase (projeto `Fechamento_Folha_Pagamento`). Só entra quem
faz login e está na tabela `public.equipe`.

## Estrutura

```
index.html                 telas (HTML) e a ordem de carregamento dos scripts
css/app.css                estilos do sistema
css/inicio-dp.css          estilos da página inicial "Plataforma DP"
js/logo.js                 logo (uma cópia, usada nas telas e no PDF)
js/00-avisos.js          aviso(), confirmar() e perguntar(): janelas do sistema (no lugar de alert/confirm/prompt)
js/01-base-inicial.js      base vazia (SEED) e chaves do navegador
js/02-supabase.js          conexão, versões, trava de uso, anexos
js/03-estado.js            carregar/salvar e normalizar os dados
js/04-utilitarios.js       sindicatos, valores, data-base, competência
js/05-fechamento-eventos.js eventos automáticos e recorrentes
js/06-inativacao-cadastros.js inativar/excluir empresas e funcionários
js/07-login.js             login, autorização e início do sistema
js/08-painel-fechamento.js painel, alertas e fechamento mensal
js/09-relatorio-lancamento.js relatório de lançamento
js/10-empresas-funcionarios.js listas de empresas e funcionários
js/11-eventos-sindicatos.js códigos/eventos, sindicatos e checklist
js/12-cadastros-modais.js  formulários e janelas de cadastro
js/13-pdf-backup.js        PDF do relatório, CSV e backup
js/14-regras-feriados.js   regras especiais e feriados
js/15-calculadoras.js      facilitador (cálculos de horas)
js/16-mensagem-painel.js   mensagem do painel
js/17-aso-laudos-ferias.js ASOs, laudos SST e férias
js/18-guias.js             guias e senhas de portais (cofre)
js/99-iniciar.js           renderAll() e init()
js/inicio-dp.js            botões da página inicial
supabase/migrations/       alterações do banco, na ordem em que foram aplicadas
```

Os scripts são comuns (não são módulos): todas as funções ficam globais, porque
o HTML chama várias delas direto em `onclick`. A **ordem** das tags `<script>`
no `index.html` importa: `99-iniciar.js` precisa ser o último.

## Testar no computador

Abra o `index.html` no navegador ou sirva a pasta, por exemplo:

```
python -m http.server 8765
```

Lembre que ele usa o Supabase de verdade: o que for salvo vale para todos.
