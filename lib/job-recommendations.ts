import type { Education, Project } from "./student-portfolio";
import type { Vaga } from "@/services/vagas";
export const JOB_AREAS = ["Tecnologia", "Administração", "Design", "Marketing", "Engenharia", "Saúde", "Educação", "Logística", "Outro"] as const;
export const normalizeMatch = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const aliases: Record<string, string[]> = { javascript: ["javascript", "js"], typescript: ["typescript", "ts"], "node.js": ["node.js", "nodejs"], react: ["react", "reactjs", "react.js"], "c#": ["c#", "csharp"], ".net": [".net", "dotnet"] };
function skillKey(skill: string) {
  const key = normalizeMatch(skill);
  return Object.entries(aliases).find(([, values]) => values.includes(key))?.[0] || key;
}
function uniqueSkills(items: string[]) {
  const unique = new Map<string, string>();
  for (const value of items) if (typeof value === "string" && value.trim() && value.trim().length <= 60 && !unique.has(skillKey(value))) unique.set(skillKey(value), value.trim());
  return [...unique.values()];
}
function contains(haystack: string, term: string) {
  const key = normalizeMatch(term);
  const variants = Object.values(aliases).find(values => values.includes(key)) || [key];
  return variants.some(value => {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return value.length > 0 && new RegExp(`(^|[^a-z0-9+#.])${escaped}($|[^a-z0-9+#.])`).test(haystack);
  });
}
const areaWords: Record<string, string[]> = {
  Tecnologia: ["informatica", "sistemas", "programacao", "computacao", "software", "redes de computadores"],
  Administração: ["administracao", "gestao", "contabilidade", "financas"], Design: ["design", "design grafico"],
  Marketing: ["marketing", "publicidade"], Engenharia: ["engenharia", "mecanica", "eletronica", "eletrotecnica"],
  Saúde: ["enfermagem", "saude", "farmacia"], Educação: ["pedagogia", "educacao"], Logística: ["logistica", "transporte"],
};
export function recommendJobs(jobs: Vaga[], skills: string[], education: Education[], projects: Project[]) {
  const declared = uniqueSkills(skills);
  const projectSkills = uniqueSkills(projects.flatMap(p => p.tecnologias.split(",")));
  return jobs.filter(job => job.status === "aberta").map(job => {
    const description = normalizeMatch([job.titulo, job.requisitos, job.descricao].join(" "));
    const matched = declared.filter(skill => contains(description, skill));
    const fromProjects = projectSkills.filter(skill => !declared.some(s => skillKey(s) === skillKey(skill)) && contains(description, skill));
    const courses = education.filter(course => course.situacao !== "trancado").filter(course => {
      const name = normalizeMatch(course.curso), area = job.area;
      if (area && areaWords[area]?.some(term => contains(name, term))) return true;
      const words = name.split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !["tecnico", "tecnica", "curso", "ensino", "medio", "superior", "bacharelado", "tecnologia", "introducao", "basico"].includes(w));
      return words.length > 0 && words.every(word => contains(description, word));
    });
    const reasons: string[] = [];
    if (matched.length) reasons.push(`Habilidades em comum: ${matched.slice(0, 4).join(", ")}.`);
    if (fromProjects.length) reasons.push(`Habilidades dos seus projetos em comum: ${fromProjects.slice(0, 4).join(", ")}.`);
    if (courses.length) reasons.push(`Formação relacionada${job.area ? ` à área ${job.area}` : " ao texto da vaga"}: ${courses[0].curso}.`);
    return { job, reasons, score: matched.length * 3 + fromProjects.length * 2 + Math.min(courses.length, 1) * 2 };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || ((b.job.createdAt as { seconds?: number })?.seconds ?? 0) - ((a.job.createdAt as { seconds?: number })?.seconds ?? 0) || a.job.id.localeCompare(b.job.id));
}
