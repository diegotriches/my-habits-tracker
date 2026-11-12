// supabase/functions/delete-account/index.ts
//
// Exclui a conta de quem chama: dados de todas as tabelas, avatar e o
// usuário do Supabase Auth. Remover do Auth exige a chave de serviço, que
// só existe aqui no servidor (variável SUPABASE_SERVICE_ROLE_KEY, injetada
// pelo Supabase) — por isso não dá para fazer isso direto do app.
//
// Ordem: dados → avatar → Auth. O usuário do Auth sai por último para que,
// se algo falhar no meio, ele ainda consiga entrar e tentar de novo; cada
// passo é idempotente.
//
// Deploy: npx supabase functions deploy delete-account --project-ref <ref> --use-api

import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Tabelas ligadas ao usuário pelo hábito (FK habit_id → habits.id).
const HABIT_TABLES = ['completions', 'streaks', 'reminders', 'habit_progress_notifications'];
// Tabelas ligadas direto ao usuário; habits por último entre elas, depois
// de apagar o que depende dele.
const USER_TABLES: Array<[table: string, column: string]> = [
  ['habit_progress_notifications', 'user_id'],
  ['notification_settings', 'user_id'],
  ['habits', 'user_id'],
  ['profiles', 'id'],
];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Identifica quem chama pelo token da sessão — nunca por um id enviado
  // no corpo, senão qualquer um excluiria a conta de outra pessoa.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'Sessão inválida' }, 401);

  const userId = user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const { data: habits, error: habitsError } = await admin
      .from('habits')
      .select('id')
      .eq('user_id', userId);
    if (habitsError) throw habitsError;

    const habitIds = (habits ?? []).map((h: { id: string }) => h.id);
    if (habitIds.length > 0) {
      for (const table of HABIT_TABLES) {
        const { error } = await admin.from(table).delete().in('habit_id', habitIds);
        if (error) throw new Error(`${table}: ${error.message}`);
      }
    }

    for (const [table, column] of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error) throw new Error(`${table}: ${error.message}`);
    }

    // Avatar: avatars/<userId>/avatar.<ext>
    const { data: files, error: listError } = await admin.storage.from('avatars').list(userId);
    if (listError) throw new Error(`avatars: ${listError.message}`);
    if (files && files.length > 0) {
      const { error: removeError } = await admin.storage
        .from('avatars')
        .remove(files.map((f: { name: string }) => `${userId}/${f.name}`));
      if (removeError) throw new Error(`avatars: ${removeError.message}`);
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`auth: ${authError.message}`);

    console.log('Conta excluida:', userId);
    return json({ ok: true }, 200);
  } catch (error) {
    console.error('Erro ao excluir conta', userId, error);
    return json({ error: 'Falha ao excluir a conta' }, 500);
  }
});
