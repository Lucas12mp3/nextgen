import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { registrationData } from "./registration-policy";

export type CadastroPayload = {
  nome: string;
  email: string;
  senha: string;
  tipoConta: "estudante" | "empresa";
  cpf?: string;
  cnpj?: string;
  dataNascimento?: string;
  ramo?: string;
};

export async function cadastrar(payload: CadastroPayload) {
  const data = registrationData(payload);
  const cred = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.senha);
  try {
    await updateProfile(cred.user, { displayName: data.nome });
    const batch = writeBatch(db);
    batch.set(doc(db, "users", cred.user.uid), { uid: cred.user.uid, nome: data.nome, tipoConta: payload.tipoConta,
      ...(payload.tipoConta === "empresa" ? { ramo: data.ramo, companyStatus: "pending" } : {}), createdAt: serverTimestamp() });
    batch.set(doc(db, "users", cred.user.uid, "privado", "dados"), { dataNascimento: data.birthDate ? Timestamp.fromDate(data.birthDate) : null,
      cpf: data.cpf, cnpj: data.cnpj, responsavel: null, createdAt: serverTimestamp() });
    await batch.commit();
    return cred.user;
  } catch (error) {
    await deleteUser(cred.user).catch(() => undefined);
    throw error;
  }
}

export async function entrar(email: string, senha: string) { return (await signInWithEmailAndPassword(auth, email, senha)).user; }
export async function sair() { await signOut(auth); }
export async function editarPerfil(novoNome: string) { if (!auth.currentUser) throw new Error("Não autenticado"); await updateProfile(auth.currentUser, { displayName: novoNome }); }
export async function excluirConta(senhaAtual: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Não autenticado");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, senhaAtual));
  await deleteUser(user);
}
export async function alterarSenha(senhaAtual: string, novaSenha: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Não autenticado");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, senhaAtual));
  await updatePassword(user, novaSenha);
}
