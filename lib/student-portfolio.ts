export type Project = { id: string; nome: string; descricao: string; tecnologias: string; link: string };
export type Education = { id: string; curso: string; instituicao: string; inicio: string; conclusao: string; situacao: "cursando" | "concluido" | "trancado" };
export type PublicStudent = { uid: string; nome: string; titulo: string; instituicao: string; descricao: string; github: string; linkedin: string; portfolio: string; skills: string[] };
export function safeExternalUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}
function text(value: unknown, max: number, required = true): string {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new Error("Preencha os campos dentro dos limites indicados.");
  return value.trim();
}
export function projectData(input: Omit<Project, "id">) {
  const nome = text(input.nome, 120), descricao = text(input.descricao, 2000), tecnologias = text(input.tecnologias, 300, false), link = text(input.link, 500, false);
  if (link && (!safeExternalUrl(link) || !link.startsWith("https://"))) throw new Error("Use um link HTTPS válido, sem usuário ou senha.");
  return { nome, descricao, tecnologias, link };
}
export function educationData(input: Omit<Education, "id">) {
  const curso = text(input.curso, 120), instituicao = text(input.instituicao, 120);
  const month = /^[12]\d{3}-(0[1-9]|1[0-2])$/;
  if (!month.test(input.inicio) || (input.conclusao && (!month.test(input.conclusao) || input.conclusao < input.inicio))) throw new Error("Confira o início e a conclusão da formação.");
  if (!["cursando", "concluido", "trancado"].includes(input.situacao) || (input.situacao === "concluido" && !input.conclusao)) throw new Error("Informe a situação e a conclusão do curso concluído.");
  return { curso, instituicao, inicio: input.inicio, conclusao: input.conclusao, situacao: input.situacao };
}
// An explicit projection prevents old private fields from reaching the public UI.
export function publicStudent(uid: string, data: Record<string, unknown>): PublicStudent | null {
  if (data.tipoConta !== "estudante") return null;
  const string = (key: string, max = 500) => typeof data[key] === "string" ? (data[key] as string).slice(0, max) : "";
  return { uid, nome: string("nome", 120) || "Estudante", titulo: string("titulo"), instituicao: string("instituicao"), descricao: string("descricao", 3000),
    github: safeExternalUrl(data.github), linkedin: safeExternalUrl(data.linkedin), portfolio: safeExternalUrl(data.portfolio),
    skills: Array.isArray(data.skills) ? data.skills.filter((s): s is string => typeof s === "string" && s.length <= 60).slice(0, 40) : [] };
}
