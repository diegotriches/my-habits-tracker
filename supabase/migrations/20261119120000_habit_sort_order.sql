-- Ordem dos hábitos na tela inicial, guardada no banco.
--
-- Antes a ordem arrastada ficava só no aparelho (AsyncStorage): se perdia ao
-- reinstalar o app, não acompanhava a conta em outro celular e não entrava no
-- backup. Agora cada hábito tem um `sort_order` (menor = mais acima); hábitos
-- sem valor (null) vêm depois, pela data de criação.
--
-- A função `set_habit_order` grava a ordem inteira numa única chamada (e numa
-- única transação): recebe os ids na ordem da tela e numera de 1 em diante.
-- É `security invoker`, então a RLS de `habits` vale normalmente, e o filtro
-- por `auth.uid()` garante que só os hábitos do próprio usuário mudam.
--
-- Coluna nova e opcional: nenhuma linha existente muda, e o app antigo
-- (que não a conhece) continua funcionando.

begin;

alter table public.habits
  add column if not exists sort_order integer;

comment on column public.habits.sort_order is
  'Posição do hábito na tela inicial (menor = mais acima; null = depois dos ordenados, pela data de criação).';

create or replace function public.set_habit_order(habit_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.habits h
     set sort_order = o.position::integer
    from unnest(habit_ids) with ordinality as o(id, position)
   where h.id = o.id
     and h.user_id = auth.uid();
$$;

revoke execute on function public.set_habit_order(uuid[]) from public, anon;
grant execute on function public.set_habit_order(uuid[]) to authenticated;

commit;
