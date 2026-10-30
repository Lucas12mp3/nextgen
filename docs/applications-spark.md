# Candidaturas e propostas sem Functions

As candidaturas e propostas usam o SDK do Firestore. Publique as regras e o site atualizado juntos:

```powershell
npx.cmd --yes firebase-tools deploy --only "firestore:rules,storage" --project nextgen-2d9df
```

As regras validam a identidade, o perfil de estudante, a empresa aprovada, a vaga aberta, os campos permitidos e os valores iniciais. O ID da candidatura é determinístico: `UID_VAGA`. Estudantes não podem alterar a candidatura depois de criada. A empresa destinatária pode marcar a leitura e atualizar o status. O estudante acompanha suas candidaturas em `/notifications`.

Vagas são ordenadas no cliente depois da consulta por empresa ou status, evitando depender de índices compostos para as listas atuais.

## Currículos

O upload grava somente o caminho do PDF em `resumes/{UID}`. Os dados privados de CPF e contato continuam separados. Uma empresa aprovada só pode consultar o arquivo quando existir uma candidatura do estudante à empresa, validada por `resumeAccess/{UID}/companies/{empresa}`. O download usa o SDK autenticado, sem gerar um novo link público permanente.

Currículos antigos com `resumeUrl` no perfil têm compatibilidade se o arquivo estiver no bucket configurado e em `curriculos/{UID}/`. Se o caminho existir somente no antigo documento privado, o estudante deve reenviar o PDF para disponibilizá-lo neste fluxo. Um PDF ausente é informado na tela.

O download pelo SDK depende de CORS no bucket. Caso o navegador registre erro de CORS, configure as origens locais e da Vercel no bucket conforme a documentação do Firebase Storage; publicar regras não configura CORS. Disponibilidade e custos do Storage dependem do estado do bucket/projeto; esta mudança não provisiona Storage nem altera faturamento.

## Verificação

`node --test tests/applications.test.cjs` testa o serviço com uma transação simulada. Execute também TypeScript, ESLint e build. Esses testes não substituem testes das regras no Firebase Emulator: valide criação permitida para estudante, recusa de empresa pendente, identidade e empresa forjadas, duplicação, edição da candidatura por estudante e leitura de currículo sem candidatura. O emulador exige Java.

As animações respeitam `prefers-reduced-motion` e não escondem conteúdo quando JavaScript ou IntersectionObserver estiverem indisponíveis. As fontes usam a pilha local para evitar downloads externos durante o build.
