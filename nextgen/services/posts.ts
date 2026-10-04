import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  runTransaction,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export type PostData = {
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  authorType?: string | null;
  content: string;
  kind: "post" | "vaga" | "evento";
  createdAt?: any;
  likesCount?: number;
  commentsCount?: number;
};

export function subscribeToPosts(onUpdate: (items: any[]) => void) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    onUpdate(items);
  });
  return unsub;
}

export async function createPost(payload: PostData) {
  const docRef = await addDoc(collection(db, "posts"), {
    ...payload,
    createdAt: serverTimestamp(),
    likes: [],
    likesCount: 0,
    commentsCount: 0,
  });
  return docRef.id;
}

export async function toggleLike(postId: string, uid: string) {
  const postRef = doc(db, "posts", postId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef as any);
    if (!snap.exists()) throw new Error("Post não encontrado");
    const data = snap.data() as any;
    const liked = Array.isArray(data.likes) && data.likes.includes(uid);
    if (liked) {
      tx.update(postRef as any, {
        likes: arrayRemove(uid),
        likesCount: increment(-1),
      });
    } else {
      tx.update(postRef as any, {
        likes: arrayUnion(uid),
        likesCount: increment(1),
      });
    }
  });
}

export async function addComment(postId: string, comment: { authorId: string; authorName: string; content: string }) {
  const commentsRef = collection(db, "posts", postId, "comments");
  await addDoc(commentsRef, {
    ...comment,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });
}

export function subscribeComments(postId: string, onUpdate: (items: any[]) => void) {
  const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
  const unsub = onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  });
  return unsub;
}

export async function editPost(postId: string, uid: string, newContent: string) {
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Post não encontrado");
  const data = snap.data() as any;
  if (data.authorId !== uid) throw new Error("Não autorizado");
  await updateDoc(ref, { content: newContent, updatedAt: serverTimestamp() });
}

export async function deletePost(postId: string, uid: string) {
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Post não encontrado");
  const data = snap.data() as any;
  if (data.authorId !== uid) throw new Error("Não autorizado");
  await deleteDoc(ref);
}
