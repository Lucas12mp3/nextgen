# Percurso principal sem Cloud Functions

## Implementado nesta etapa

Cadastro usa Firebase Authentication e um batch do Firestore. O perfil público contém UID, nome, tipo de conta, data de criação e, para empresas, ramo e status inicial `pending`. CPF/CNPJ e nascimento ficam exclusivamente em `users/{UID}/privado/dados`. A conta pública e os dados privados devem ser criados na mesma operação. O cliente não pode criar administradores, alterar o tipo de conta nem se autoaprovar.

A data de nascimento dos novos cadastros é um Timestamp. O perfil mantém compatibilidade com as datas antigas em texto. A idade declarada mínima de 16 anos é conferida no serviço e nas regras usando o dia do aniversário em UTC; documentos e datas informados não constituem verificação de identidade. Não há promessa de validação documental. Os dígitos verificadores de CPF/CNPJ são conferidos no formulário/serviço; as regras validam o formato e não usam esse número para conceder privilégios.

Publicar vaga lê o nome da empresa no banco, exige aprovação e aceita apenas os campos previstos, com limites de tamanho e status inicial aberto. O cadastro e a publicação deixaram de chamar Functions. Candidaturas, propostas, perfis, administração e chat já usam os serviços diretos documentados nas outras páginas.

`/recuperar-senha` usa a recuperação de senha do Firebase Authentication. A tela exibe uma resposta genérica para não confirmar se um e-mail tem conta. O envio real deve ser conferido com uma caixa de teste; os testes automatizados não enviam e-mails.

## Publicação

Publique as regras e depois a versão correspondente do site:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project nextgen-2d9df
```

O projeto precisa ter login por e-mail/senha habilitado no Firebase Authentication. Esta etapa não altera configurações do Firebase nem migra dados antigos. Se registros antigos ainda contiverem CPF, nascimento, e-mail ou links de currículo no documento público, precisam ser auditados e migrados antes de convidar usuários reais.

## Roteiro para conferir na demonstração

1. Cadastrar uma empresa e confirmar que aparece como pendente.
2. Entrar como administrador e aprovar a empresa com justificativa.
3. Voltar à empresa e publicar uma vaga com título, descrição, requisitos, modalidade e local.
4. Cadastrar um estudante com dados de demonstração adequados e preencher o perfil.
5. Abrir a vaga, candidatar-se e verificar a confirmação e o acompanhamento em Minhas candidaturas.
6. Entrar como empresa, consultar a candidatura e mudar para Em análise.
7. Enviar uma solicitação de conversa; aceitar com o estudante e trocar mensagens.
8. Conferir recuperação de senha usando uma caixa de teste controlada.

Use contextos separados de navegador para as contas. Não publique senhas na documentação, nos slides ou no repositório. Use conteúdo de demonstração identificado e evite dados pessoais reais na apresentação.

## Verificação automatizada

```powershell
npm.cmd run test:core:unit
npm.cmd run test:core
npm.cmd run build
```

O emulador requer Java 21+ e usa somente o projeto fictício `demo-nextgen-chat`. Os testes cobrem criação atômica, leitura privada, idade mínima, tentativa de autoaprovação, publicação autorizada, campos forjados, candidatura duplicada e atualização do status. A criação da identidade no Auth é simulada nos testes de integração do serviço; as regras e gravações do Firestore são reais no emulador.

## Próximos passos

Seguir `plano-tcc.md`. Desafios ainda usam Functions para criar, fechar e corrigir. A correção não foi movida para o navegador: isso permitiria manipular resultados ou revelar gabaritos. Currículos ainda dependem da disponibilidade e das regras do Storage, conforme `applications-spark.md`.
