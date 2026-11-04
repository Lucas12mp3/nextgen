import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { educationData, projectData, type Education, type Project } from "@/lib/student-portfolio";

function slot(userId: string, kind: "projetos" | "formacoes", id: string) {
  if (!auth.currentUser || auth.currentUser.uid !== userId || !/^[0-9]$/.test(id)) throw new Error("Registro ou sessão inválida.");
  return doc(db, "users", userId, kind, id);
}
async function student(userId: string) {
  if ((await getDoc(doc(db, "users", userId))).get("tipoConta") !== "estudante") throw new Error("Este recurso é exclusivo de estudantes.");
}
export async function saveProject(userId: string, id: string, input: Omit<Project, "id">) {
  const ref = slot(userId, "projetos", id), data = projectData(input);
  await student(userId); await setDoc(ref, { ...data, atualizadoEm: serverTimestamp() });
}
export async function saveEducation(userId: string, id: string, input: Omit<Education, "id">) {
  const ref = slot(userId, "formacoes", id), data = educationData(input);
  await student(userId); await setDoc(ref, { ...data, atualizadoEm: serverTimestamp() });
}
export async function removePortfolioRecord(userId: string, kind: "projetos" | "formacoes", id: string) {
  await deleteDoc(slot(userId, kind, id));
}
export function subscribePortfolio(userId: string, update: (data: { projects: Project[]; education: Education[] }) => void, error: (error: Error) => void) {
  let projects: Project[] = [], education: Education[] = [], gotProjects = false, gotEducation = false;
  const emit = () => { if (gotProjects && gotEducation) update({ projects, education }); };
  const a = onSnapshot(collection(db, "users", userId, "projetos"), snap => {
    projects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)); gotProjects = true; emit();
  }, error);
  const b = onSnapshot(collection(db, "users", userId, "formacoes"), snap => {
    education = snap.docs.map(d => ({ id: d.id, ...d.data() } as Education)); gotEducation = true; emit();
  }, error);
  return () => { a(); b(); };
}
