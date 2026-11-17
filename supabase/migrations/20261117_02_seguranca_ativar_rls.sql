-- APLICAR SÓ DEPOIS que o index.html com login estiver publicado e a equipe
-- estiver cadastrada (Authentication > Users + tabela public.equipe).
-- A partir daqui, o sistema antigo (sem login) para de ler e gravar.

-- 1) Tabela principal: só a equipe logada lê e grava
alter table public.dados_app enable row level security;
drop policy if exists acesso_livre on public.dados_app;
revoke all on public.dados_app from anon;
create policy equipe_acesso_total on public.dados_app
  for all to authenticated
  using ((select public.is_equipe()))
  with check ((select public.is_equipe()));

-- 2) Anexos: bucket privado; só a equipe logada lê e envia
update storage.buckets set public = false where id = 'anexos-folha';
drop policy if exists "anon pode ler anexos" on storage.objects;
drop policy if exists "anon pode enviar anexos" on storage.objects;
create policy "equipe le anexos" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos-folha' and (select public.is_equipe()));
create policy "equipe envia anexos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos-folha' and (select public.is_equipe()));

-- Para desfazer em emergência (volta a ficar aberto como antes):
--   create policy acesso_livre on public.dados_app for all to anon, authenticated using (true) with check (true);
--   grant all on public.dados_app to anon;
--   update storage.buckets set public = true where id = 'anexos-folha';
