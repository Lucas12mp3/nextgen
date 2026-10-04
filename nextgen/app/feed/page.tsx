"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/config";
import PostForm from "@/components/posts/PostForm";
import PostItem from "@/components/posts/PostItem";
import { subscribeToPosts } from "@/services/posts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function FeedPage() {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<any>(null);
	const [posts, setPosts] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubAuth = onAuthStateChanged(auth, async (u) => {
			setUser(u);
			if (u) {
				const snap = await getDoc(doc(db, "users", u.uid));
				setProfile(snap.exists() ? snap.data() : null);
			} else {
				setProfile(null);
			}
			setLoading(false);
		});

		const unsubPosts = subscribeToPosts((items) => setPosts(items));

		return () => {
			unsubAuth();
			unsubPosts();
		};
	}, []);

	return (
		<main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800 md:p-8">
			<div className="mx-auto max-w-6xl">
				<h1 className="text-2xl font-black text-[#123a5a] mb-4">Feed Global</h1>

				<section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<div className="space-y-6">
						<div className="flex items-center justify-between gap-3">
							<PostForm profile={profile} />
							<div className="hidden md:block">
								{user ? (
									<a
										href={profile?.tipoConta === "empresa" ? "/perfils/empresa" : "/perfils/estudante"}
										className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-[#0f2f4d]"
									>
										Meu perfil
									</a>
								) : (
									<a href="/login" className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a]">Entrar</a>
								)}
							</div>
						</div>

						{loading ? (
							<div className="rounded-[20px] border border-[#dfeeff] bg-white p-6 text-center">Carregando publicações...</div>
						) : posts.length === 0 ? (
							<div className="rounded-[20px] border border-[#dfeeff] bg-white p-6 text-center">Nenhuma publicação ainda.</div>
						) : (
							<div className="space-y-4">
								{posts.map((p) => (
									<PostItem key={p.id} post={p} currentUid={user?.uid ?? null} />
								))}
							</div>
						)}
					</div>

					<aside className="space-y-6">
						<div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
							<h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Sobre o feed</h3>
							<p className="mt-3 text-sm text-slate-600">Aqui aparecem publicações públicas de estudantes e empresas na NextGen Network.</p>
						</div>
					</aside>
				</section>
			</div>
		</main>
	);
}
