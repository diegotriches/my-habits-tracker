# My Habits Tracker

App de rastreamento de hábitos para Android/iOS, construído com React Native (Expo) e Supabase.

## Stack

- **React Native** 0.81.5 + **Expo SDK 54** (managed workflow, EAS Build)
- **Expo Router** 6 (roteamento baseado em arquivos, `typedRoutes` habilitado)
- **Supabase** — PostgreSQL + Row Level Security + Auth + Storage (avatares)
- **TypeScript**
- **Notificações**: `expo-notifications` para permissões/canal, mas o agendamento em si roda sobre **`AlarmManager` nativo (módulo Java custom)** — ver [Sistema de notificações](#sistema-de-notificações) abaixo
- **EAS Build / EAS Update** para builds e distribuição OTA

## Estrutura de pastas

```
app/                    # Telas (Expo Router — cada arquivo é uma rota)
  (auth)/               # Login, cadastro e retorno do OAuth do Google
  (tabs)/               # Home e perfil
  habits/               # Detalhes, edição e criação de hábito
  settings/             # Configurações (perfil, notificações, privacidade, arquivados)
  stats/                # Estatísticas do ano (mapa de calor)
  debug/                # Diagnóstico de notificações (só em desenvolvimento)
components/
  habits/               # Componentes específicos de hábitos
  stats/                # Mapa de calor do ano
  account/              # Backup/importação e exclusão de conta
  auth/                 # Botão de login com o Google
  notifications/        # NotificationHandler (permissões, filas, ressincronização)
  ui/                   # Componentes genéricos reutilizáveis (BottomSheetModal, Icon, etc.)
  profile/, skeletons/
hooks/                  # Toda a lógica de negócio (ver "Padrão de arquitetura" abaixo)
services/               # Chamadas ao Supabase e serviços de domínio
  completionOutbox.ts   # fila de saída das marcações (funciona offline)
  streakService.ts      # cálculo de streak
  notificationService.ts, exactAlarmService.ts
utils/                  # Lógica pura e testada (streak, resumo do dia, mapa de calor, backup...)
  __tests__/            # Testes (Jest)
constants/              # Ícones, cores, constantes de formulário compartilhadas
contexts/               # ThemeContext (claro/escuro/automático), AuthContext
types/supabase.ts       # Tipos gerados do schema do Supabase (não editar; ver CLAUDE.md)
types/database.ts       # Aliases do app sobre os tipos gerados (Habit, Completion, ...)
supabase/migrations/    # Migrations SQL do banco, executadas no SQL Editor
supabase/functions/     # Edge Functions (Deno): delete-account
plugins/                # Config plugin do Expo para o módulo nativo de alarmes
  withExactAlarm.js
  java/                 # AlarmReceiver, AlarmStorage, BootReceiver, ExactAlarmModule/Package, PendingCompletionStorage
assets/images/          # Ícones, splash, favicon
assets/sounds/          # Sons dos lembretes (um canal Android por som)
docs/                   # Roteiro de testes manuais (manual-testing.md)
```

`android/` é gerado via `expo prebuild` e **não é commitado** — qualquer mudança em `plugins/` ou `app.json` que afete o nativo exige `npx expo prebuild --clean` antes do próximo build.

## Pré-requisitos

- Node 24+
- Java JDK (o Android Studio já traz um embutido em `Android Studio/jbr`)
- Android Studio com Android SDK instalado
- Conta Expo + acesso ao projeto no EAS (`eas login`)
- Acesso ao projeto Supabase (URL + anon key)

⚠️ **Evite espaços no caminho da pasta do projeto** (ex: `C:\...\My Habits Tracker`). Isso já causou falhas de resolução de dependências no Gradle/autolinking do React Native (`No matching variant... No variants exist`). Use algo como `my-habits-tracker`, sem espaço.

⚠️ **No Windows, o caminho também precisa ser curto** — no máximo ~17 caracteres, como `C:\dev\habits`. A compilação C++ do React Native (New Architecture) gera arquivos cujo caminho relativo embute o caminho completo do projeto, e o `ninja` do Android SDK falha acima de 260 caracteres (`Filename longer than 260 characters`). Mapear a pasta com `subst` não resolve: o autolinking do Expo não encontra o `package.json` quando o projeto fica na raiz de um drive, e mapeando a pasta pai o caminho ainda passa do limite. Builds no EAS (Linux) não têm essa limitação.

Se a build local falhar com `OutOfMemoryError: Metaspace`, aumente a memória do Gradle em `android/gradle.properties` (ex.: `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`). Esse arquivo é regenerado pelo `expo prebuild --clean`, então o ajuste precisa ser refeito a cada prebuild.

## Configuração do ambiente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o `.env.example` para `.env.local` e preencha com a URL e a chave `anon` do Supabase (Project Settings → API). O arquivo explica cada variável. Nunca use a chave `service_role` no app: tudo o que começa com `EXPO_PUBLIC_` vai embutido no APK.

3. **Builds do EAS não leem o `.env.local`** (ele fica de fora do upload, como tudo no `.gitignore`). Cadastre as mesmas variáveis em expo.dev → projeto → **Environment variables**, marcando os três ambientes (`development`, `preview` e `production`) — cada perfil do `eas.json` usa o ambiente de mesmo nome. Sem elas, a build abre e fecha na hora. Visibilidade "Plain text" ou "Sensitive" basta: "Secret" não protege nada, porque o valor vai embutido no app.

4. O `google-services.json` (Firebase, referenciado no `app.json`) já está commitado na raiz; troque-o só se mudar o projeto do Firebase.

5. Variáveis de sistema (Windows), se for buildar localmente com `expo run:android`:
   - `JAVA_HOME` → pasta `jbr` (ou `jre`) dentro da instalação do Android Studio
   - `ANDROID_HOME` → pasta do Android SDK (geralmente `%LOCALAPPDATA%\Android\Sdk`)
   - Adicione `%JAVA_HOME%\bin` e `%ANDROID_HOME%\platform-tools` ao `Path`
   - Feche e reabra o terminal (e o VS Code, se estiver usando o terminal integrado) depois de configurar

## Rodando o projeto

Se já existe uma build de desenvolvedor instalada no celular/emulador:

```bash
npx expo start --dev-client
```

Se precisar gerar/instalar a build de desenvolvedor pela primeira vez (ou depois de mudanças nativas):

```bash
npx expo run:android
```

## Testes e qualidade de código

```bash
npm test               # testes (Jest)
npm run typecheck      # tipos
npm run lint           # ESLint (regras do Expo)
npm run format         # Prettier (format:check só confere)
```

O **CI** (GitHub Actions, `.github/workflows/ci.yml`) roda tipos, lint, formatação e testes a cada push e pull request. Avisos do lint aparecem, mas não falham o CI.

Jest com o preset `jest-expo`. Os testes ficam em `__tests__/` (`*.test.ts`) e cobrem a lógica pura: cálculo de streak (`utils/streak.ts`), operações da fila offline (`utils/completionOps.ts`), formato do backup e CSV (`utils/backupFormat.ts`) e helpers de agenda e texto. Rodam no fuso `America/Sao_Paulo` (`jest.global-setup.js`), já que o app agrupa conclusões pelo dia local. O comportamento no aparelho (notificações, alarmes, offline) é validado pelo roteiro manual em [docs/manual-testing.md](docs/manual-testing.md).

## Build e distribuição

O projeto usa três profiles no `eas.json`:

| Profile       | Uso                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- |
| `development` | Build com dev client embutido, para desenvolvimento local com hot reload                 |
| `preview`     | Build de teste (APK), canal `preview` — use este para validar mudanças antes de produção |
| `production`  | Build final, canal `production`, incrementa `versionCode` automaticamente                |

```bash
eas build --platform android --profile preview
```

Para mudanças **só em JS/TSX** (sem tocar em `plugins/`, `app.json` nativo, ou dependências nativas), não é preciso gerar build novo — publique via OTA:

```bash
eas update --branch preview --platform android --message "descrição da mudança"
```

> Use sempre `--platform android` — o export da versão Web está atualmente quebrado (ver [Problemas conhecidos](#problemas-conhecidos)).

> O `runtimeVersion` usa a política **`fingerprint`**: o Expo calcula a versão a partir do código nativo, e um OTA só chega às builds com o mesmo nativo. Depois de qualquer mudança nativa, **gere e distribua a build nova antes de publicar OTAs** — eles não chegam às builds antigas (que quebrariam ao carregar um JS que importa módulos nativos que elas não têm). O `android/` local não entra no cálculo (o `@expo/fingerprint` o trata como gerado, por estar no `.gitignore`); para conferir a versão: `npx expo-updates runtimeversion:resolve --platform android`.

## Padrão de arquitetura

Cada tela grande segue o padrão: **hook(s) para lógica + componentes memoizados para UI**, mantendo o arquivo de tela como orquestrador fino. Exemplos:

- `app/habits/[id].tsx` → `useHabitDetails`, `useHabitCalendarActions`, `useHabitProgressNotifications`, `useDeleteHabitConfirm`, `useArchiveHabitActions`, `useActionsMenu`
- `app/settings/archived.tsx` → `useArchivedHabits`, `useArchiveHabitActions`
- `app/stats/index.tsx` → `useYearStats` + `computeYearHeatmap` (`utils/yearHeatmap.ts`)
- `app/habits/edit/[id].tsx` → `useEditHabitForm`
- `app/habits/create.tsx` → `useCreateHabitForm`
- `app/(tabs)/index.tsx` → `useHabitCompletionActions`

Componentes extraídos de UI repetida ou pesada usam `React.memo`. Evite definir componentes (ex: modais) dentro do corpo de outro componente de tela — isso faz o React recriá-los a cada render, causando remount desnecessário da subárvore.

### UI otimista e marcações offline

Marcar/desmarcar um dia (no card semanal da home, hoje ou dias passados, e no calendário de detalhes) **não espera a rede**: o estado local é atualizado na hora e a operação vai para a **fila de saída** (`services/completionOutbox.ts`), persistida no aparelho. Com conexão, ela é enviada em seguida; sem conexão, fica guardada e é reenviada ao abrir o app, ao voltar para ele ou na próxima marcação. A UI só reverte em erro definitivo (ex.: hábito excluído) — nunca por falta de rede. A fila guarda uma operação por hábito + dia (vale a última), e metas numéricas guardam o valor final, então reenviar nunca duplica.

Como consequência, **não há refetch completo após cada sucesso individual** — o estado local se autocorrige na próxima atualização natural (pull-to-refresh, reabrir a tela).

Na home, as mutações passam por `applyOptimistic(op)` do `useWeeklyCompletions`, que devolve um `settle(ok)` a ser chamado quando a fila resolver a operação. Enquanto um refetch puder ter lido o banco antes da gravação, a mutação é reaplicada sobre a resposta — assim, marcar dias e logo em seguida trocar de semana ou puxar para atualizar não "desmarca" nada na tela. Respostas de buscas antigas (fora de ordem) são descartadas. Na tela de detalhes, que só busca ao abrir, o `useHabitDetails` expõe setters simples (`addOptimisticCompletion` / `removeCompletionById` / `removeCompletionForDate`).

O app também **abre sem conexão**: hábitos, streaks, perfil, as últimas 8 semanas da home e os detalhes já vistos ficam num cache de leitura (`services/offlineCache.ts`, por usuário e com versão — suba `CACHE_VERSION` ao mudar o formato dos dados), mostrado na hora e atualizado a cada busca. A fila é aplicada por cima do cache. Com o token expirado e sem rede, o `AuthContext` entra com a sessão salva no aparelho (`readStoredSession`) em vez de mandar para o login; ela é renovada quando a conexão volta. Criar/editar/excluir hábitos continuam exigindo conexão.

A conexão é acompanhada pelo `@react-native-community/netinfo` (`services/network.ts`): quando ela volta, o `NotificationHandler` envia as pendências na hora e refaz a ressincronização dos lembretes se ela falhou. Uma faixa discreta na home (`OfflineStatusBanner`) mostra "Sem conexão · N alterações aguardando envio". Ações que exigem internet (hábitos, lembretes, perfil, avatar, notificações de progresso, exclusão de conta) chamam `ensureOnline()` e avisam antes de tentar.

Limites conhecidos do modo offline: os detalhes de um hábito nunca aberto online não têm cache; streaks vencidos só zeram na próxima sessão online; caches de hábitos excluídos ficam no aparelho até o logout; conflito entre dois aparelhos offline resolve por "vale a última alteração" de cada hábito/dia.

### Sistema de notificações

`expo-notifications` cuida só de permissões e do canal Android. O agendamento em si usa um módulo nativo Java (`ExactAlarmModule` + `AlarmReceiver`) sobre `AlarmManager`, porque o agendamento via JS puro não sobrevivia de forma confiável em background. Pontos importantes:

- **`AlarmStorage.java`** persiste os dados de cada alarme em `SharedPreferences`
- **`BootReceiver.java`** escuta `BOOT_COMPLETED` e `MY_PACKAGE_REPLACED` e reagenda tudo — sem isso, o `AlarmManager` perde todos os alarmes pendentes num reboot ou atualização do app, e a corrente de lembretes semanais morre para sempre
- **Ids dos alarmes**: `${reminderId}_${diaDaSemana}`, salvos em `reminders.notification_ids` — um por lembrete, para que vários lembretes do mesmo hábito não se sobrescrevam
- **Cancelamento**: sempre via `notificationService` (`cancelNotifications`, `cancelHabitNotifications`, `cancelAllNotifications`). O `expo-notifications` não enxerga os alarmes nativos; esses métodos cancelam os dois. Excluir um hábito cancela os alarmes e desativa seus lembretes
- **Adiar (snooze)**: alarme único de 10 min (`${habitId}_snooze`), que não é reagendado nem sobrevive a reboot
- **Próxima ocorrência**: depois de cada disparo (e no reboot), o horário é recalculado a partir do dia da semana e do horário do lembrete (`AlarmReceiver.nextWeeklyTrigger`), não "agora + 7 dias" — assim atrasos de Doze não se acumulam semana a semana
- **Botão "Feito" com o app fechado**: o `AlarmReceiver` não tem acesso ao Supabase (o React Native não está rodando), então grava a conclusão, com o horário do toque, numa fila local (`PendingCompletionStorage.java`). O JS a envia ao banco em `services/pendingCompletionService.ts` — ao abrir o app, ao voltar para o primeiro plano ou na hora, se o app estiver aberto (evento `PendingCompletionsChanged`) — e recalcula o streak. O envio é idempotente (não duplica se o dia já estiver concluído) e itens com falha de rede ficam para a próxima tentativa. Hábitos com meta numérica mostram "Registrar" em vez de "Feito": abre `habittracker://habits/<id>?action=register`, e a tela de detalhes já abre o modal de progresso de hoje (`hooks/useRegisterProgressAction.ts`)
- **Tocar na notificação** abre os detalhes do hábito pelo deep link `habittracker://habits/<id>`, roteado pelo Expo Router. O intent usa `FLAG_ACTIVITY_CLEAR_TASK`: com o processo do app morto mas a tarefa ainda nos recentes, o Android só traz a tarefa antiga para frente e descarta o link (`SINGLE_TOP` e `CLEAR_TOP` não resolvem). O custo é recriar a interface quando o app já está aberto
- **Sons**: no Android 8+ o som pertence ao canal, e um canal não muda de som depois de criado — por isso há um canal por som (`habits`, `habits-water`, `habits-bell`, `habits-chime`, `habits-silent`), criados pelo JS (`services/notificationService.ts`, também usados no preview) e, se ainda não existirem, pelo `AlarmReceiver`. Os `.wav` ficam em `assets/sounds/` e entram na build pelo `sounds` do plugin `expo-notifications` no `app.json`
- **Ressincronização ao abrir o app** (`services/reminderSyncService.ts`, chamado pelo `NotificationHandler` após a permissão): os alarmes vivem só no aparelho e se perdem ao reinstalar o app, limpar os dados ou trocar de celular, enquanto os lembretes continuam ativos no banco. A cada login/abertura, o app cancela os alarmes persistidos e reagenda os lembretes ativos dos hábitos ativos — o que também limpa órfãos (lembretes excluídos em outro aparelho, ids legados). Se a busca no banco falhar (ex.: offline), nada é alterado. Também roda depois de salvar a edição de um hábito, já que o nome e a meta numérica ("Feito" x "Registrar") vão gravados no alarme. Só Android

Se mexer em qualquer coisa relacionada a alarmes/lembretes, teste os dois gatilhos (reboot real e reinstalação do app), não só o agendamento inicial.

### Estatísticas do ano

O ícone de gráfico no cabeçalho da home abre `app/stats`: o ano em 12 mini-calendários (cabem na tela sem rolagem lateral), com a cor de cada dia indicando quanto dos hábitos programados foi feito, um filtro por hábito (inclusive arquivados), os totais do ano (conclusões, dias completos, aproveitamento) e o detalhe do dia tocado.

- As regras ficam em `computeYearHeatmap` (`utils/yearHeatmap.ts`, com testes): o hábito conta a partir do dia em que foi criado e até a véspera do arquivamento, só nos dias da agenda; meta semanal ("3x por semana") conta só nos dias feitos, já que não tem dia fixo; meta numérica só conta como feita ao atingir o valor. Hábitos excluídos ficam de fora.
- `useYearStats` busca o ano com `fetchAllRows`, guarda no cache offline (`year:<ano>`) e aplica por cima as marcações ainda na fila de saída.

### Arquivar hábitos

No menu ⋯ dos detalhes, **Arquivar** tira o hábito da home e para os lembretes sem apagar nada; **Perfil → Hábitos arquivados** lista os arquivados, que abrem os detalhes (histórico completo, marcações permitidas) e podem ser restaurados. É diferente de **Excluir**, que desativa o hábito (`is_active = false`) e não tem volta pelo app.

- Coluna `habits.archived_at` (migration `20261112164950_habit_archiving.sql`). Hábito "em uso" = `is_active and archived_at is null`.
- Arquivar (`services/habitArchiveService.ts`) cancela os alarmes e as notificações de progresso, mas deixa os lembretes ativos no banco: a ressincronização ignora hábitos arquivados e, ao restaurar, reagenda tudo como estava. Restaurar também recalcula o streak (enquanto arquivado, os dias perdidos não o zeram).
- O backup leva o `archived_at`: um hábito arquivado continua arquivado ao ser importado (backups antigos, sem o campo, vêm não arquivados).
- `HABITS_CHANGED_EVENT` (`services/habitEvents.ts`) avisa as outras instâncias do `useHabits` quando a lista muda — antes, a home só mostrava um hábito novo, excluído ou arquivado depois de puxar para atualizar.

### Backup e exportação

Em Dados e Privacidade (`DataTransferCard`, `services/dataTransferService.ts`):

- **Exportar backup** gera um JSON (`format: "my-habits-tracker/backup"`, `version`) com hábitos ativos (inclusive arquivados), conclusões e lembretes — **sem ids do banco**, para poder ser importado em qualquer conta. Ao mudar o formato, suba `BACKUP_VERSION` e mantenha a leitura das versões anteriores em `parseBackup`.
- **Exportar histórico** gera um CSV (`;`, com BOM, para o Excel em pt-BR) com uma linha por conclusão. Não é reimportável.
- **Importar** valida o arquivo (hábitos inválidos são pulados e contados), mostra um resumo e **mescla por nome**: hábito com o mesmo nome de um existente recebe só os dias que faltam e os lembretes de horários que ainda não tem (até 5). Depois recalcula streaks e ressincroniza os alarmes. É idempotente: importar o mesmo arquivo de novo — inclusive para completar uma importação que falhou no meio — não duplica nada.
- Arquivos: `expo-file-system` (grava no cache), `expo-sharing` (compartilhar) e `expo-document-picker` (escolher o arquivo). As consultas são paginadas (limite de 1000 linhas do Supabase).

### Exclusão de conta

A exclusão roda na Edge Function `supabase/functions/delete-account` — remover o usuário do Supabase Auth exige a chave de serviço, que não pode ir para o app. Ela identifica o usuário pelo token da sessão, apaga os dados de todas as tabelas, o avatar (`avatars/<id>/`) e, por último, o usuário do Auth (se algo falhar no meio, dá para tentar de novo). Só depois que ela confirma, o app (`services/accountDeletionService.ts`) cancela os alarmes do aparelho, limpa o AsyncStorage e descarta a sessão.

Ao criar uma tabela nova com dados do usuário, inclua-a na função. Deploy (fica fora do `tsc` do app, que não entende os imports do Deno):

```bash
npx supabase functions deploy delete-account --project-ref <ref> --use-api
```

## Problemas conhecidos

- **Export Web quebrado**: `eas update` sem `--platform android` falha, porque o cliente Supabase acessa `AsyncStorage`/`window` durante a renderização estática (SSR) do `expo-router`, e `window` não existe em Node. Não afeta Android/iOS.
- **Ícone de notificação precisa ser monocromático**: silhueta branca sobre transparente — o Android ignora cor em ícones de notificação e usa o alpha channel para desenhar. Um ícone colorido vira um quadrado genérico na barra de status. O `AlarmReceiver` usa o drawable `notification_icon`, gerado pelo plugin do `expo-notifications` a partir de `assets/images/notification-icon.png`.
- **Otimização de bateria de fabricante** (Samsung, Xiaomi, Huawei...) pode encerrar o app e atrasar ou cancelar alarmes mesmo com o `BootReceiver` funcionando, e não tem API para o app verificar. A seção "Lembretes confiáveis" em Configurações → Notificações (`ReminderReliabilityCard`, `services/reminderReliabilityService.ts`) mostra se o app está fora da otimização de bateria do Android e se tem a permissão de alarmes exatos, abre as telas do sistema e dá o caminho específico do fabricante; um aviso único aparece depois do primeiro lembrete criado. De propósito, o app **não** usa `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: ele exige a permissão `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, restrita pela Play Store.

## Pendências conhecidas

- Validação manual das correções de 11–12/11/2026 no aparelho (inclui avatar e perfil): ver [docs/manual-testing.md](docs/manual-testing.md)
- **Widget na tela inicial (Android)**, para marcar sem abrir o app: ficou de fora do roteiro de melhorias de 12/11/2026 por decisão. É nativo (exige build nova, não sai por OTA) e precisaria gravar na mesma fila local do botão "Feito" (`PendingCompletionStorage`).

## Antes de publicar na Play Store

O app hoje é um projeto de portfólio, sem publicação prevista. Se isso mudar, resolva antes:

- **`USE_EXACT_ALARM`** (declarada no `app.json`): a Play Store restringe essa permissão a apps de despertador/agenda e pode recusar a publicação. Remova-a e mantenha só a `SCHEDULE_EXACT_ALARM` (a seção "Lembretes confiáveis" já trata o caso de o usuário revogá-la).
- **Permissões que vêm de dependências** e o app não usa: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`. Descubra a origem no manifesto gerado e bloqueie-as (`android.blockedPermissions` no `app.json`), justificando na "Segurança dos dados" o que ficar.
- **Link web para pedido de exclusão de conta**: o Play Console exige uma página onde o usuário peça a exclusão sem o app (a exclusão pelo app já existe — ver "Exclusão de conta").
- **Política de privacidade** publicada e o formulário de "Segurança dos dados" preenchido (dados coletados: e-mail, nome, avatar, hábitos).
- **Rodar o roteiro de [docs/manual-testing.md](docs/manual-testing.md)** numa build de produção.

## Contribuindo

- Branches: `refactor/`, `fix/`, `feat/` como prefixo (ex: `refactor/habit-details-screen`)
- Commits seguem o padrão `tipo: descrição curta` (`feat`, `fix`, `refactor`, `chore`) com corpo explicando o _porquê_, não só o _o quê_ — especialmente quando a mudança corrige um bug real, não só reorganiza código
- Antes de abrir PR com mudanças nativas (`plugins/`, `app.json`), rode `npx expo prebuild --clean` e confirme que builda
