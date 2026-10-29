# Painel administrativo

O painel fica em `/admin`. Use uma conta existente em Authentication e crie, pelo Console Firebase, o documento `admins/{UID}` com exatamente o UID dessa conta. Um campo como `nome: "Administrador"` é suficiente. A permissão depende da existência do documento; para revogar o acesso administrativo, exclua-o. O campo `tipoConta` continua sendo estudante ou empresa.

## Funcionalidades

- Visão geral com contagens reais de contas, estudantes, empresas, empresas pendentes, vagas abertas, publicações, candidaturas e desafios abertos.
- Aprovação, recusa e retirada de autorização de empresas, com motivo obrigatório e histórico. CNPJ é consultado pelo servidor e exibido somente no painel autorizado.
- Moderação dos comentários por publicação, com confirmação, motivo obrigatório e atualização do contador da publicação na mesma transação.
- Advertências privadas, sem bloqueio ou suspensão automática. O destinatário pode lê-las e confirmar leitura em `/notifications`.
- Histórico administrativo com responsável, destino, motivo e data. O cliente não pode alterar esse histórico.

As listas carregam 25 registros por página; os filtros locais procuram nos registros já carregados. O histórico individual exibe até 25 advertências recentes e a visão geral mostra as últimas 15 ações administrativas. Os indicadores são atualizados ao abrir o painel, após ações de moderação e pelo botão Atualizar painel.

## Configuração e publicação

As funções administrativas e as regras precisam ser publicadas no mesmo projeto Firebase usado pelo site. As mudanças locais não publicam nada automaticamente. Instale as dependências de `functions`, execute `npm run test:admin` e siga a migração de segurança documentada em `security-migration.md` antes de publicar o conjunto de regras.

O menu da conta mostra Administração quando `getAdminSession` confirma a permissão. Também é possível acessar `/admin` diretamente. Cada ação confere a autorização no servidor; as transações de alteração verificam novamente o documento administrativo antes de gravar. Não é necessário permitir leitura pública da coleção `admins`.

As advertências ficam em `users/{UID}/advertencias/{id}`. As regras permitem que o destinatário leia e altere somente a confirmação de leitura. Criação, exclusão e edição da mensagem são exclusivas do servidor. O histórico administrativo fica em `adminAudit`, sem leitura nem escrita direta pelos clientes.

## Validação

`npm run test:admin` em `functions` compila o backend e testa os limites de autorização, validação de estados, identificadores e motivos. Esses testes não substituem os testes de integração das regras no Emulator. Antes de usar em produção, confira com contas de administrador, empresa pendente, empresa aprovada e estudante que apenas as ações correspondentes são aceitas.

Não há um fluxo de criação de novos administradores pelo painel. A concessão inicial permanece sob controle de quem tem acesso administrativo ao projeto Firebase.
