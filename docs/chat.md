# Mensagens

## Como usar

Abra **Mensagens** no cabeçalho ou no menu da conta. Em **Nova conversa**, carregue pessoas da comunidade, busque por nome ou instituição e envie uma apresentação de até 500 caracteres. A busca procura somente nas pessoas já carregadas; o botão de carregar mais amplia a lista.

Também há atalhos nos cartões dos estudantes, nas publicações do feed, nos perfis e nas candidaturas/propostas. Um atalho para outra pessoa usa `/mensagens?to=UID`. A caixa identifica a conversa existente para evitar duplicação.

O destinatário aceita ou recusa a solicitação. Até o aceite, somente a apresentação é exibida. Depois do aceite, cada mensagem pode ter até 2000 caracteres. Enter envia e Shift + Enter quebra a linha. Há confirmação de envio (`✓ Enviada`), confirmação de leitura (`✓✓ Visto`), histórico anterior e filtros de solicitações/não lidas. A leitura só é confirmada com a página visível, em foco, no fim do histórico e após carregar a mensagem mais recente com confirmação do servidor. Uma transação confere se a última mensagem continua sendo a que estava na tela, evitando confirmar uma mensagem nova ainda não carregada. O histórico recente carrega 50 mensagens e as anteriores são buscadas sob demanda.

Estudantes podem conversar entre si. Empresa e estudante também podem conversar, desde que a empresa esteja aprovada. Conversas entre duas empresas não estão habilitadas. Se a aprovação de uma empresa for retirada, o histórico é mantido, mas novas mensagens ficam bloqueadas.

## Amigos e pedidos

Abra **Amigos** na caixa de mensagens ou no menu da conta. A área tem listas de amigos, pedidos recebidos e enviados, com busca por nome. Em **Encontrar pessoas** ou no cabeçalho de uma conversa, use **Adicionar amigo**. O destinatário pode aceitar ou recusar; o remetente pode cancelar um pedido pendente. Qualquer amigo pode remover a amizade. Empresas aprovadas também podem adicionar estudantes.

Uma amizade não dá acesso ao histórico de outras conversas nem substitui o aceite da solicitação de conversa. Recusas não podem ser apagadas pelo remetente para reenviar o mesmo pedido. Quem recusou pode dispensar o registro. Não é possível criar outro pedido invertendo os participantes para contornar uma recusa. O bloqueio da conversa impede novos pedidos e o aceite de amizade entre o par.

O ícone de mensagens no cabeçalho soma conversas não lidas e pedidos de amizade recebidos. Quando só há pedidos de amizade, o atalho abre a área de amigos. Não há notificações push ou por e-mail.

## Online e privacidade

Em **Privacidade das mensagens**, cada conta pode ativar ou desativar **Mostrar quando estou online** e **Enviar confirmação de leitura**. As preferências sincronizam entre dispositivos e começam ativadas. Confirmações já enviadas permanecem no histórico; desativar interrompe novas confirmações. O registro privado de leitura continua limpando o indicador de não lidas sem informar a leitura ao contato. Enviar uma mensagem não publica automaticamente a leitura das anteriores.

O status online aparece na conversa aceita e na lista de amigos. As regras permitem consultar o status somente ao próprio usuário e a amigos ou contatos com conversa aceita, respeitando os tipos de conta e a aprovação da empresa. Bloqueios impedem a consulta mesmo se a amizade continuar existente. O status não pode ser listado para monitorar toda a comunidade. Ocultar o online também apaga o horário da última atividade no documento compartilhado; não exibimos “visto por último”.

