import { getBlob, ref, uploadBytesResumable } from "firebase/storage";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db, storage } from "@/firebase/config";

export async function uploadResume(uid: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error("Sessão inválida.");
  if (!file || file.type !== "application/pdf" || file.size >= 5 * 1024 * 1024) throw new Error("Envie um PDF com menos de 5 MB.");
  const fileName = `${crypto.randomUUID()}.pdf`;
  const path = `curriculos/${uid}/${fileName}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: "application/pdf" });
  await new Promise<void>((resolve, reject) => task.on("state_changed", (snapshot) => {
    onProgress?.(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100));
  }, reject, resolve));
  await setDoc(doc(db, "resumes", uid), { path, updatedAt: serverTimestamp() });
  return path;
}

export async function updateProfileDoc(uid: string, data: Record<string, unknown>): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error("Sessão inválida.");
  const profile = await getDoc(doc(db, "users", uid));
  const allowed = profile.get("tipoConta") === "estudante"
    ? ["titulo", "instituicao", "descricao", "github", "linkedin", "portfolio", "skills"]
    : ["nome", "ramo", "descricao", "site", "linkedin", "tagline", "localizacao"];
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!allowed.includes(key)) throw new Error("Campo de perfil inválido.");
    if (key === "skills") {
      if (!Array.isArray(value) || value.length > 40 || value.some(v => typeof v !== "string" || v.length > 60)) throw new Error("Informe até 40 habilidades com até 60 caracteres.");
      update[key] = value;
    } else {
      if (typeof value !== "string" || value.length > (key === "descricao" ? 3000 : 500)) throw new Error("Um dos campos excede o tamanho permitido.");
      update[key] = value.trim();
    }
  }
  await updateDoc(doc(db, "users", uid), { ...update, atualizadoEm: serverTimestamp() });
}

export async function getResumeUrl(studentUid: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Entre na sua conta para visualizar o currículo.");
  if (uid !== studentUid) {
    const applications = await getDocs(query(collection(db, "applications"), where("fromUserId", "==", studentUid), where("toCompanyId", "==", uid)));
    if (applications.empty) throw new Error("O currículo só pode ser consultado após uma candidatura à sua empresa.");
    await setDoc(doc(db, "resumeAccess", studentUid, "companies", uid), { applicationId: applications.docs[0].id, grantedAt: serverTimestamp() });
  }
  const resume = await getDoc(doc(db, "resumes", studentUid));
  const profile = await getDoc(doc(db, "users", studentUid));
  let path = resume.get("path") || profile.get("resumeObjectPath") || profile.get("resumeUrl");
  if (!path && uid === studentUid) path = (await getDoc(doc(db, "users", uid, "privado", "dados"))).get("resumeObjectPath");
  if (typeof path !== "string" || !path) throw new Error("O estudante precisa enviar ou atualizar seu currículo no perfil.");
  const resumeRef = ref(storage, path);
  if (resumeRef.bucket !== ref(storage).bucket || !resumeRef.fullPath.startsWith(`curriculos/${studentUid}/`)) throw new Error("O estudante precisa atualizar o currículo no perfil.");
  return URL.createObjectURL(await getBlob(resumeRef, 5 * 1024 * 1024));
}

export async function openResumeInNewTab(studentUid: string): Promise<void> {
  // Open during the click event so browsers do not block the authenticated download.
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("Permita abrir uma nova aba para visualizar o currículo.");
  popup.opener = null;
  try {
    const url = await getResumeUrl(studentUid);
    popup.location.replace(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { popup.close(); throw error; }
}
