# Roteiro de testes manuais pendentes

Testes que ainda precisam ser feitos no aparelho para as correções de 11–12/11/2026 (não há testes automatizados). Marque cada item ao concluir e remova a seção quando estiver toda validada.

Já validado no Galaxy S23 nessa época: alarmes (desativar/editar/excluir lembrete, vários lembretes por hábito, frequência, "Adiar"), ressincronização ao reinstalar/offline/lembrete iminente, ícone, toque na notificação, "Feito" com o app fechado e aberto, "Registrar", sons Sino e Gota d'água, horário sem deriva, reboot e nome atualizado após editar.

## Preparação

- Teste a partir de uma build da `main` (`npx expo run:android --variant release --no-bundler` ou `eas build --profile preview`) — ver o README sobre build local no Windows.
- Para a exclusão de conta, use uma **conta descartável** (ex.: outra conta Google). Nunca a sua.

## 1. Versão publicada contra o banco novo — prioritário

A migration `20261111202805_tighten_schema_and_cleanup.sql` já está aplicada em produção. Confirme na **versão atualmente publicada** do app (antes da build nova):

- [ ] Criar hábito sem meta, com meta numérica e com meta semanal (ex.: 3x por semana)
- [ ] Editar um hábito (frequência, meta, cor)
- [ ] Marcar e desmarcar dias na home e nos detalhes
- [ ] Configurar notificações de progresso de um hábito com meta
- [ ] Editar o perfil (nome e avatar)

Repita os mesmos itens na build nova.

## 2. Exclusão de conta (conta descartável)

- [ ] Na conta de teste, criar: hábito com meta, lembrete, algumas conclusões, notificações de progresso e avatar
- [ ] Configurações → Privacidade → excluir a conta: aparece "Conta Excluída" e volta ao login
- [ ] No painel do Supabase: o usuário sumiu de **Authentication → Users** e a pasta dele sumiu de **Storage → avatars**
- [ ] Nenhum lembrete da conta de teste dispara depois
- [ ] Entrar de novo com a mesma conta: começa do zero, sem hábitos
- [ ] Sem internet, tentar excluir: aparece erro e nada é apagado (a conta continua funcionando)

## 3. Notificações

- [ ] **"Feito" offline**: com o app fechado e em modo avião, tocar em "Feito"; ao abrir o app ainda offline, o hábito **não** aparece concluído; desativar o modo avião e voltar ao app → aparece concluído
- [ ] Sons **Carrilhão** e **Silencioso** (celular no modo com som; o silencioso não toca nada)
- [ ] Preview do som nas configurações toca o som escolhido

## 4. Home e conclusões (correções só de JS, nunca validadas no aparelho)

- [ ] Marcar 3–4 dias passados bem rápido e logo em seguida marcar hoje: nenhum dia pisca ou some
- [ ] Marcar um dia passado e puxar para atualizar na hora: continua marcado
- [ ] Trocar de semana várias vezes rápido: a semana exibida bate com o cabeçalho
- [ ] Desmarcar um dia passado, trocar de semana e voltar: continua desmarcado
- [ ] Sem internet, marcar e desmarcar um dia passado: a UI reverte e mostra erro
- [ ] Sem internet, editar o valor de um dia com meta no calendário dos detalhes: o valor antigo volta
- [ ] Virada do dia com o app aberto (ou mudando o horário do celular): o hábito de ontem deixa de aparecer como feito hoje, e tocar marca o dia novo
- [ ] Virada de sábado para domingo com a home aberta na semana atual: passa para a semana nova

## 5. Detalhes do hábito

- [ ] Marcar um hábito depois das 21h: aparece no dia certo no calendário, nas estatísticas e nos gráficos dos detalhes (igual à home)
- [ ] Gráfico de consistência: conclusões de domingo contam na semana certa

## 6. Atualização para quem já usa o app (build de produção)

Instale a build nova **por cima** da versão publicada (sem desinstalar), num aparelho com lembretes já configurados:

- [ ] Os lembretes continuam disparando sem abrir o app
- [ ] Depois de abrir o app uma vez, os lembretes tocam com o som escolhido e mostram "Feito"/"Registrar" conforme o hábito

## 7. Perfil

- [ ] Upload de avatar e edição de perfil de ponta a ponta

## 8. Card semanal e recorde de streak

- [ ] Hábito com meta semanal (ex.: "3x por semana"): o card da home mostra **x/3** e a barra fica verde ao chegar a 3; com 4 conclusões mostra **4/3** e a barra não passa da borda
- [ ] Hábitos sem meta continuam **x/7** (diários) e **x/(nº de dias)** (dias específicos)
- [ ] Recorde: num hábito diário, marcar dias seguidos até passar o recorde (confira nos detalhes) e desmarcar o último → o recorde volta ao valor anterior
- [ ] Recorde de um hábito com meta semanal continua correto (não cai para zero)
- [ ] Recordes podem cair uma vez para o valor real ao abrir a home (os antigos podiam estar inflados) — confira se os valores fazem sentido
- [ ] Detalhes de um hábito com dias específicos: os dias aparecem em ordem (Seg, Qua, Sex) e a edição mostra os mesmos dias marcados
