# NextGen — Feed Global (Instruções de integração e testes)

Este arquivo descreve as alterações realizadas para implementar o Feed Global de publicações na NextGen e como testar/rodar localmente.

## O que foi adicionado
- `services/posts.ts` — serviço para CRUD de publicações, curtidas e comentários (Firestore).
- `components/posts/PostForm.tsx` — formulário de criação de publicações.
- `components/posts/PostItem.tsx` — componente de exibição de publicação (curtir, comentar, editar, excluir).
- `components/Header.tsx` — cabeçalho que mostra links diferentes quando o usuário está autenticado.
- `app/feed/page.tsx` — rota `/feed` com feed global em tempo real.
- `firebase/firestore.rules` — regras sugeridas para validação de criação/edição/exclusão.
- `docs/FEED_README.md` — documentação complementar (passos de teste).

## Variáveis de ambiente (adições necessárias)
Crie um arquivo `.env.local` na raiz com as variáveis do seu projeto Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Instalação e execução
```bash
# na pasta do projeto (onde está package.json)
npm install
npm run dev
```

Acesse `http://localhost:3000` (padrão Next.js) e abra `/feed` após login.

## Como testar o feed (rápido)
1. Abra duas janelas/abas do navegador (ou uma janela anônima para a segunda conta).
2. Crie duas contas diferentes via `/cadastro` e faça login em cada aba.
3. Em `/feed`, use o formulário para publicar texto (tipo `post`, `vaga` ou `evento`).
4. As publicações devem aparecer automaticamente nas duas abas (assinatura em tempo real).
5. Em outra conta, clique em curtir; verifique que o contador atualiza corretamente.
6. Teste comentar; verifique que o comentário aparece em ambas as contas.
7. Teste editar/excluir: apenas quem criou a publicação verá os botões `Editar`/`Excluir`.

## Estrutura no Firestore (recomendada)
- `users/{uid}` — documentos de perfil (já existentes no projeto).
- `posts/{postId}` — documento de publicação com campos:
  - `authorId`, `authorName`, `authorPhotoURL?`, `authorType?`,
  - `content`, `kind` (`post` | `vaga` | `evento`), `createdAt`,
  - `likes` (array de UIDs), `likesCount`, `commentsCount`.
- `posts/{postId}/comments/{commentId}` — sub-coleção de comentários com `authorId`, `authorName`, `content`, `createdAt`.

## Regras de segurança (sugeridas)
Arquivo incluído: `firebase/firestore.rules` — regras básicas que:
- permitem leitura pública de `posts` e `comments`;
- exigem `request.auth.uid == authorId` ao criar/editar/excluir;
- impedem edição/exclusão por usuários que não são autores.

> Observação: revise e teste essas regras no Console do Firebase ou nos Emuladores antes de publicar.

## Boas práticas de segurança
- Sempre use o `authorId` (UID) para validar autoria no servidor / regras do Firestore.
- Não confie em `authorName` ou outros campos enviados pelo cliente para autorizar ações.
- Use o Firebase Emulators para testar regras localmente.

## Arquivos modificados / adicionados (resumo)
- `services/posts.ts` (novo)
- `components/posts/PostForm.tsx` (novo)
- `components/posts/PostItem.tsx` (novo)
- `components/Header.tsx` (novo)
- `app/feed/page.tsx` (novo/implementado)
- `app/page.tsx` (adicionado aviso de dados fictícios e header substituído)
- `app/perfils/estudante/page.tsx` (adicionado aviso de dados fictícios)
- `firebase/firestore.rules` (novo)
- `docs/FEED_README.md` (novo — documentação adicional)

## Próximos passos recomendados
- Substituir os dados fictícios do perfil por leitura real de `users/{uid}` (se desejar, posso implementar).
- Adicionar paginação/infinite scroll para o feed.
- Melhorar UX: loaders, mensagens de erro mais amigáveis, placeholders.
- Testes automatizados e cobertura das regras do Firestore.

---

Se quiser que eu crie/atualize o `README.md` na raiz (substituindo o existente) com este conteúdo, eu faço agora; ou posso ajustar o texto, idioma ou formatação conforme preferir.