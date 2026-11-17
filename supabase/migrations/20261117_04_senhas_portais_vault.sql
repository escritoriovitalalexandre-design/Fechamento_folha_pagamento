-- Senhas de portais (tela Guias) guardadas no Supabase Vault (criptografadas).
-- O estado do sistema passa a guardar só "senhaRef" (o id do segredo).
-- Esta parte só cria as funções; não altera dados.

create table if not exists public.senhas_portais (
  ref uuid primary key,
  criado_em timestamptz not null default now(),
  criado_por text
);
alter table public.senhas_portais enable row level security;
revoke all on public.senhas_portais from anon, authenticated;

-- Guarda uma senha nova no cofre e devolve a referência.
create or replace function public.salvar_senha_portal(p_senha text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_ref uuid;
begin
  if not public.is_equipe() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if coalesce(p_senha, '') = '' then
    return null;
  end if;
  v_ref := vault.create_secret(p_senha, 'portal_' || gen_random_uuid()::text, 'Senha de portal - Fechamento da Folha');
  insert into public.senhas_portais (ref, criado_por) values (v_ref, auth.jwt() ->> 'email');
  return v_ref;
end;
$$;

-- Lê uma senha do cofre (só referências criadas por este sistema).
create or replace function public.ler_senha_portal(p_ref uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_senha text;
begin
  if not public.is_equipe() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select d.decrypted_secret into v_senha
  from vault.decrypted_secrets d
  join public.senhas_portais s on s.ref = d.id
  where d.id = p_ref;
  return v_senha;
end;
$$;

revoke execute on function public.salvar_senha_portal(text) from public, anon;
revoke execute on function public.ler_senha_portal(uuid) from public, anon;
grant execute on function public.salvar_senha_portal(text) to authenticated;
grant execute on function public.ler_senha_portal(uuid) to authenticated;
