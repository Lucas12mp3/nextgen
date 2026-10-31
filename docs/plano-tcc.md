# Plano de preparação do NextGen para o TCC

Objetivo: demonstrar um percurso completo e confiável de estudante, empresa e administração, mantendo explícitas as limitações do protótipo e sem exigir upgrade do Firebase para os fluxos principais.

## 1. Estabilizar o percurso principal — implementado localmente; publicação e ensaio pendentes

- Cadastro com Authentication e criação atômica de perfil público/dados privados no Firestore, sem Functions.
- Empresa nasce pendente e só publica vagas após aprovação administrativa.
- Publicação de vaga com validação de identidade, conteúdo e nome da empresa nas regras.
- Recuperação de senha e mensagens de erro acionáveis.
- Testes no emulador: cadastro próprio, idade declarada mínima, privacidade, aprovação e candidatura.
- Manter o que já está implementado: candidatura, acompanhamento, propostas, chat e moderação.

Critério de conclusão: criar contas de estudante e empresa, aprovar empresa, publicar vaga, candidatar estudante, atualizar status e trocar mensagens com aceite. Cada operação tem tratamento de falha e testes de autorização. O envio real do e-mail de recuperação precisa ser conferido em uma caixa de teste, fora do emulador.

Entrega inicial: implementação e testes de cadastro/publicação, recuperação de senha e remoção das estatísticas fictícias de uso. Consulte `fluxo-principal.md` para publicar e ensaiar. Ainda é necessário testar a interface autenticada no ambiente de demonstração e auditar dados antigos; os testes de emulador não confirmam o estado do projeto publicado.

## 2. Resolver desafios e ranking — próxima etapa

- Revisar criação, fechamento e correção, que ainda chamam Functions.
- Escolher execução confiável para a correção, como uma rota de servidor na hospedagem já usada. Não expor gabaritos nem permitir que o aluno atribua a própria nota para eliminar a dependência de Functions.
- Conferir tentativa duplicada, cálculo de pontos e ranking com testes.
- Se a infraestrutura da correção não estiver disponível, delimitar essa funcionalidade como futura e não colocá-la no roteiro principal de demonstração.

Critério de conclusão: respostas e pontuação verificadas em ambiente confiável, com gabaritos inacessíveis ao estudante e resultado reproduzível.

## 3. Privacidade e acabamento

- Auditar documentos antigos: o cadastro novo separa dados privados, mas não migra registros antigos automaticamente.
- Substituir estatísticas inventadas da página inicial por informação comprovável.
- Revisar links, estados vazios, erros e acesso sem login em todas as rotas.
- Conferir as telas principais em celular, teclado e preferência de movimento reduzido.
- Revisar o fluxo de currículo e a disponibilidade do Storage do projeto.

Critério de conclusão: nenhum documento privado exposto no diretório e nenhum controle sem resposta ou caminho de retorno.

## 4. Demonstração e documentação

- Preparar três contas de demonstração, com nomes e conteúdo fictícios coerentes: estudante, empresa e administrador. Não usar dados de colegas sem autorização nem criar contas/dados em produção automaticamente.
- Registrar requisitos, casos de uso, modelo de dados, arquitetura, limitações e resultados dos testes.
- Reconciliar documentos históricos sobre Functions com o fluxo atual.
- Preparar roteiro de 5–8 minutos e gravação de reserva.
- Fazer uma rodada de uso com colegas/professor e registrar problemas, correções e feedback sem inventar resultados.

Critério de conclusão: outra pessoa consegue reproduzir o percurso com as instruções, e cada afirmação da apresentação tem evidência.

## 5. Melhorias opcionais, após a estabilidade

Favoritos de vagas; filtros por área/modalidade/localização; carga horária, bolsa e benefícios; edição de vagas. Evitar novas funcionalidades grandes antes de estabilizar o percurso principal.

## Acompanhamento

Cada etapa deve indicar alterações concluídas, verificações executadas e pendências reais. Publicação de código e regras é uma etapa separada: mudanças locais não atualizam o ambiente público.
