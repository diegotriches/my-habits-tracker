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
- [ ] **ESLint + Prettier** (script `lint`) e **CI** no GitHub Actions rodando `tsc`, lint e testes a cada push.
- [ ] **Restos do template do Expo**: `components/__tests__/StyledText-test.js`, `app/modal.tsx`, `app/+html.tsx`, `utils/supabaseHelpers.ts` (sem uso) e o que mais aparecer.
- [ ] **Renomear `retroactiveCompletionService` → `streakService`** (hoje só calcula streaks).

## C. Visual e experiência

- [ ] **Resumo do dia** no topo da home ("3 de 5 hoje" + barra de progresso).
- [ ] **Celebração com propósito**: confete só ao concluir todos os hábitos do dia e em marcos de streak (7, 30, 100...), não a cada marcação.
- [ ] **Hábitos negativos**: deixar claro o que marcar significa ("Resisti hoje").
- [ ] **Acessibilidade**: rótulos para leitores de tela nos dias da semana e no calendário ("Terça, 11 de novembro, concluído").
- [ ] **"N dias seguidos" de volta** no toast de hoje, calculado localmente (sumiu com a fila offline).

## D. Funcionalidades

- [ ] **Arquivar hábitos**: a exclusão já é lógica (`is_active = false`); oferecer "Arquivar" e uma lista de arquivados para restaurar.
- [ ] **Visão geral de estatísticas**: mapa de calor do ano (estilo GitHub) com todos os hábitos.
- [ ] **Widget na tela inicial (Android)**: marcar sem abrir o app. Nativo e trabalhoso — decidir quando chegar aqui.
