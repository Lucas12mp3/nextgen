import { ref, uploadBytesResumable } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { auth, functions, storage } from "@/firebase/config";

export async function uploadResume(uid: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error("Sessão inválida.");
  if (!file || file.type !== "application/pdf" || file.size >= 5 * 1024 * 1024) throw new Error("Envie um PDF com menos de 5 MB.");
  const fileName = `${crypto.randomUUID()}.pdf`;
  const path = `curriculos/${uid}/${fileName}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: "application/pdf" });
  await new Promise<void>((resolve, reject) => task.on("state_changed", (snapshot) => {
    onProgress?.(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100));
  }, reject, resolve));
  await httpsCallable(functions, "setResumeObjectPath")({ path });
  return path;
}

export async function updateProfileDoc(uid: string, data: Record<string, unknown>): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error("Sessão inválida.");
  await httpsCallable(functions, "updatePublicProfile")(data);
}

export async function getResumeUrl(studentUid: string): Promise<string> {
  const result = await httpsCallable<{ studentUid: string }, { url: string }>(functions, "getResumeDownloadUrl")({ studentUid });
  return result.data.url;
}