-- Arquivamento de hábitos.
--
-- `is_active = false` continua sendo a exclusão (lógica). Arquivar é outra
-- coisa: o hábito sai da home e dos lembretes, mas o histórico fica visível
-- numa lista de arquivados e pode ser restaurado a qualquer momento.
--
-- Hábito na home: is_active and archived_at is null.
-- Hábito arquivado: is_active and archived_at is not null.
--
-- Coluna nova e opcional: nenhuma linha existente muda, e o app antigo
-- (que não a conhece) continua funcionando.

begin;

alter table public.habits
  add column if not exists archived_at timestamptz;

comment on column public.habits.archived_at is
  'Quando o hábito foi arquivado (null = não arquivado). Arquivado sai da home e dos lembretes, mas mantém o histórico e pode ser restaurado.';

commit;
