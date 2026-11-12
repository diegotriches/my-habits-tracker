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

## 9. Lembretes confiáveis (bateria e alarmes exatos)

- [ ] Configurações → Notificações mostra a seção "Lembretes confiáveis" com o estado de "Otimização de bateria" e "Alarmes e lembretes"
- [ ] Com o app otimizado, "Ajustar" da bateria abre a tela do sistema; ao marcar "Não otimizar"/"Sem restrições" e voltar, a linha fica verde sem reabrir a tela
- [ ] Revogar "Alarmes e lembretes" do app nas configurações do Android: a linha fica amarela, e "Ajustar" abre direto a página do app
- [ ] Em Samsung/Xiaomi, aparece a dica com o caminho do fabricante
- [ ] Com algo a ajustar, criar o primeiro lembrete (pelo modal e pela criação de hábito) mostra o aviso "Garanta seus lembretes" uma única vez; "Ajustar" leva à seção
- [ ] Com tudo liberado, o aviso não aparece

## 10. Marcações offline (fila de saída)

- [ ] Online: marcar/desmarcar hoje e dias passados (home e detalhes) continua instantâneo e persiste ao reabrir o app
- [ ] Hábito com meta: registrar valor hoje (somar e substituir) e num dia passado; o modal mostra o valor **do dia escolhido**
- [ ] Com o app aberto, ativar o modo avião e marcar/desmarcar alguns dias: nada reverte nem mostra erro
- [ ] Ainda offline, marcar e desmarcar o mesmo dia: ao reconectar, o dia fica desmarcado (só a última vale)
- [ ] Desativar o modo avião e voltar ao app (sair e entrar): as marcações aparecem no banco (puxar para atualizar / reabrir) e os streaks se atualizam
- [ ] Marcar offline, **fechar o app** (recentes), religar a rede e abrir: a home se atualiza sozinha com as marcações enviadas
- [ ] Marcar hoje offline às 23:5x e enviar depois da meia-noite: a conclusão fica no dia em que foi marcada
- [ ] Excluir um hábito em outro aparelho com uma marcação dele pendente: ao enviar, a marcação é descartada sem travar as demais

## 11. Abrir o app offline (cache de leitura)

- [ ] Com o app usado online antes, fechar o app, ativar o modo avião e abrir: entra direto na home (sem ir para o login), com hábitos, semana atual, streaks, nome e avatar
- [ ] Mesmo teste mais de 1 hora depois do último uso online (token expirado): continua entrando sem login
- [ ] Offline, abrir os detalhes de um hábito já visto: abre com calendário e estatísticas; um hábito nunca aberto mostra a tela de erro
- [ ] Offline, marcar/desmarcar dias, fechar e reabrir o app ainda offline: as marcações continuam na tela
- [ ] Religar a rede e voltar ao app: as marcações vão para o banco e a tela se atualiza
- [ ] Offline, tentar criar, editar e excluir um hábito: aparece "Sem conexão. Esta ação precisa de internet..."
- [ ] Sair da conta e entrar com outra: nada da conta anterior aparece

## 12. Reconexão, indicador e ações que exigem internet (build nova: NetInfo é nativo)

- [ ] Modo avião: a faixa "Sem conexão · suas marcações ficam salvas no aparelho" aparece na home; ao marcar, vira "Sem conexão · 1 alteração aguardando envio" (o número acompanha)
- [ ] Desativar o modo avião **com o app aberto**: a faixa mostra "Enviando..." e some sozinha, sem sair do app; as marcações chegam ao banco
- [ ] Abrir o app offline e depois reconectar: os lembretes são ressincronizados (log `Lembretes ressincronizados` após `Conexao restabelecida`)
- [ ] Offline, tentar: criar/editar/excluir hábito, criar/editar/ativar/excluir lembrete, editar nome, trocar avatar, mudar notificações de progresso e excluir conta → em todos aparece "Sem conexão" antes de qualquer outra coisa, e nada muda
- [ ] Wi-Fi conectado mas sem internet (ex.: roteador sem link): o app também se considera offline

## 13. Backup e exportação (build nova: módulos de arquivo são nativos)

- [ ] Dados e Privacidade → Exportar backup: abre o compartilhamento com `habitos-backup-AAAA-MM-DD.json`; salvar no Drive/Arquivos funciona
- [ ] Exportar histórico: o CSV abre no Excel/Sheets com colunas separadas e acentos corretos
- [ ] Importar o backup na **mesma conta**: o resumo mostra 0 novos e N já existentes; ao confirmar, nada é duplicado (0 conclusões adicionadas)
- [ ] Importar numa **conta descartável** vazia: hábitos, conclusões e lembretes aparecem; os lembretes tocam no horário; os streaks estão corretos
- [ ] Importar um arquivo qualquer (não-backup): aparece "Arquivo inválido" e nada muda
- [ ] Offline, tocar em exportar/importar: aparece "Sem conexão"
- [ ] Histórico grande (mais de 1000 conclusões no total): exporta tudo (confira a contagem de linhas do CSV)
- [ ] Depois de importar, a home já mostra os hábitos novos sem precisar puxar para atualizar

