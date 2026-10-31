# Desafios e ranking com correção no servidor

## Arquitetura atual

As telas usam as rotas do próprio Next.js:

- `POST /api/desafios`: empresa aprovada publica um desafio.
- `POST /api/desafios/fechar`: a empresa proprietária fecha um desafio.
- `POST /api/desafios/tentativa`: estudante envia respostas e recebe a nota calculada no servidor.
- `GET /api/desafios/tentativa?id=ID`: consulta somente o resultado do usuário autenticado.
- `GET /api/desafios`: informa disponibilidade e um código de diagnóstico, sem retornar os valores das credenciais. A tela diferencia ativação pendente de falha de conexão e permite verificar novamente.

As operações autenticadas validam o ID token do Firebase, inclusive conta desativada/sessão revogada, e conferem os perfis e a aprovação da empresa. O servidor deriva a identidade e o nome da empresa do banco. Não aceita nota/pontos enviados pelo estudante. Há verificação de origem, limite de tamanho do corpo e limite de frequência de criação por empresa. As respostas não são armazenadas em cache HTTP.

O Admin SDK acessa o banco no servidor e não depende das regras do cliente; por isso, cada operação da API faz sua própria autorização. Referências: [configuração do Admin SDK](https://firebase.google.com/docs/admin/setup), [validação de ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [sessões revogadas](https://firebase.google.com/docs/auth/admin/manage-sessions).

## Ativar na Vercel

O código foi implementado e testado com emuladores. A ativação no projeto publicado depende da configuração de servidor abaixo. Não é necessário publicar Firebase Cloud Functions para este fluxo: a API executa na hospedagem do Next.js.

1. No Console Firebase do projeto `nextgen-2d9df`, abra **Configurações do projeto → Contas de serviço**. Obtenha uma chave de uma conta de serviço autorizada do próprio projeto pelo fluxo oficial do Firebase.
2. Na Vercel, abra o projeto do site em **Settings → Environment Variables**. A opção mais simples é criar **uma única variável privada**, `FIREBASE_SERVICE_ACCOUNT_JSON`, e colar como valor o conteúdo completo do arquivo JSON da conta de serviço. O `project_id` dentro do JSON deve ser `nextgen-2d9df`. Essa variável não tem prefixo `NEXT_PUBLIC_`.

Como alternativa, as três variáveis separadas continuam funcionando:

| Variável de servidor | Valor |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `nextgen-2d9df` |
| `FIREBASE_CLIENT_EMAIL` | Campo `client_email` da credencial |
| `FIREBASE_PRIVATE_KEY` | Conteúdo completo do campo `private_key`, incluindo BEGIN/END |

3. A chave aceita quebras de linha reais ou a sequência literal `\n`. Configure esses valores somente no servidor. Essas variáveis não têm prefixo `NEXT_PUBLIC_`; a chave não pertence ao Git, aos slides nem às mensagens de chat. Para desenvolvimento local, use `.env.local`, que é ignorado pelo Git.
4. Mantenha as variáveis públicas já existentes do Firebase. O projeto privado precisa coincidir com `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
5. Publique as regras atualizadas e faça um novo deploy do site na Vercel:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project nextgen-2d9df
```

6. Confirme que `/api/desafios` responde `{"available":true,"reason":"ready"}` e teste com uma empresa aprovada e uma conta de estudante. O indicador confere o formato da configuração, a chave RSA e a correspondência do projeto; o teste autenticado confirma também se a credencial foi revogada ou tem as permissões necessárias. Alterações nas variáveis da Vercel exigem um novo deploy para afetar o site.

`missing-credentials` indica que a ativação ainda não foi configurada. `invalid-json`, `invalid-private-key`, `invalid-email` e `project-mismatch` indicam qual parte revisar. Nenhuma dessas respostas contém chave privada ou e-mail da conta de serviço.

Se a configuração estiver ausente, o site mostra indisponibilidade e preserva a leitura do histórico verificado. Erros internos nunca retornam chaves, credenciais, caminhos de gabarito ou detalhes dos documentos para o navegador.

## Regras da participação

- Cada desafio tem de 1 a 5 perguntas, com 2 a 5 alternativas distintas e uma correta por pergunta.
- Alternativas vazias são removidas preservando o índice da alternativa correta; marcar uma alternativa vazia é erro de validação.
- Nota mínima inteira entre 1 e 100; nota final é `round(acertos / perguntas × 100)`.
- Pontuação-base: iniciante 100, intermediário 200, avançado 350. Aprovação concede `max(25, round(base × nota / 100))`; reprovação concede zero.
- Uma tentativa válida por estudante/desafio, incluindo reprovação. Respostas ausentes ou fora das alternativas são recusadas antes de consumir a tentativa.
- O resultado é persistido de forma atômica. Repetições e envios simultâneos retornam o resultado original e não acumulam pontos adicionais.
- Fechar um desafio interrompe novas participações; resultados anteriores continuam disponíveis.
- A empresa precisa continuar aprovada para receber novas participações.

## Dados e legado

`desafios/{ID}` contém somente as perguntas públicas e `scoringVersion: 2`. `desafioSegredos/{ID}` guarda o gabarito e a impressão da criação para idempotência; nenhum cliente lê essa coleção. `desafioTentativas/{UID_ID}` registra respostas e resultado e só pode ser lido pelo estudante correspondente. `conquistas/{UID_ID}` registra aprovações e é de escrita exclusiva do servidor.

O ranking usa somente conquistas verificadas desta versão, valida o ID e a consistência de pontos, conta cada desafio uma vez e desempata por melhor nota e uma ordem fixa de contas. Perfis removidos ou que não sejam de estudante não entram na classificação. Os perfis e indicadores administrativos também usam esses resultados verificados.

**Registros antigos não foram apagados nem migrados automaticamente.** Desafios e conquistas antigos, sem a marca de correção verificada, ficam fora das listas e do ranking novo. A leitura direta desses documentos é restrita à administração pelas regras atualizadas. A empresa deve republicar os desafios que devam ser usados na demonstração. Não basta adicionar a marca de versão aos dados antigos: eles precisam de revisão e correção verificável.

O diretório `functions/` permanece como código histórico/apoio às migrações. Os serviços ativos do navegador não o chamam mais. Evite usar um deploy geral do Firebase como substituto do comando específico de regras acima.

## Verificação

```powershell
npm.cmd run test:challenges:unit
npm.cmd run test:challenges
npm.cmd run build
```

O segundo comando requer Java 21+, inicia Authentication e Firestore apenas em `demo-nextgen-chat` e usa identidades/dados fictícios. Testa tokens reais do Auth emulado, perfis, acesso, correção, pontuação, replay, concorrência, reprovação persistida, fechamento, aprovação revogada e privacidade. Também verifica o percurso dos serviços usados pelo navegador e mantém a regressão de cadastro, vagas, candidaturas e chat.

Ainda é necessário um ensaio autenticado da interface no ambiente publicado depois de configurar a credencial. Nenhum teste desta etapa grava dados no projeto real.
