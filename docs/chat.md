# Mensagens

## Como usar

Abra **Mensagens** no cabeçalho ou no menu da conta. Em **Nova conversa**, carregue pessoas da comunidade, busque por nome ou instituição e envie uma apresentação de até 500 caracteres. A busca procura somente nas pessoas já carregadas; o botão de carregar mais amplia a lista.

Também há atalhos nos cartões dos estudantes, nas publicações do feed, nos perfis e nas candidaturas/propostas. Um atalho para outra pessoa usa `/mensagens?to=UID`. A caixa identifica a conversa existente para evitar duplicação.

O destinatário aceita ou recusa a solicitação. Até o aceite, somente a apresentação é exibida. Depois do aceite, cada mensagem pode ter até 2000 caracteres. Enter envia e Shift + Enter quebra a linha. Há confirmação de envio, confirmação de leitura, histórico anterior e filtros de solicitações/não lidas. A leitura só é confirmada com a página visível, em foco e no fim do histórico. O histórico recente carrega 50 mensagens e as anteriores são buscadas sob demanda.

Estudantes podem conversar entre si. Empresa e estudante também podem conversar, desde que a empresa esteja aprovada. Conversas entre duas empresas não estão habilitadas. Se a aprovação de uma empresa for retirada, o histórico é mantido, mas novas mensagens ficam bloqueadas.

## Bloqueio e denúncias

Qualquer participante pode bloquear o contato, inclusive antes de aceitar. Isso interrompe mensagens nos dois sentidos; cada pessoa só pode remover o próprio bloqueio. O histórico continua disponível. Uma solicitação recusada não pode ser reaberta nem substituída pelo remetente.

A denúncia contém um relato de 10 a 1000 caracteres e, se disponível, a última mensagem recebida carregada na tela. A evidência é conferida pelas regras contra a mensagem original. Uma denúncia por pessoa/conversa é mantida para evitar envios repetidos. As denúncias ficam em `/admin/mensagens`, com acesso pelo painel administrativo. O administrador pode marcar uma denúncia como em análise ou concluída e usar o painel principal para enviar advertências quando necessário. A administração recebe a evidência enviada, sem acesso geral ao histórico privado.

## Dados e regras

- `conversations/{id}`: dois participantes, solicitação, bloqueios, leituras e última mensagem. O serviço usa um ID determinístico para o par. As regras impedem criar outro documento invertendo os participantes para contornar recusa/bloqueio.
- `conversations/{id}/messages/{id}`: autor, texto e data do servidor. Mensagens não podem ser editadas nem excluídas pelo cliente.
- `chatReports/{id}`: relato e evidência, legíveis pelo denunciante e pela administração. O denunciado não lê o relato.

Cada envio grava mensagem e prévia em uma transação. As regras exigem os dois documentos na mesma operação, verificam a autoria, o aceite, o bloqueio, os participantes e a aprovação da empresa. Os IDs de envio são mantidos ao repetir uma tentativa, evitando duplicar uma mensagem após uma falha de rede. Conversas e mensagens só podem ser lidas pelos participantes. Não há anexos, grupos, presença ou notificações externas nesta versão. O indicador do cabeçalho informa o número de conversas não lidas.

O chat não usa Cloud Functions nem Storage. Consome leituras e escritas do Firestore dentro das cotas do projeto. A lista de conversas usa `array-contains` e ordenação local; as mensagens usam a ordenação de data/ID. Não é necessário cadastrar um índice composto específico para este fluxo. Veja a documentação do Firebase sobre [consultas protegidas](https://firebase.google.com/docs/firestore/security/rules-query) e [transações atômicas](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Publicação

Publique as regras no mesmo projeto Firebase usado pelo site, depois publique o código na Vercel:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project nextgen-2d9df
```

Os documentos são criados quando as pessoas começam a usar o chat; não há migração inicial nem alteração de plano.

## Testes

```powershell
npm.cmd run test:chat:unit
npm.cmd run test:chat
npm.cmd run build
```

Os testes de regras precisam de Java 21+ disponível no PATH. Executam no projeto fictício `demo-nextgen-chat`, porta local 8089, e limpam apenas os dados desse emulador. Não acessam produção. Cobrem autorização, aceite, bloqueio, criação invertida, leitura, imutabilidade, evidência de denúncia, revogação de aprovação e o fluxo dos serviços com envio idempotente.
