# Roteiro de melhorias (revisão de 12/11/2026)

Documento de trabalho: atualize o progresso a cada etapa e **exclua este arquivo** quando tudo estiver concluído (registrando no README o que for definitivo). Cada etapa vai numa branch própria; os testes no aparelho de cada uma entram em `docs/manual-testing.md`.

Ordem combinada: **A → B → C → D**. As correções primeiro; depois testes e CI, que protegem o que vier em seguida.

## A. Correções rápidas — branch `fix/review-quick-fixes` — implementada, aguardando teste no aparelho

- [x] **Limite de 1000 linhas do Supabase**: `recalculateStreak` e a tela de detalhes buscam todas as conclusões de um hábito sem paginação; acima de 1000 conclusões (~2,7 anos de uso diário) streak, recorde e estatísticas ficam errados em silêncio. Paginado com `fetchAllRows` (`services/supabase.ts`), também usado pela exportação. De quebra: o `recalculateStreak` ignorava o erro da consulta e podia **zerar o streak** numa falha de rede — agora interrompe o recálculo.
- [x] **Busca da semana pesada**: a home traz o hábito inteiro junto de cada conclusão (`habits!inner (*)`), inflando a resposta e o cache offline. Agora `habits!inner (user_id)`, só para filtrar pelo dono.
- [x] **Tela de debug em produção**: `/debug/notifications` abre por deep link em qualquer build. `app/debug/_layout.tsx` redireciona para a home fora de `__DEV__`.
- [x] **Maiúsculas nas datas**: `textTransform: 'capitalize'` gera "Quarta-Feira, 11 De Novembro" e "8 - 14 De Nov"; o certo é só a primeira letra. Novo `capitalizeFirst` (`utils/text.ts`); "novembro 2026" no calendário continua com `capitalize` (sem "de", fica certo).

## B. Qualidade de código

- [x] **Testes automatizados** (Jest) para a lógica pura: cálculo de streak, `applyPendingOps`, `parseBackup`, `backupToCsv`, helpers de datas/agenda. Branch `chore/automated-tests`: 55 testes; a lógica foi extraída para módulos puros em `utils/` (`streak`, `completionOps`, `backupFormat`), com os serviços reexportando. O teste do template (`StyledText-test.js`) saiu.
- [x] **ESLint + Prettier** (script `lint`) e **CI** no GitHub Actions rodando `tsc`, lint e testes a cada push. Branch `chore/lint-and-ci`: regras do Expo + `eslint-config-prettier`; 4 erros e 32 avisos corrigidos; o código todo formatado num commit só de formatação.
- [x] **Restos do template do Expo** (removidos na `chore/lint-and-ci`; a tela 404 foi reescrita em português com o tema do app): `components/__tests__/StyledText-test.js`, `app/modal.tsx`, `app/+html.tsx`, `utils/supabaseHelpers.ts` (sem uso) e o que mais aparecer.
- [x] **Renomear `retroactiveCompletionService` → `streakService`** (hoje só calcula streaks). Branch `refactor/streak-service-and-hook-deps`.
- [x] **Revisar os 24 avisos de `react-hooks/exhaustive-deps`** do lint, um a um (corrigir no automático muda o comportamento dos efeitos e pode criar loops). Os 4 `require()` do `app/_layout.tsx` são do fluxo do OAuth e ficam como estão. Feito na `refactor/streak-service-and-hook-deps`: buscas de dados em `useCallback` (dependendo de `user`), callbacks de props em ref (`SuccessToast`), valor lido só ao abrir em ref (`HabitProgressInput`), efeito morto removido (`ThemeContext`), ordem dos hábitos protegida contra resposta atrasada, confetes sorteados uma vez (pulavam de posição a cada render). O callback do OAuth e a tela de debug ficaram com `eslint-disable` comentado.

## C. Visual e experiência

- [x] **Resumo do dia** no topo da home ("3 de 5 hoje" + barra de progresso). `utils/todaySummary.ts` (com testes) + `TodaySummaryCard`; hábitos com meta semanal só contam enquanto a meta da semana não foi batida.
- [x] **Celebração com propósito**: confete só ao concluir todos os hábitos do dia e em marcos de streak (7, 30, 100...), não a cada marcação. Feito o "tudo feito hoje"; os marcos de streak ficam com o item do "N dias seguidos", que calcula o streak localmente.
- [x] **Hábitos negativos**: deixar claro o que marcar significa ("Resisti hoje"). Etiqueta "Evitar" no card, dia evitado em verde (era amarelo, parecia algo ruim), toast "Evitado hoje!" e descrições que dizem o que marcar.
- [x] **Acessibilidade**: rótulos para leitores de tela nos dias da semana e no calendário ("Terça, 11 de novembro, concluído"). `utils/a11y.ts` (com testes) gera rótulo, dica e estado de cada dia na home e no calendário dos detalhes; o cabeçalho de cada hábito anuncia o progresso da semana e o streak, e o resumo do dia tem rótulo próprio.
- [ ] **"N dias seguidos" de volta** no toast de hoje, calculado localmente (sumiu com a fila offline).

## D. Funcionalidades

- [ ] **Arquivar hábitos**: a exclusão já é lógica (`is_active = false`); oferecer "Arquivar" e uma lista de arquivados para restaurar.
- [ ] **Visão geral de estatísticas**: mapa de calor do ano (estilo GitHub) com todos os hábitos.
- [ ] **Widget na tela inicial (Android)**: marcar sem abrir o app. Nativo e trabalhoso — decidir quando chegar aqui.
