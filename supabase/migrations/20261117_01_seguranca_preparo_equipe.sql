-- JÁ APLICADA em 2026-11-17. Não quebra o sistema antigo.
-- Lista de e-mails autorizados a usar o sistema (preenchida pelo escritório)
create table if not exists public.equipe (
  email text primary key check (email = lower(email)),
  nome text,
  criado_em timestamptz not null default now()
);
alter table public.equipe enable row level security;
revoke all on public.equipe from anon, authenticated;

-- true se o usuário logado está na lista da equipe
create or replace function public.is_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.equipe e
    where e.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke execute on function public.is_equipe() from public, anon;
grant execute on function public.is_equipe() to authenticated;

-- Correções apontadas pelo Security Advisor
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.atualizar_timestamp() set search_path = '';
