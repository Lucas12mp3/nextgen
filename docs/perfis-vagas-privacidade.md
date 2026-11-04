# Perfis de estudantes sugestões de vagas e privacidade

As funcionalidades desta etapa aproximam a aplicação dos requisitos RF02 e RF03 da monografia. São implementações locais; publicar commits, regras e interface são etapas separadas.

## Projetos e formação

Em Meu perfil → Editar perfil, a seção Sua trajetória permite adicionar, editar e remover até dez projetos e dez formações ou cursos. Cada registro tem seu próprio botão de salvar; os campos gerais do perfil mantêm o botão Salvar do formulário principal.

Projetos contêm nome, descrição da participação, tecnologias/habilidades e link HTTPS opcional. Formação contém curso, instituição, início, conclusão/previsão e situação. Curso concluído exige conclusão; datas não podem terminar antes do início. Curso livre pode ser cadastrado como formação complementar.

Os dados ficam em `users/{uid}/projetos/{0..9}` e `users/{uid}/formacoes/{0..9}`. Os dez IDs possíveis limitam a quantidade pelas regras, além da interface. Somente o próprio estudante escreve e remove. Usuários autenticados podem ler os registros de apresentação; empresas não podem alterá-los. Campos extras, datas inválidas, links fora do formato permitido e tamanhos excessivos são recusados nas regras. O cliente valida links e nunca renderiza esquemas executáveis.

Os registros são apresentados no próprio perfil e em `/estudantes/{uid}`. Essa página exige login, usa uma projeção explícita dos campos de apresentação e não consulta subcoleções privadas nem currículos. As empresas acessam pelo botão Ver perfil nos cartões dos estudantes e pelo nome nas candidaturas recebidas. O próprio estudante pode conferir a apresentação com Ver perfil compartilhado.

Não há publicação de endereço, CPF, nascimento ou contato privado nessa página. O currículo mantém a autorização existente pelo fluxo de candidatura. A auditoria/migração dos antigos documentos públicos ainda é uma tarefa separada: a projeção da interface não remove dados antigos do banco nem altera o acesso ao diretório que já existia.

## Sugestões explicáveis

Estudantes recebem até três sugestões no feed e na página de vagas. Em vagas, a seleção respeita a busca e o filtro de modalidade. A listagem completa continua disponível. O estudante pode abrir detalhes e candidatar-se pelo modal existente.

O cálculo compara:

- Habilidades declaradas com o título, os requisitos e a descrição da vaga.
- Tecnologias/habilidades dos projetos com esse mesmo texto.
- Cursos em andamento ou concluídos com termos da vaga ou com sua área informada.

A publicação de vaga ganhou a área opcional. Vagas antigas, sem área, continuam utilizáveis e podem coincidir pelo texto. A comparação ignora acentos e capitalização e reconhece alguns aliases, como JS/JavaScript. Não confunde palavras por simples substring: C não corresponde a C++ e CSS não corresponde a SCSS. Duplicar habilidades ou aliases não aumenta a pontuação interna.

A ordenação interna usa três unidades por habilidade declarada, duas por habilidade dos projetos e duas por formação relacionada. Empates usam data da vaga e ID. A interface apresenta os motivos, sem transformar essa contagem em percentual de adequação. Não é IA, verificação de competência, decisão de seleção nem garantia de atendimento aos requisitos. Não considera CPF, idade, gênero ou outros dados privados. Não envia candidaturas automaticamente. Sem dados ou correspondências, a interface informa a situação e mantém o acesso às vagas.

## Aviso e atendimento de privacidade

`/privacidade` é acessível sem login, com link no rodapé global e no cadastro. O aviso descreve dados de conta, perfis compartilhados, feed público, currículo restrito, conversas, presença aproximada, métricas e serviços utilizados. Não apresenta certificação ou promessa de conformidade legal integral. A equipe responsável deve manter o texto atualizado com a operação real do projeto.

O titular autenticado pode enviar um pedido de acesso, correção, exclusão ou ajuda. O documento `privacyRequests/{uid}` é lido apenas pelo titular e por administradores. Somente administradores podem listar e responder, em `/admin/privacidade`, com atalho no painel principal.

Há um atendimento por conta. Enquanto estiver recebido/em análise, ele não pode ser sobrescrito. Depois da conclusão, um novo pedido pode substituir o registro anterior, como informado na interface. Cada pedido tem um identificador de geração; uma resposta aberta para um pedido antigo não pode ser aplicada a um pedido novo. A fila administrativa exibe até cinquenta solicitações em aberto; concluir libera os próximos registros.

Enviar um pedido de exclusão **não remove automaticamente** identidade, arquivos ou documentos. A administração precisa analisar, combinar o tratamento com o titular e executar as operações necessárias antes de declarar a exclusão concluída. A interface registra a solicitação e a resposta. Esta etapa não implementa apagamento integral, exportação automática, prazo automático de retenção ou notificações por e-mail. O titular acompanha o retorno na própria página.

## Publicação

Não há dependência nova de Cloud Functions, credenciais administrativas ou upgrade de plano para estes recursos. Usam Authentication e Firestore; currículos continuam dependendo do Storage já configurado. Antes da interface, publique as regras no projeto correspondente:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project nextgen-2d9df
```

Depois publique os commits na Vercel. Os registros novos surgem durante o uso; não é necessário converter perfis antigos para começar a adicionar projetos e cursos. As regras mantêm compatibilidade com vagas sem área.

## Verificação

```powershell
npm.cmd run test:portfolio:unit
npm.cmd run test:portfolio
npm.cmd run build
```

O emulador requer Java 21+. Os testes usam apenas o projeto fictício `demo-nextgen-chat`, com Firestore local na porta 8089, e não escrevem em produção. Cobrem serviços reais, leitura privada, limites, autorização de empresa/colegas, tentativa de alteração por terceiros, solicitação/resposta administrativa e impedimento de respostas a um pedido substituído. O conjunto também executa as regressões de cadastro, vagas, candidaturas e chat.

Ensaio de interface após publicação:

1. Como estudante, preencha habilidades, adicione um projeto e uma formação; edite cada registro, confira a apresentação e remova um registro de demonstração.
2. Como empresa aprovada, encontre o estudante, abra Ver perfil e confira projetos e cursos. Confira que não há documento privado ou currículo público nessa página. Abra o perfil sem login e confira a exigência de autenticação.
3. Publique uma vaga de Tecnologia com requisitos React e JavaScript. No estudante com habilidades/formação correspondentes, confira os motivos da sugestão no feed e em vagas. Abra o modal e teste a candidatura.
4. Ajuste a busca/modalidade e confira as sugestões. Teste também um perfil sem dados e uma vaga sem área.
5. Em Privacidade e ajuda, envie um pedido fictício. Confira que não pode substituí-lo enquanto aberto. Como administrador, responda e conclua. Volte ao titular e confira a resposta.
6. Repita em tela estreita, navegando por teclado. O ensaio autenticado de interface é uma etapa adicional aos testes dos serviços e ao build.