Esta implementação usa atividade recente no Firestore: uma aba visível e com rede atualiza o horário do servidor a cada 45 segundos. O indicador expira após cerca de dois minutos sem atualização, com verificação visual a cada dez segundos. Abas ocultas param de renovar; fechar uma aba não marca outras abas ou dispositivos como offline. Não é uma detecção instantânea de desconexão. Essa escolha evita acrescentar Realtime Database ou Cloud Functions ao projeto. O Firebase documenta uma solução diferente para presença nativa com Realtime Database e Functions em [Presença no Firestore](https://firebase.google.com/docs/firestore/solutions/presence).

## Bloqueio e denúncias

Qualquer participante pode bloquear o contato, inclusive antes de aceitar. Isso interrompe mensagens nos dois sentidos; cada pessoa só pode remover o próprio bloqueio. O histórico continua disponível. Uma solicitação recusada não pode ser reaberta nem substituída pelo remetente.

A denúncia contém um relato de 10 a 1000 caracteres e, se disponível, a última mensagem recebida carregada na tela. A evidência é conferida pelas regras contra a mensagem original. Uma denúncia por pessoa/conversa é mantida para evitar envios repetidos. As denúncias ficam em `/admin/mensagens`, com acesso pelo painel administrativo. O administrador pode marcar uma denúncia como em análise ou concluída e usar o painel principal para enviar advertências quando necessário. A administração recebe a evidência enviada, sem acesso geral ao histórico privado.

## Dados e regras

- `conversations/{id}`: dois participantes, solicitação, bloqueios, leituras e última mensagem. O serviço usa um ID determinístico para o par. As regras impedem criar outro documento invertendo os participantes para contornar recusa/bloqueio.
- `conversations/{id}/messages/{id}`: autor, texto e data do servidor. Mensagens não podem ser editadas nem excluídas pelo cliente.
- `chatReports/{id}`: relato e evidência, legíveis pelo denunciante e pela administração. O denunciado não lê o relato.
- `friendships/{id}`: par de contas, solicitante, estado e datas do servidor. Leitura restrita aos participantes; somente o destinatário aceita ou recusa.
- `chatStatus/{uid}`: preferências e horário da última atividade. Somente o dono altera; consulta restrita aos contatos autorizados, sem listagem geral.
- `chatInbox/{uid}/conversations/{id}`: cursor de leitura privado, acessível somente ao dono. Usado junto ao histórico de leituras compartilhadas para calcular não lidas.

Cada envio grava mensagem e prévia em uma transação. As regras exigem os dois documentos na mesma operação, verificam a autoria, o aceite, o bloqueio, os participantes e a aprovação da empresa. Os IDs de envio são mantidos ao repetir uma tentativa, evitando duplicar uma mensagem após uma falha de rede. Conversas e mensagens só podem ser lidas pelos participantes. Não há anexos, grupos ou notificações externas nesta versão.

O chat não usa Cloud Functions nem Storage. Consome leituras e escritas do Firestore dentro das cotas do projeto; presença acrescenta uma leitura e uma escrita por renovação em cada aba visível. Ocultar o online interrompe as renovações. A lista de conversas e de amizades usa `array-contains` e ordenação local; as mensagens usam a ordenação de data/ID. Não é necessário cadastrar um índice composto específico para este fluxo. Veja a documentação do Firebase sobre [consultas protegidas](https://firebase.google.com/docs/firestore/security/rules-query) e [transações atômicas](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Publicação

Publique as regras no mesmo projeto Firebase usado pelo site, depois publique o código na Vercel:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project nextgen-2d9df
```

Os documentos são criados quando as pessoas começam a usar o chat; não há migração inicial nem alteração de plano.

As novas regras precisam estar publicadas antes da nova interface. Esta alteração não precisa da credencial administrativa usada pelos desafios. O deploy das regras e a publicação na Vercel são etapas de produção separadas dos commits locais.

## Testes

```powershell
npm.cmd run test:chat:unit
npm.cmd run test:chat
npm.cmd run build
```

Os testes de regras precisam de Java 21+ disponível no PATH. Executam no projeto fictício `demo-nextgen-chat`, porta local 8089, e limpam apenas os dados desse emulador. Não acessam produção. Cobrem autorização, aceite, bloqueio, criação invertida, leitura privada, preferência de leitura, presença restrita e expirada, imutabilidade, evidência de denúncia, revogação de aprovação, amizades e o fluxo dos serviços com envio idempotente.

### Roteiro manual com duas contas

1. Use dois navegadores ou perfis distintos, com dois estudantes ou um estudante e uma empresa aprovada.
2. Na primeira conta, encontre a segunda e envie um pedido de amizade. Confira o contador no cabeçalho da segunda, aceite em **Amigos → Recebidos** e confira as duas listas.
3. Abra uma conversa aceita. Com os dois sites visíveis, confira **Online agora**. Oculte o online em uma conta e confira se o indicador desaparece na outra. Reative e aguarde a renovação.
4. Envie uma mensagem com o outro chat fechado. Deve aparecer **Enviada**. Abra o chat na outra conta, com foco e no fim do histórico; deve mudar para **Visto**.
5. Desative a confirmação na segunda conta, envie outra mensagem e leia. A primeira deve continuar vendo **Enviada**, enquanto o contador de não lidas da segunda é limpo. Reative enquanto estiver lendo o chat para confirmar novamente.
6. Com o histórico rolado para cima, receba mensagens novas. Elas não devem ser confirmadas até voltar ao fim. Repita com a aba em segundo plano.
7. Bloqueie o contato. Confira a ausência do online, a interrupção dos envios e a recusa de novos pedidos. Ao desbloquear, o indicador pode voltar se houver amizade ou conversa aceita.
8. Cancele um pedido, recuse outro e remova uma amizade. Confira as atualizações nas duas contas. Repita em tela estreita, usando **Voltar às conversas**.
9. Feche uma de duas abas da mesma conta: a outra deve continuar renovando a presença. Feche todas e aguarde cerca de dois minutos para o indicador expirar.

O roteiro manual de interface em navegadores autenticados permanece como verificação de publicação; os testes automatizados exercitam os serviços reais e as regras no emulador.
