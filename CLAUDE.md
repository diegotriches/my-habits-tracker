# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Idioma:** toda a comunicação com o usuário, comentários de código, textos de UI, documentação e mensagens de commit devem ser em português do Brasil. Nomes de arquivos, pastas e identificadores de código continuam em inglês.

## Projeto

App de rastreamento de hábitos para Android (alvo principal) / iOS, construído com Expo SDK 54 (React Native 0.81, New Architecture), Expo Router 6 (`typedRoutes`), TypeScript (strict) e Supabase (Postgres + RLS + Auth + Storage para avatares). O `README.md` é a documentação de referência para contribuidores.

## Comandos

```bash
npm install
npx expo start --dev-client     # servidor de dev, quando já existe uma build de dev client instalada no celular/emulador
npx expo run:android            # gera e instala o dev client (primeira vez, ou após qualquer mudança nativa)
npx expo prebuild --clean       # regenera android/ após mudanças em plugins/ ou na config nativa do app.json
npx tsc --noEmit                # checagem de tipos (não há script de lint)

eas build --platform android --profile preview                               # APK de teste (profiles: development, preview, production)
eas update --branch preview --platform android --message "..."             # OTA para mudanças só em JS/TSX
```

- Não há setup de testes funcionando: `components/__tests__/StyledText-test.js` é sobra do template do Expo; o jest não está instalado e não existe script `test`.
- Sempre passe `--platform android` para o `eas update` — o export web está quebrado porque o cliente Supabase acessa `AsyncStorage`/`window` durante a renderização estática do expo-router.
- `android/` é gerado pelo prebuild e não é commitado. Mudanças em `plugins/`, em campos nativos do `app.json` ou em dependências nativas exigem build nova, não OTA.
- É preciso um `.env.local` com `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`services/supabase.ts` lança erro no import se faltarem) e o `google-services.json` na raiz.

## Arquitetura

- **Alias de import**: `@/*` aponta para a raiz do repositório (ex.: `@/services/supabase`).
- **Roteamento/controle de autenticação**: `app/_layout.tsx` envolve tudo em `AuthProvider` → `ThemeProvider`, redireciona entre `(auth)` e `(tabs)` com base em `useAuth()`, monta o `NotificationHandler` só quando autenticado e, em produção, verifica atualizações do `expo-updates` ao iniciar. O OAuth do Google retorna pelo deep link `habittracker://auth/callback`; o layout raiz extrai os tokens do hash da URL, chama `supabase.auth.setSession` e recarrega o app (`DevSettings.reload` / `Updates.reloadAsync`) usando flags no AsyncStorage (`oauth_callback_processed`, `oauth_reload_in_progress`). Cuidado ao alterar esse fluxo.
- **Padrão de telas**: os arquivos de tela em `app/` são orquestradores finos; a lógica de negócio fica em `hooks/` (ex.: `app/habits/[id].tsx` → `useHabitDetails`, `useHabitCalendarActions`, `useHabitProgressNotifications`, `useDeleteHabitConfirm`, `useActionsMenu`; `app/(tabs)/index.tsx` → `useHabitCompletionActions`). Partes de UI são componentes com `React.memo` em `components/`. Não defina componentes (ex.: modais) dentro do corpo de um componente de tela — isso remonta a subárvore a cada render.
- **Acesso a dados**: os hooks consultam o Supabase diretamente (`supabase.from(...)`, frequentemente com cast `as any` — não propague esse padrão em código novo; use os tipos de `types/database.ts` e evite `any`. Os casts existem porque o `Database` atual não segue o formato esperado pelo supabase-js 2.90, que infere `never` em `insert`/`update`; enquanto isso não for corrigido, tipe o payload com `Database['public']['Tables'][...]['Update']` e restrinja o cast a `as never` no ponto da chamada) e guardam estado em `useState` local; não há store global (o zustand está instalado, mas `store/` está vazio). Os tipos das tabelas vêm de `types/database.ts` (`Habit`, `Completion`, `Reminder`, `NotificationSettings`, `ProgressNotification`, ...). Hábitos têm `type` (`positive`/`negative`), `frequency_type` (`daily`/`weekly`/`custom`) com `frequency_days` e campos opcionais `frequency_goal_*`; os helpers de agenda ficam em `utils/habitHelpers.ts`.
- **Conclusões otimistas**: marcar/desmarcar dias retroativamente (card semanal da home e calendário de detalhes) atualiza o estado local na hora via `addOptimisticCompletion` / `removeCompletionById` / `removeCompletionForDate` (expostos por `useWeeklyCompletions` e `useHabitDetails`), envia a requisição em segundo plano via `services/retroactiveCompletionService.ts` (que também calcula streaks) e só reverte em caso de erro. Intencionalmente não há refetch completo após cada sucesso.
- **Datas**: `completed_at` vem do Supabase em UTC, mas tudo no app é agrupado pelo dia **local** (UTC-3). Para obter o dia, use `format(new Date(c.completed_at), 'yyyy-MM-dd')` — nunca `completed_at.split('T')[0]` — e, para ler uma string `yyyy-MM-dd`, use `parseISO` em vez de `new Date(...)`, que a interpreta como meia-noite UTC (dia anterior no Brasil). O app pode ficar aberto durante a virada do dia: estado que dependa de "hoje" deve reagir a `useCurrentDay()` (`hooks/useCurrentDay.ts`, atualiza à meia-noite e ao voltar para o primeiro plano), e comparações com "hoje" devem usar a data do momento da chamada.
- **Notificações**: o `expo-notifications` cuida só de permissões e do canal Android. O agendamento real usa um módulo nativo próprio sobre o `AlarmManager`: `plugins/withExactAlarm.js` (config plugin) copia `plugins/java/*.java` para o projeto nativo. `ExactAlarmModule` agenda, `AlarmReceiver` exibe a notificação (a ação "Feito" envia, via `LocalBroadcastManager`, o broadcast `com.dtriches.myhabitstracker.HABIT_COMPLETE_LOCAL`; o `ExactAlarmModule` o recebe e emite o evento JS `HabitCompleteFromNotification` pelo `DeviceEventEmitter`), `AlarmStorage` persiste os alarmes em `SharedPreferences` e `BootReceiver` reagenda tudo em `BOOT_COMPLETED` / `MY_PACKAGE_REPLACED`. No lado JS: `services/exactAlarmService.ts` encapsula o módulo (só Android, id do alarme `${reminderId}_${dayOfWeek}`, salvo em `reminders.notification_ids`; lembretes antigos ainda podem ter o formato legado `${habitId}_${dayOfWeek}`). Sempre cancele pelo `notificationService` (`cancelNotifications`, `cancelHabitNotifications`, `cancelAllNotifications`), que no Android cancela também os alarmes nativos — o `expo-notifications` sozinho não os enxerga. O snooze nativo (`${habitId}_snooze`) é one-shot e não entra na corrente semanal; `services/notifications.ts` é o `notificationService` real e `services/notificationService.ts` apenas o reexporta. Notificações de progresso ficam em `progressChecker.ts` / `progressNotificationScheduler.ts`. Ao mexer em alarmes/lembretes, teste reboot e reinstalação do app, não só o agendamento inicial.
- O ícone de notificação (`assets/images/notification-icon.png`) precisa ser uma silhueta branca sobre fundo transparente — o Android ignora cor.
- A gamificação foi removida do produto; código/tabelas remanescentes ainda aguardam limpeza. O `checkExpiredStreaks` em `hooks/useStreaks.ts` **não** é resquício: o streak só é recalculado quando há marcação, então é ele que zera o `current_streak` após dias perdidos (roda uma vez por sessão ao abrir a home). Atenção: `constants/GameConfig.ts` continua em uso (ex.: `HABIT_COLORS`), apesar do nome.

## Convenções

- Prefixos de branch: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`.
- Commits: `tipo: descrição curta` (`feat`, `fix`, `refactor`, `chore`, `style`, `docs`) em português, com corpo explicando o *porquê*.
- Evite espaços no caminho da pasta do projeto — isso quebra o Gradle/autolinking. No Windows, a build local também exige um caminho curto (≤ ~17 caracteres, ex.: `C:\dev\habits`) por causa do limite de 260 caracteres do ninja; ver README.

## Fluxo de trabalho

- Nunca altere arquivos direto na `main`: antes da primeira edição, crie uma branch com o prefixo adequado (`feat/`, `fix/`, `refactor/`, `docs/`, `chore/`).
- Após editar arquivos `.ts`/`.tsx`, rode `npx tsc --noEmit` e corrija os erros antes de considerar a tarefa concluída.
- Não execute `git commit`, `git push`, `eas build` nem `eas update` sem pedido explícito.
- A cada mudança relevante (nova funcionalidade, pendência resolvida, mudança de arquitetura, setup ou build), verifique se o `README.md` precisa ser atualizado — inclusive removendo itens resolvidos de "Pendências conhecidas" — e avise antes de concluir. Se o README ficar grande demais, proponha mover detalhes para documentação por módulo em `docs/`.
- Ao concluir uma tarefa, apresente:
  1. a mensagem de commit sugerida no padrão do projeto;
  2. a lista do que precisa ser validado manualmente no dispositivo (visual, notificações, reboot/reinstalação), já que não é possível testar no celular.
