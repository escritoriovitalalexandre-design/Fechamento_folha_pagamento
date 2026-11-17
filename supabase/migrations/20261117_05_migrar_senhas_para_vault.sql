-- Move as senhas em texto do estado (guias.tipos[].senha e
-- guias.empresas[].guias[].acesso.senha) para o Vault, trocando por "senhaRef".
-- Também limpa as senhas das versões guardadas em dados_app_historico.
-- APLICAR SÓ DEPOIS que o index.html que entende "senhaRef" estiver publicado.

create temp table mapa_senhas (senha text primary key, ref uuid not null) on commit drop;

create function pg_temp.conv_credencial(o jsonb) returns jsonb
language plpgsql volatile as $$
declare s text; r uuid;
begin
  if o is null or jsonb_typeof(o) <> 'object' or not (o ? 'senha') then return o; end if;
  s := o->>'senha';
  if coalesce(s, '') = '' then return o - 'senha'; end if;
  select m.ref into r from mapa_senhas m where m.senha = s;
  if r is null then
    r := vault.create_secret(s, 'portal_' || gen_random_uuid()::text, 'Senha de portal - Fechamento da Folha');
    insert into public.senhas_portais (ref, criado_por) values (r, 'migração 2026-11-17');
    insert into mapa_senhas values (s, r);
  end if;
  return (o - 'senha') || jsonb_build_object('senhaRef', r);
end $$;

create function pg_temp.conv_estado(d jsonb) returns jsonb
language plpgsql volatile as $$
declare g jsonb;
begin
  g := d->'guias';
  if g is null or jsonb_typeof(g) <> 'object' then return d; end if;
  if jsonb_typeof(g->'tipos') = 'array' then
    g := jsonb_set(g, '{tipos}', coalesce((
      select jsonb_agg(pg_temp.conv_credencial(t.v) order by t.ord)
      from jsonb_array_elements(g->'tipos') with ordinality t(v, ord)), '[]'::jsonb));
  end if;
  if jsonb_typeof(g->'empresas') = 'array' then
    g := jsonb_set(g, '{empresas}', coalesce((
      select jsonb_agg(
        case when jsonb_typeof(e.v->'guias') = 'array' then
          jsonb_set(e.v, '{guias}', coalesce((
            select jsonb_agg(
              case when jsonb_typeof(x.v->'acesso') = 'object'
                   then jsonb_set(x.v, '{acesso}', pg_temp.conv_credencial(x.v->'acesso'))
                   else x.v end order by x.ord)
            from jsonb_array_elements(e.v->'guias') with ordinality x(v, ord)), '[]'::jsonb))
        else e.v end order by e.ord)
      from jsonb_array_elements(g->'empresas') with ordinality e(v, ord)), '[]'::jsonb));
  end if;
  return jsonb_set(d, '{guias}', g);
end $$;

update public.dados_app set dados = pg_temp.conv_estado(dados) where chave = 'folha_state';
update public.dados_app_historico set dados = pg_temp.conv_estado(dados);
