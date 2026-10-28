import { httpsCallable } from "firebase/functions";
import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword, updateProfile } from "firebase/auth";
import { auth, functions } from "@/firebase/config";

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
  const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.senha);
  try {
    await updateProfile(cred.user, { displayName: payload.nome });
    const complete = httpsCallable(functions, "completeRegistration");
    await complete({ nome: payload.nome, tipoConta: payload.tipoConta, cpf: payload.cpf, cnpj: payload.cnpj, dataNascimento: payload.dataNascimento, ramo: payload.ramo });
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