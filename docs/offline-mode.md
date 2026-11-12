# Plano: marcar hábitos offline

Documento de trabalho para guiar o desenvolvimento. Atualize o progresso a cada fase e **exclua este arquivo** quando tudo estiver concluído (registrando no README o que for definitivo).

## Objetivo

Permitir marcar e desmarcar hábitos sem conexão. As alterações ficam no aparelho e são enviadas ao banco quando a conexão voltar, sem perda nem duplicação.

Hoje, sem internet, a marcação falha e a UI reverte — e o app nem consegue abrir a home, porque tudo é buscado do Supabase ao iniciar.

## Escopo

**Dentro:** marcar/desmarcar dias (home e detalhes), inclusive valores de metas numéricas; abrir o app offline e ver os hábitos e as últimas semanas.

**Fora (continua exigindo conexão, com mensagem clara):** criar, editar e excluir hábitos; lembretes; perfil; exclusão de conta. Esses envolvem ids gerados no servidor, alarmes e storage — muito custo para pouco ganho.

## O que já existe e será aproveitado

- **UI otimista** na home (`applyOptimistic`/`settle` em `useWeeklyCompletions`) e nos detalhes (setters do `useHabitDetails`): a tela já atualiza antes da rede.
- **Fila do botão "Feito"** (`PendingCompletionStorage.java` + `services/pendingCompletionService.ts`): grava localmente e envia depois, de forma idempotente — o mesmo padrão, só que hoje restrito à notificação.
- **Envio idempotente**: o padrão do antigo `completeRetroactively`/`uncompleteRetroactively` (não inserir se o dia já está concluído; apagar o dia inteiro e tratar "nada a apagar" como sucesso) — hoje dentro da própria fila.
- **Recálculo de streak** a partir do histórico (`recalculateStreak`), sem depender da ordem das marcações.

## Decisões de desenho

1. **Fila de saída (outbox) em JS**, persistida no AsyncStorage: cada item é `{ id, habitId, day: 'yyyy-MM-dd', kind: 'complete' | 'uncomplete', value?, createdAt }`. A fila nativa do "Feito" continua existindo e é drenada pelo mesmo processo.
2. **Compactação por hábito + dia**: uma nova operação substitui a anterior do mesmo hábito/dia (marcar e depois desmarcar offline = nada a enviar).
3. **Conflitos: vale a última alteração de cada hábito/dia.** Conflito real só existe com dois aparelhos offline ao mesmo tempo; uma regra simples e previsível basta.
4. **Metas numéricas**: a fila guarda o **valor final** calculado no aparelho (não "somar X"), para o reenvio ser idempotente.
5. **Dia local**: a operação guarda o dia (`yyyy-MM-dd`, fuso local) em que foi feita, e não um horário — vale a regra de datas do CLAUDE.md.
6. **Falha de rede não reverte a UI**: a operação fica na fila. Só erros permanentes (hábito excluído, sem permissão) descartam a operação e revertem.
7. **Cache de leitura** no AsyncStorage: hábitos, streaks e conclusões das últimas ~8 semanas. Ao abrir, a home mostra o cache na hora e atualiza do banco em segundo plano; as operações pendentes da fila são aplicadas por cima (mesmo princípio do `applyOptimistic`).
8. **Streaks offline** podem ficar desatualizados; são recalculados quando a fila é enviada.
9. **Quando enviar**: ao abrir, ao voltar para o primeiro plano, logo após cada operação (se houver rede) e quando a conexão volta (`@react-native-community/netinfo`, dependência nativa).

## Fases

Cada fase numa branch própria, testável no aparelho antes da seguinte.

### Fase 1 — Fila de saída para marcações (só JS) — implementada, aguardando teste no aparelho
Resolve perder a conexão com o app aberto. Branch `feat/offline-outbox`.
- [x] `services/completionOutbox.ts`: persistência, compactação por hábito/dia e envio em ordem
- [x] Unificar o envio com a fila do "Feito" (`pendingCompletionService.drain` drena as duas)
- [x] Home (hoje e dias passados) e detalhes passam a enfileirar; falha de rede não reverte
- [x] Recalcular streaks dos hábitos afetados após o envio
- [x] Removidos `useCompletions`, `completeRetroactively`/`uncompleteRetroactively` e `updateStreakWithFrequency` (sem uso)
- [ ] Testes no aparelho (seção 10 de `docs/manual-testing.md`)

Limitações conhecidas desta fase: com operações pendentes de uma sessão anterior, a home mostra o estado do banco até a fila ser enviada (há um refetch automático em seguida); o toast de hoje mostra só "Completado!" (antes trazia "N dias seguidos", que dependia da resposta do servidor).

### Fase 2 — Abrir o app offline (só JS)
- [ ] Cache de hábitos, streaks e conclusões recentes, atualizado a cada busca bem-sucedida
- [ ] Home e detalhes carregam do cache primeiro e aplicam a fila por cima
- [ ] Cache limpo no logout e na exclusão de conta
- [ ] Ações fora do escopo (criar/editar hábito etc.) mostram mensagem clara quando offline

### Fase 3 — Reconexão e indicador (nativo: exige build)
- [ ] Adicionar `@react-native-community/netinfo` e drenar a fila quando a conexão voltar
- [ ] Indicador discreto de pendências (ex.: "2 alterações aguardando conexão")

## Pontos de atenção

- **Formato do cache** precisa de versão: ao mudar o schema, descartar caches antigos em vez de quebrar a leitura.
- **Dois aparelhos**: o cache de um pode ficar defasado até a próxima busca online — aceitável dentro da regra "última alteração vale".
- **Virada do dia offline**: operações guardam o dia, então marcar às 23:59 e enviar no dia seguinte grava o dia certo.
- **Testes**: combinar modo avião, reabertura do app, virada do dia e dois aparelhos.

## Em aberto

- **AsyncStorage ou SQLite?** O plano usa AsyncStorage (volume pequeno, já usado no app). O `expo-sqlite` está instalado e sem uso; se não for adotado, pode ser removido das dependências.
