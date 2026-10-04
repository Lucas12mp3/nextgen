# NextGen — Rede profissional para jovens (TCC)

Uma plataforma web para conectar estudantes, jovens aprendizes, estagiários e empresas — projeto NextGen (TCC).

## Visão geral
NextGen é uma rede profissional focada em jovens em formação, oferecendo perfis, oportunidades e um feed global de publicações semelhante ao Facebook/LinkedIn/Instagram para compartilhamento de vagas, eventos e atualizações.

## Tecnologias
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Storage (uso em perfis)

## O que está implementado
- Autenticação (cadastro/login) integrada ao Firestore (`services/autenticar.ts`).
- Feed global de publicações (`/feed`) com criação, curtidas, comentários, edição e exclusão (componentes em `components/posts/` e serviço em `services/posts.ts`).
- Cabeçalho dinâmico que muda conforme estado de autenticação (`components/Header.tsx`).
- Avisos visuais indicando quando páginas exibem dados fictícios.
- Regras sugeridas do Firestore em `firebase/firestore.rules`.

## Estrutura principal (resumida)
- `app/` — páginas e layouts (ex.: `app/page.tsx`, `app/feed/page.tsx`, `app/perfils/`)
- `components/` — componentes reutilizáveis (`Header.tsx`, `posts/`)
- `services/` — integrações com Firebase (`autenticar.ts`, `posts.ts`, `perfil.ts`)
- `firebase/` — configuração e regras (`config.ts`, `firestore.rules`)
- `docs/FEED_README.md` — documentação específica do feed

## Variáveis de ambiente
Crie `.env.local` na raiz do projeto com as variáveis abaixo obtidas no console do Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Executando localmente
1. Instale dependências:

```bash
npm install
```

2. Rode em modo de desenvolvimento:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Firebase — configuração e regras
- Arquivo de inicialização: `firebase/config.ts` (consome as `NEXT_PUBLIC_*` acima).
- Regras sugeridas: `firebase/firestore.rules` — revise antes de aplicar.

Para testar regras localmente, use os Firebase Emulators:

```bash
# instale firebase-tools (se necessário)
npm install -g firebase-tools
# inicie emuladores na pasta do projeto (após configurar firebase.json se desejar)
firebase emulators:start --only firestore,auth
```

## Feed — como testar (duas contas)
1. Abra duas janelas/abas do navegador (ou uma janela anônima).  
2. Crie duas contas diferentes via `/cadastro` e faça login em cada aba.  
3. Vá para `/feed`.  
4. Conta A publica um post; Conta B deve ver em tempo real (subscribe).  
5. Teste curtidas, comentários; verifique que apenas o autor pode editar/excluir.

## Boas práticas e segurança
- As regras do Firestore verificam `authorId == request.auth.uid` ao criar/editar/excluir posts e comentários. Não confie em `authorName` enviado pelo cliente para autorizações.  
- Para produção, refine regras, habilite validações extras (comprimento máximo do texto, filtragem de conteúdo, limites de taxa) e use verificação de índices para consultas complexas.  

## Arquivos importantes adicionados/modificados
- `services/posts.ts` — CRUD e assinaturas do feed
- `components/posts/PostForm.tsx` — formulário de publicação
- `components/posts/PostItem.tsx` — item de post (curtir/comentar/editar/excluir)
- `components/Header.tsx` — cabeçalho com lógica de autenticação
- `app/feed/page.tsx` — feed global em tempo real
- `app/page.tsx` e `app/perfils/estudante/page.tsx` — avisos de dados fictícios e substituição de header
- `firebase/firestore.rules` — regras sugeridas
- `docs/FEED_README.md` — documentação complementar

## Próximos passos sugeridos
- Remover/substituir dados fictícios por leitura real em perfis.  
- Adicionar paginação/infinite scroll ao feed.  
- Melhorar tratamento de erros/UX (toasts, loaders).  
- Escrever testes automatizados (unit + integração de regras com Emulators).

## Contribuição
1. Clone o repositório.  
2. Crie uma branch feature: `git checkout -b feature/descricao`.  
3. Abra PR descrevendo alterações.

---

Se quiser, eu posso ajustar o texto, traduzir ou adicionar instruções de deploy específicas (Vercel, Firebase Hosting).
