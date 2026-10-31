export type RegistrationInput = { nome: string; tipoConta: "estudante" | "empresa"; cpf?: string; cnpj?: string; dataNascimento?: string; ramo?: string };

export function ageFromDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe uma data de nascimento válida.");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || date > now) throw new Error("Informe uma data de nascimento válida.");
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  if (now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) age--;
  return age;
}
export function validDocument(value: string, kind: "cpf" | "cnpj") {
  const digits = value.replace(/\D/g, "");
  const length = kind === "cpf" ? 11 : 14;
  if (digits.length !== length || /^(\d)\1+$/.test(digits)) return false;
  const digit = (count: number) => {
    let sum = 0;
    if (kind === "cpf") {
      for (let i = 0; i < count; i++) sum += Number(digits[i]) * (count + 1 - i);
      return ((sum * 10) % 11) % 10;
    }
    let weight = count - 7;
    for (let i = 0; i < count; i++) { sum += Number(digits[i]) * weight--; if (weight < 2) weight = 9; }
    return sum % 11 < 2 ? 0 : 11 - sum % 11;
  };
  return digit(length - 2) === Number(digits[length - 2]) && digit(length - 1) === Number(digits[length - 1]);
}
export function registrationData(input: RegistrationInput, now = new Date()) {
  const nome = input.nome.trim();
  if (!nome || nome.length > 120) throw new Error("Informe um nome com até 120 caracteres.");
  if (!["estudante", "empresa"].includes(input.tipoConta)) throw new Error("Tipo de conta inválido.");
  if (input.tipoConta === "estudante") {
    const age = ageFromDate(input.dataNascimento || "", now);
    if (age < 16 || age > 120) throw new Error("O cadastro está disponível para pessoas a partir de 16 anos. Confira a data informada.");
    if (!validDocument(input.cpf || "", "cpf")) throw new Error("Informe um CPF válido.");
  } else if (!validDocument(input.cnpj || "", "cnpj")) throw new Error("Informe um CNPJ válido.");
  const ramo = input.ramo?.trim() || "";
  if (ramo.length > 120) throw new Error("Informe um ramo com até 120 caracteres.");
  return { nome, ramo, cpf: input.tipoConta === "estudante" ? input.cpf!.replace(/\D/g, "") : null,
    cnpj: input.tipoConta === "empresa" ? input.cnpj!.replace(/\D/g, "") : null,
    birthDate: input.tipoConta === "estudante" ? new Date(`${input.dataNascimento}T00:00:00Z`) : null };
}
