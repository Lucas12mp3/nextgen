import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { storage, db } from "@/firebase/config";

/**
 * Faz o upload do currículo em PDF para o Firebase Storage com acompanhamento de progresso.
 * @param uid ID do usuário autenticado
 * @param file Arquivo PDF selecionado
 * @param onProgress Callback opcional para atualizar a porcentagem do progresso (0-100)
 */
export async function uploadResume(
  uid: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!file) throw new Error("Nenhum arquivo enviado.");
  if (file.type !== "application/pdf") {
    throw new Error("Apenas arquivos no formato PDF são aceitos.");
  }

  // Gera um nome único mantendo a extensão
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const storageRef = ref(storage, `curriculos/${uid}/${fileName}`);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Erro no upload do Storage:", error);
        reject(error);
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadUrl);
      }
    );
  });
}

/**
 * Atualiza os campos do perfil do estudante no Firestore.
 * @param uid ID do usuário autenticado
 * @param data Dados a serem atualizados ou inseridos
 */
export async function updateProfileDoc(
  uid: string,
  data: Record<string, any>
): Promise<void> {
  const userDocRef = doc(db, "users", uid);

  // Utiliza setDoc com merge para criar/mesclar o documento do usuário
  await setDoc(
    userDocRef,
    {
      ...data,
      atualizadoEm: new Date().toISOString(),
    },
    { merge: true }
  );
}