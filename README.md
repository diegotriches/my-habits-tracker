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
app/                  # Telas (Expo Router — cada arquivo é uma rota)
  (tabs)/              # Tabs principais (home, perfil)
  habits/               # Detalhes, edição e criação de hábito
  settings/             # Configurações (notificações, privacidade)
components/
  habits/               # Componentes específicos de hábitos
  ui/                    # Componentes genéricos reutilizáveis (BottomSheetModal, Icon, etc.)
  profile/, skeletons/
hooks/                 # Toda a lógica de negócio (ver "Padrão de arquitetura" abaixo)
services/              # Chamadas ao Supabase e serviços de domínio
  retroactiveCompletionService.ts   # completar/desmarcar dias retroativos, cálculo de streak
  notificationService.ts, exactAlarmService.ts
constants/             # Ícones, cores, constantes de formulário compartilhadas
contexts/              # ThemeContext (claro/escuro/automático)
types/supabase.ts      # Tipos gerados do schema do Supabase (não editar; ver CLAUDE.md)
types/database.ts      # Aliases do app sobre os tipos gerados (Habit, Completion, ...)
supabase/migrations/   # Migrations SQL do banco, executadas no SQL Editor
plugins/                # Config plugin do Expo para o módulo nativo de alarmes
  withExactAlarm.js
  java/                 # AlarmReceiver, AlarmStorage, BootReceiver, ExactAlarmModule (Java)
assets/images/          # Ícones, splash, favicon
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

2. Crie um `.env.local` na raiz com as credenciais do Supabase:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Peça o `google-services.json` (necessário para o build Android — referenciado em `app.json`) e coloque na raiz do projeto.

4. Variáveis de sistema (Windows), se for buildar localmente com `expo run:android`:
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

## Build e distribuição

O projeto usa três profiles no `eas.json`:

| Profile | Uso |
|---|---|
| `development` | Build com dev client embutido, para desenvolvimento local com hot reload |
| `preview` | Build de teste (APK), canal `preview` — use este para validar mudanças antes de produção |
| `production` | Build final, canal `production`, incrementa `versionCode` automaticamente |

```bash
eas build --platform android --profile preview
```

Para mudanças **só em JS/TSX** (sem tocar em `plugins/`, `app.json` nativo, ou dependências nativas), não é preciso gerar build novo — publique via OTA:
```bash
eas update --branch preview --platform android --message "descrição da mudança"
```
> Use sempre `--platform android` — o export da versão Web está atualmente quebrado (ver [Problemas conhecidos](#problemas-conhecidos)).

## Padrão de arquitetura

Cada tela grande segue o padrão: **hook(s) para lógica + componentes memoizados para UI**, mantendo o arquivo de tela como orquestrador fino. Exemplos:

- `app/habits/[id].tsx` → `useHabitDetails`, `useHabitCalendarActions`, `useHabitProgressNotifications`, `useDeleteHabitConfirm`, `useActionsMenu`
- `app/habits/edit/[id].tsx` → `useEditHabitForm`
- `app/habits/create.tsx` → `useCreateHabitForm`
- `app/(tabs)/index.tsx` → `useHabitCompletionActions`

Componentes extraídos de UI repetida ou pesada usam `React.memo`. Evite definir componentes (ex: modais) dentro do corpo de outro componente de tela — isso faz o React recriá-los a cada render, causando remount desnecessário da subárvore.

### UI otimista

Marcar/desmarcar um dia retroativamente (no card semanal da home e no calendário de detalhes) **não espera a rede**: o estado local é atualizado na hora, a requisição roda em segundo plano, e só reverte visualmente se der erro. Isso evita travar a UI ao marcar vários dias em sequência. Como consequência, **não há refetch completo após cada sucesso individual** — o estado local se autocorrige na próxima atualização natural (pull-to-refresh, reabrir a tela).

Na home, as mutações passam por `applyOptimistic(op)` do `useWeeklyCompletions`, que devolve um `settle(ok)` a ser chamado quando a requisição termina. Enquanto um refetch puder ter lido o banco antes da gravação, a mutação é reaplicada sobre a resposta — assim, marcar dias e logo em seguida trocar de semana ou puxar para atualizar não "desmarca" nada na tela. Respostas de buscas antigas (fora de ordem) são descartadas. Na tela de detalhes, que só busca ao abrir, o `useHabitDetails` expõe setters simples (`addOptimisticCompletion` / `removeCompletionById` / `removeCompletionForDate`).

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
- **Sons**: no Android 8+ o som pertence ao canal, e um canal não muda de som depois de criado — por isso há um canal por som (`habits`, `habits-water`, `habits-bell`, `habits-chime`, `habits-silent`), criados pelo JS (`services/notifications.ts`, também usados no preview) e, se ainda não existirem, pelo `AlarmReceiver`. Os `.wav` ficam em `assets/sounds/` e entram na build pelo `sounds` do plugin `expo-notifications` no `app.json`
- **Ressincronização ao abrir o app** (`services/reminderSyncService.ts`, chamado pelo `NotificationHandler` após a permissão): os alarmes vivem só no aparelho e se perdem ao reinstalar o app, limpar os dados ou trocar de celular, enquanto os lembretes continuam ativos no banco. A cada login/abertura, o app cancela os alarmes persistidos e reagenda os lembretes ativos dos hábitos ativos — o que também limpa órfãos (lembretes excluídos em outro aparelho, ids legados). Se a busca no banco falhar (ex.: offline), nada é alterado. Também roda depois de salvar a edição de um hábito, já que o nome e a meta numérica ("Feito" x "Registrar") vão gravados no alarme. Só Android

Se mexer em qualquer coisa relacionada a alarmes/lembretes, teste os dois gatilhos (reboot real e reinstalação do app), não só o agendamento inicial.

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

## Antes de publicar na Play Store

O app hoje é um projeto de portfólio, sem publicação prevista. Se isso mudar, resolva antes:

- **`USE_EXACT_ALARM`** (declarada no `app.json`): a Play Store restringe essa permissão a apps de despertador/agenda e pode recusar a publicação. Remova-a e mantenha só a `SCHEDULE_EXACT_ALARM` (a seção "Lembretes confiáveis" já trata o caso de o usuário revogá-la).
- **Permissões que vêm de dependências** e o app não usa: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`. Descubra a origem no manifesto gerado e bloqueie-as (`android.blockedPermissions` no `app.json`), justificando na "Segurança dos dados" o que ficar.
- **Link web para pedido de exclusão de conta**: o Play Console exige uma página onde o usuário peça a exclusão sem o app (a exclusão pelo app já existe — ver "Exclusão de conta").
- **Política de privacidade** publicada e o formulário de "Segurança dos dados" preenchido (dados coletados: e-mail, nome, avatar, hábitos).
- **Rodar o roteiro de [docs/manual-testing.md](docs/manual-testing.md)** numa build de produção.

## Contribuindo

- Branches: `refactor/`, `fix/`, `feat/` como prefixo (ex: `refactor/habit-details-screen`)
- Commits seguem o padrão `tipo: descrição curta` (`feat`, `fix`, `refactor`, `chore`) com corpo explicando o *porquê*, não só o *o quê* — especialmente quando a mudança corrige um bug real, não só reorganiza código
- Antes de abrir PR com mudanças nativas (`plugins/`, `app.json`), rode `npx expo prebuild --clean` e confirme que builda