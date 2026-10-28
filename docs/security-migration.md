# Migração de segurança Firebase

O repositório agora usa Firebase Functions em `southamerica-east1` (Node.js 22). O projeto ainda não tem Functions nem Emulator configurados. Não executei deploy nem migração de dados.

## Antes de publicar regras/functions

1. Configure o projeto Firebase para Cloud Functions. O deploy de Functions exige plano Blaze e faturamento habilitado.
2. Faça backup do Firestore e do Storage.
3. Instale as dependências da pasta `functions`, configure Application Default Credentials e defina `GCLOUD_PROJECT` e `FIREBASE_STORAGE_BUCKET` para o projeto e bucket corretos.
4. Rode `npm run migrate:security` dentro de `functions` sem `--apply`. O modo padrão apenas faz preflight e informa as alterações previstas. Ele interrompe antes de gravar se algum desafio não tiver gabarito válido.
5. Revise o resumo. Depois rode `npm run migrate:security -- --apply` para aplicar: remove os campos email, resumeUrl e faixaEtaria dos perfis públicos, coloca todas as empresas existentes em `pending`, migra caminhos reconhecidos de currículo para `users/{uid}/privado/dados`, move gabaritos para `desafioSegredos`, cria as permissões de currículo para candidaturas antigas e revoga tokens de download Firebase detectados no Storage.
6. Links externos (Drive, OneDrive etc.) removidos do perfil não podem ser revogados por este script; revogue-os no serviço onde foram criados.
7. Crie manualmente `admins/{uid}` no Firestore Console para cada administrador autorizado. A coleção não pode ser gravada pelo cliente. Um administrador aprova a empresa definindo `companyStatus` como `verified` pelo fluxo administrativo confiável; empresas antigas ficam pendentes até essa revisão.
8. Publique Functions e regras Firestore/Storage conforme seu processo de release. Esta mudança não publica nada automaticamente.

A migração é reexecutável para a maior parte das operações e nunca roda sem `--apply`. Ainda assim, faça backup antes. Como Admin SDK ignora Security Rules, a credencial usada deve ser protegida e nunca colocada no código cliente ou em `.env.local` enviado ao navegador.

## Menores e responsável

Menores de 16 anos são rejeitados tanto no formulário quanto em `completeRegistration`. Dados preenchidos em formulário não provam autorização de responsável; esse produto permanece indisponível até existir verificação real e consentimento confiável.

## Limitações atuais

- A aprovação é manual via operador autorizado; o repositório não tem painel administrativo. O operador pode usar a callable `approveCompany` após cadastrar `admins/{uid}`, ou aprovar pelo Console Firebase com credencial administrativa.
- A idade é conferida no servidor com base na data informada, mas não há validação documental de identidade/data de nascimento.
- O acesso ao currículo de uma empresa aprovada é concedido após uma candidatura e entregue por URL assinada que expira em cinco minutos. Um link copiado ainda pode ser usado até expirar.
- Conquistas anteriores foram gravadas pelo cliente e não guardam as respostas enviadas; são preservadas para manter o ranking, mas não é possível provar retroativamente que notas e pontos históricos são legítimos.
- Configure alertas de orçamento e limite as permissões da conta de serviço de Functions no Google Cloud.
