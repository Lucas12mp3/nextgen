import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import { auth, db } from "@/firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export type CadastroPayload = {
  nome: string;
  email: string;
  senha: string;
  tipoConta: "estudante" | "empresa";
  cpf?: string;
  cnpj?: string;
  dataNascimento?: string;
  ramo?: string;
  responsavel?: {
    nome: string;
    email: string;
    cpf: string;
  } | null;
};

export function calcularFaixaEtaria(dataNascimento?: string | null) {
  if (!dataNascimento) return null;

  const nascimento = new Date(dataNascimento);
  if (Number.isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }

  return idade > 0 ? `${idade} anos` : "Menor de 1 ano";
}

export async function cadastrar(payload: CadastroPayload) {
  const { nome, email, senha, tipoConta, cpf, cnpj, dataNascimento, ramo, responsavel } = payload;

  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  await updateProfile(cred.user, { displayName: nome });

  const publicProfileDoc = {
    uid: cred.user.uid,
    nome,
    email,
    tipoConta,
    ramo: ramo ?? null,
    faixaEtaria: dataNascimento ? calcularFaixaEtaria(dataNascimento) : null,
    createdAt: serverTimestamp(),
  };

  const privateProfileDoc = {
    cpf: cpf ?? null,
    cnpj: cnpj ?? null,
    dataNascimento: dataNascimento ?? null,
    responsavel: responsavel ?? null,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", cred.user.uid), publicProfileDoc);
  await setDoc(doc(db, "users", cred.user.uid, "privado", "dados"), privateProfileDoc);

  return cred.user;
}

export async function entrar(email: string, senha: string) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

export async function sair() {
  await signOut(auth);
}

export async function editarPerfil(novoNome: string) {
  if (!auth.currentUser) throw new Error("Não autenticado");
  await updateProfile(auth.currentUser, { displayName: novoNome });
}

export async function excluirConta(senhaAtual: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Não autenticado");
  const cred = EmailAuthProvider.credential(user.email, senhaAtual);
  await reauthenticateWithCredential(user, cred);
  await deleteUser(user);
}

export async function alterarSenha(senhaAtual: string, novaSenha: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Não autenticado");
  const cred = EmailAuthProvider.credential(user.email, senhaAtual);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, novaSenha);
}