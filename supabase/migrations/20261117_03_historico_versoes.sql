-- Histórico automático do estado do sistema (folha_state).
-- A cada gravação, guarda a versão ANTERIOR (no máximo 1 a cada 10 minutos).
-- Retenção: tudo dos últimos 7 dias; depois, 1 versão por dia até 90 dias.

create table if not exists public.dados_app_historico (
  id bigint generated always as identity primary key,
  chave text not null,
  dados jsonb not null,
  versao_de timestamptz,          -- atualizado_em da versão guardada
  substituida_por text,           -- e-mail de quem gravou por cima
  criado_em timestamptz not null default now()
);
create index if not exists dados_app_historico_chave_criado on public.dados_app_historico (chave, criado_em desc);

alter table public.dados_app_historico enable row level security;
revoke all on public.dados_app_historico from anon, authenticated;
grant select on public.dados_app_historico to authenticated;
create policy equipe_le_historico on public.dados_app_historico
  for select to authenticated
  using ((select public.is_equipe()));

create or replace function public.guardar_versao_anterior()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.dados is distinct from new.dados and not exists (
    select 1 from public.dados_app_historico h
    where h.chave = old.chave and h.criado_em > now() - interval '10 minutes'
  ) then
    insert into public.dados_app_historico (chave, dados, versao_de, substituida_por)
    values (old.chave, old.dados, old.atualizado_em, auth.jwt() ->> 'email');

    -- Limpeza: após 7 dias fica só a 1ª versão de cada dia; após 90 dias, nada.
    delete from public.dados_app_historico h
    where h.chave = old.chave
      and (h.criado_em < now() - interval '90 days'
           or (h.criado_em < now() - interval '7 days'
               and h.id <> (select min(h2.id) from public.dados_app_historico h2
                            where h2.chave = h.chave
                              and (h2.criado_em at time zone 'America/Sao_Paulo')::date
                                = (h.criado_em at time zone 'America/Sao_Paulo')::date)));
  end if;
  return new;
end;
$$;
revoke execute on function public.guardar_versao_anterior() from public, anon, authenticated;

drop trigger if exists trigger_guardar_versao on public.dados_app;
create trigger trigger_guardar_versao
  after update on public.dados_app
  for each row
  when (old.chave = 'folha_state')
  execute function public.guardar_versao_anterior();

-- Primeira versão: o estado atual, para já ter um ponto de restauração.
insert into public.dados_app_historico (chave, dados, versao_de, substituida_por)
select chave, dados, atualizado_em, 'backup inicial'
from public.dados_app where chave = 'folha_state';
