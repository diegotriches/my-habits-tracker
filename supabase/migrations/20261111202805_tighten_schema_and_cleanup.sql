-- Alinha o schema ao que o app usa e remove estruturas sem uso.
--
-- Verificado antes de escrever (consultas de leitura em 2026-11-11):
-- - Nenhuma linha nula nas colunas que ganham NOT NULL; todas têm default.
-- - Nenhum valor fora das listas de type / frequency_type / frequency_goal_period.
-- - Nenhuma função ou gatilho referencia as colunas/tabela removidas.
--
-- Tudo roda numa transação: se qualquer passo falhar, nada é aplicado.

begin;

-- ---------------------------------------------------------------------
-- 1. Estruturas sem uso no app (resquícios da gamificação e de versões
--    antigas). grace_day_used e is_negative só têm o default gravado;
--    as demais estão vazias.
-- ---------------------------------------------------------------------
drop table if exists public.sync_queue;

alter table public.habits
  drop column if exists grace_day_used,
  drop column if exists is_negative,       -- duplicava `type`
  drop column if exists last_completed_at; -- substituída por `completions`

alter table public.reminders
  drop column if exists notification_id;   -- substituída por `notification_ids`

-- ---------------------------------------------------------------------
-- 2. NOT NULL onde o valor sempre existe (as colunas têm default).
-- ---------------------------------------------------------------------
alter table public.completions
  alter column created_at set not null,
  alter column was_synced set not null;

alter table public.habit_progress_notifications
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.habits
  alter column color set not null,
  alter column icon set not null,
  alter column created_at set not null,
  alter column updated_at set not null,
  alter column has_target set not null,
  alter column is_active set not null;

alter table public.profiles
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.reminders
  alter column created_at set not null,
  alter column is_active set not null;

alter table public.streaks
  alter column best_streak set not null,
  alter column current_streak set not null,
  alter column updated_at set not null;

-- ---------------------------------------------------------------------
-- 3. Listas fechadas como enums. Os CHECKs atuais garantiam os valores,
--    mas o `supabase gen types` ignora CHECK e gerava `string`; com enum
--    os tipos saem como uniões. O app continua enviando o mesmo texto.
-- ---------------------------------------------------------------------
create type public.habit_type as enum ('positive', 'negative');
create type public.habit_frequency_type as enum ('daily', 'weekly', 'custom');
create type public.frequency_goal_period as enum ('week', 'month', 'custom');

alter table public.habits
  drop constraint if exists habits_type_check,
  drop constraint if exists habits_frequency_type_check;

alter table public.habits
  alter column type type public.habit_type
    using type::public.habit_type,
  alter column frequency_type type public.habit_frequency_type
    using frequency_type::public.habit_frequency_type,
  alter column frequency_goal_period type public.frequency_goal_period
    using frequency_goal_period::public.frequency_goal_period;

commit;