## 14. Correções rápidas da revisão

- [ ] Home: a data aparece como "Quarta-feira, 11 de novembro" (só a primeira letra maiúscula) e o navegador de semanas como "8 - 14 de nov" / "29 nov - 5 dez"
- [ ] Home carrega a semana normalmente (a consulta foi enxugada), inclusive aberta offline pelo cache
- [ ] Detalhes e streaks de um hábito continuam corretos (agora paginados)
- [ ] Em build de produção, abrir `habittracker://debug/notifications` (ex.: `adb shell am start -a android.intent.action.VIEW -d "habittracker://debug/notifications"`) leva à home, não à tela de debug

## 15. Limpeza do template e lint

- [ ] Abrir um link inexistente (ex.: `adb shell am start -a android.intent.action.VIEW -d "habittracker://nao-existe"`): aparece "Página não encontrada" em português, no tema do app, e "Voltar para o início" leva à home
- [ ] Arrastar hábitos para reordenar na home continua funcionando (houve limpeza no `DraggableHabitList`)
- [ ] Confete ao concluir um hábito continua aparecendo (houve limpeza no `Confetti`)

## 16. Revisão das dependências de efeitos (hooks)

- [ ] A home, os detalhes, o perfil e as configurações de notificação carregam normalmente; puxar para atualizar funciona
- [ ] Abrir o app offline e reconectar: a home se atualiza sozinha (a busca depende da renovação do token)
- [ ] Os toasts ("Completado!", "Hábito desmarcado", erros) somem sozinhos depois de ~3 s, inclusive marcando outros dias enquanto um toast está na tela
- [ ] Confete: as peças caem sem "pular" de posição, mesmo com o toast aparecendo junto
- [ ] Modal de progresso (meta numérica): abre com o valor atual; enquanto digita, o valor não é apagado (ex.: com marcações offline sendo enviadas ao reconectar)
- [ ] Tema "Automático": trocar o tema do sistema muda o app na hora
- [ ] Reordenar hábitos, criar um hábito novo e reabrir o app: a ordem é mantida e o novo aparece no fim
- [ ] Login com Google e logout/login com e-mail continuam funcionando (o redirecionamento do layout ganhou o `router` nas dependências)

## 17. Resumo do dia e celebração

- [ ] Home na semana atual: aparece "X de Y hoje" com barra; marcar um hábito avança na hora (inclusive offline)
- [ ] Hábito de dias específicos fora do dia não entra na conta; hábito "3x por semana" sai da conta depois de bater a meta da semana (e volta na semana seguinte)
- [ ] Hábito com meta numérica só conta como feito ao atingir o valor
- [ ] Ao concluir o último hábito do dia: "Tudo feito hoje!" e confete; marcar os outros hábitos **não** solta confete
- [ ] Abrir o app com o dia já completo: mostra "Tudo feito hoje!" sem confete
- [ ] Navegar para outra semana: o resumo some; voltar para a atual: reaparece
- [ ] Marcar hoje um hábito diário feito ontem: toast "Completado! · N dias seguidos" com N = streak anterior + 1 (também offline); sem ontem, só "Completado!"
- [ ] Hábito de dias específicos (ex.: seg/qua/sex) feito no dia programado anterior: o toast soma o streak
- [ ] Meta numérica: o "N dias seguidos" só aparece no registro que atinge a meta; hábito "3x por semana" não mostra
- [ ] Ao alcançar 7 dias seguidos (ex.: hábito com 6 dias, marcar hoje): confete mesmo sem o dia completo

## 18. Hábitos negativos e acessibilidade

- [ ] Hábito negativo na home: etiqueta "EVITAR" ao lado do nome; dia marcado fica **verde** com escudo; marcar hoje mostra "Evitado hoje!"
- [ ] Criação de hábito: a opção "Negativo" explica "Marque os dias em que evitou"; o indicador do tipo explica que cada dia evitado conta no streak
- [ ] Com o **TalkBack** ligado (Configurações → Acessibilidade), na home: tocar num dia anuncia, por exemplo, "hoje, quarta-feira, 11 de novembro, não feito, toque para marcar"; num hábito com meta, "60% da meta"; num negativo, "evitado"
- [ ] Com o TalkBack, o nome do hábito anuncia "X de Y nesta semana, N dias seguidos" e o resumo do dia "3 de 5 hábitos feitos hoje"
- [ ] Com o TalkBack, no calendário dos detalhes os dias também são anunciados com o estado
