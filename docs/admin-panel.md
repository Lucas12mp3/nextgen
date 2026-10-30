# Painel administrativo sem Cloud Functions

O painel `/admin` usa diretamente o SDK do Firestore e funciona no plano Spark, dentro das cotas do Firebase. Não é necessário publicar Cloud Functions para o painel.

Crie pelo Console Firebase o documento `admins/{UID}`, usando exatamente o UID da conta em Authentication. Um campo `nome: "Administrador"` é suficiente. Remova o documento para revogar o acesso. Clientes não podem criar administradores nem listar a coleção; cada conta pode consultar somente seu próprio registro.

## Publicação

Na pasta do projeto execute:

```powershell
npx.cmd --yes firebase-tools deploy --only firestore:rules --project nextgen-2d9df
```

Publique também a versão atualizada do site na Vercel. A mudança local não atualiza o site automaticamente. Não publique as funções para usar o painel.

## Recursos e segurança

O painel mostra indicadores, empresas, publicações e usuários, permite aprovar ou recusar empresas, excluir comentários e enviar advertências. As listas têm 25 itens por página; o histórico mostra as últimas 15 ações e até 25 advertências por usuário.

As regras verificam a existência de `admins/{UID}` em cada operação administrativa. Aprovações alteram somente os campos de revisão. Alterações administrativas usam transações para gravar a ação e o histórico juntos. O histórico não pode ser editado nem excluído pelos clientes. Advertências são privadas e o destinatário pode somente confirmar a leitura. Administradores podem ler os dados privados das empresas para conferir o CNPJ; há compatibilidade com o campo CNPJ antigo no documento da empresa.

Outras funcionalidades do site (cadastro, currículos, vagas, candidaturas, propostas e correção de desafios) ainda usam Functions. Esta adaptação remove a dependência do painel administrativo, não de todo o site. As orientações de migração de dados privados em `security-migration.md` continuam relevantes.

## Validação

Execute `npx.cmd tsc --noEmit` e `npm run build`. Antes de publicar, valide as regras no Emulator com Java instalado: conta sem login e conta comum não podem executar ações administrativas; somente o administrador deve poder aprovar empresas, excluir comentários e criar advertências; ninguém pode criar seu próprio registro em admins. Os testes antigos de `functions/tests` validam o backend opcional, não este acesso direto.
