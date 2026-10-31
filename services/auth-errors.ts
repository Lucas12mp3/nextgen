export function authErrorMessage(error: unknown, fallback: string) {
  const code = (error as { code?: string } | null)?.code;
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado. Entre na conta ou recupere sua senha.",
    "auth/invalid-email": "Confira o endereço de e-mail informado.",
    "auth/weak-password": "Escolha uma senha com pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed": "Não foi possível conectar. Confira sua conexão e tente novamente.",
    "permission-denied": "Não foi possível acessar os dados da conta. Confira os dados informados e se as regras de acesso do site foram atualizadas.",
    "unavailable": "O serviço está indisponível. Tente novamente em instantes.",
  };
  if (code) return messages[code] || fallback;
  return error instanceof Error ? error.message : fallback;
}
