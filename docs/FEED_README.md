# Feed Global — NextGen Network

Este documento descreve como funciona e como testar o feed global de publicações.

## Estrutura Firestore

Coleções:
- `users/{uid}` — documentos de perfil (já existentes)
- `posts/{postId}` — documento principal da publicação
  - campos principais: `authorId`, `authorName`, `authorPhotoURL?`, `authorType?`, `content`, `kind` ("post"|"vaga"|"evento"), `createdAt`, `likes` (array de UIDs), `likesCount`, `commentsCount`
  - subcoleção: `posts/{postId}/comments/{commentId}` — comentários com `authorId`, `authorName`, `content`, `createdAt`

## Regras de Segurança
Arquivo: `firebase/firestore.rules`
Regras básicas adicionadas para validar autoria e conteúdo. Teste as regras no Firebase Console.

## Arquivos adicionados/alterados
- `services/posts.ts` — funções para CRUD, curtidas e assinaturas em tempo real
- `components/posts/PostForm.tsx` — formulário de criação de publicações
- `components/posts/PostItem.tsx` — exibição de publicação, curtidas, comentários, editar/excluir
- `app/feed/page.tsx` — rota `/feed` implementada
- `firebase/firestore.rules` — regras sugeridas

## Como testar com duas contas
1. Configure variáveis de ambiente com o projeto Firebase e rode a aplicação:

```bash
# na raiz nextgen
npm install
npm run dev
```

2. Abra dois navegadores diferentes (ou janela anônima) e faça login com duas contas distintas (crie duas usando a tela de cadastro).
3. Em uma conta, publique um texto pelo feed `/feed`.
4. Na outra conta, atualize a página — a publicação deve aparecer em tempo real.
5. Teste curtir: clique em curtir em uma conta, verifique que o `likesCount` atualiza e que a mesma conta não duplique curtidas.
6. Teste comentar: adicione um comentário e verifique que aparece em ambas contas.
7. Teste editar/excluir: apenas o autor pode editar ou excluir sua publicação.

## Notas e recomendações
- Para listas grandes, criar índices no Firestore para ordenação por `createdAt` pode ser necessário.
- Ajuste regras conforme seu fluxo de moderação (ex.: marcação de conteúdo impróprio).

***
Se desejar, posso: (1) rodar testes locais simples, (2) ajustar UI (ex.: mostrar aviso "dados não reais" na home), (3) melhorar tratamento de erros e loaders.
