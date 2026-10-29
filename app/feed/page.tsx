"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/config";
import PostForm from "@/components/posts/PostForm";
import PostItem from "@/components/posts/PostItem";
import { subscribeToPosts, type PostRecord } from "@/services/posts";
import { subscribeVagas, type Vaga } from "@/services/vagas";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function FeedPage() {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
	const [posts, setPosts] = useState<PostRecord[]>([]);
	const [vagas, setVagas] = useState<Vaga[]>([]);
	const [activeFilter, setActiveFilter] = useState<"all" | "post" | "vaga" | "evento">("all");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let stopVagas: (() => void) | undefined;
		const unsubAuth = onAuthStateChanged(auth, async (u) => {
			stopVagas?.();
			setVagas([]);
			if (u) stopVagas = subscribeVagas(items => setVagas(items), () => setVagas([]));
			setUser(u);
			if (u) {
				try {
				const snap = await getDoc(doc(db, "users", u.uid));
				if (auth.currentUser?.uid === u.uid) setProfile(snap.exists() ? snap.data() : null);
				} catch { setProfile(null); }
			} else {
				setProfile(null);
			}
			setLoading(false);
		});

		const unsubPosts = subscribeToPosts((items) => setPosts(items));

		return () => {
			unsubAuth();
			unsubPosts();
			stopVagas?.();
		};
	}, []);

	const vagasAbertas = vagas.filter((vaga) => vaga.status === "aberta");
	const totalCurtidas = posts.reduce((sum, post) => sum + (post.likesCount ?? (Array.isArray(post.likes) ? post.likes.length : 0)), 0);
	const visiblePosts = posts.filter((post) => (activeFilter === "all" ? true : post.kind === activeFilter));
	const filterOptions: Array<{ key: "all" | "post" | "vaga" | "evento"; label: string }> = [
		{ key: "all", label: "Todos" },
		{ key: "post", label: "Posts" },
		{ key: "vaga", label: "Vagas" },
		{ key: "evento", label: "Eventos" },
	];

	return (
		<main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-4 text-slate-800 md:p-8">
			<div className="mx-auto max-w-6xl">
				<div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-[#dfeeff] bg-white/80 p-5 shadow-[0_20px_60px_rgba(18,58,90,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6b8eb8]">NextGen</p>
						<h1 className="mt-2 text-3xl font-black text-[#123a5a]">Feed Global</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-full bg-[#edf6ff] px-3 py-1.5 text-xs font-semibold text-[#123a5a]">{posts.length} publicações</span>
						<span className="rounded-full bg-[#eafaf2] px-3 py-1.5 text-xs font-semibold text-[#1d7a52]">{vagasAbertas.length} vagas abertas</span>
						{user && (
							<a
								href={profile?.tipoConta === "empresa" ? "/perfils/empresa" : "/perfils/estudante"}
								className="inline-flex items-center justify-center rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f2f4d]"
							>
								Meu perfil
							</a>
						)}
					</div>
				</div>

				<section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
					<div className="space-y-6">
						<div className="rounded-[24px] border border-[#dfeeff] bg-white p-4 shadow-sm sm:p-5">
							<PostForm profile={profile ?? undefined} />
						</div>

						<div className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
							<div className="mb-4 flex items-center justify-between gap-3">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b8eb8]">Seção</p>
									<h2 className="mt-1 text-lg font-black text-[#123a5a]">Vagas disponíveis</h2>
								</div>
								<a href="/vagas" className="text-sm font-semibold text-[#123a5a] underline">Ver todas</a>
							</div>
							{vagasAbertas.length === 0 ? (
								<div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-4 text-sm text-slate-600">Nenhuma vaga aberta no momento.</div>
							) : (
								<div className="space-y-3">
									{vagasAbertas.slice(0, 4).map((vaga) => (
										<div key={vaga.id} className="rounded-2xl border border-[#eaf4ff] bg-gradient-to-r from-[#f9fcff] to-[#f3f9ff] p-4 transition hover:border-[#afd0f5] hover:shadow-sm">
											<div className="flex items-center justify-between gap-3">
												<span className="rounded-full bg-[#eaf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#123a5a]">{vaga.modalidade}</span>
												<span className="text-xs font-medium text-slate-500">{vaga.local}</span>
											</div>
											<h3 className="mt-3 text-lg font-black text-[#123a5a]">{vaga.titulo}</h3>
											<p className="text-sm text-slate-600">{vaga.empresaNome}</p>
											<p className="mt-2 line-clamp-2 text-sm text-slate-700">{vaga.descricao}</p>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
							<div className="mb-4 flex flex-col gap-3">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b8eb8]">Seção</p>
										<h2 className="mt-1 text-lg font-black text-[#123a5a]">Publicações</h2>
									</div>
									<span className="rounded-full bg-[#edf6ff] px-2.5 py-1 text-xs font-bold text-[#123a5a]">{visiblePosts.length}</span>
								</div>
								<div className="flex flex-wrap gap-2">
									{filterOptions.map((option) => (
										<button
											key={option.key}
											type="button"
											onClick={() => setActiveFilter(option.key)}
											className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
												activeFilter === option.key
													? "bg-[#123a5a] text-white shadow-md shadow-blue-200"
													: "bg-[#f3f8ff] text-[#123a5a] hover:bg-[#edf6ff]"
											}`}
										>
											{option.label}
										</button>
									))}
								</div>
							</div>

							{loading ? (
								<div className="rounded-2xl border border-[#dfeeff] bg-[#f9fcff] p-6 text-center text-sm text-slate-600">Carregando publicações...</div>
							) : visiblePosts.length === 0 ? (
								<div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-6 text-center text-sm text-slate-600">Nenhuma publicação nesta categoria no momento.</div>
							) : (
								<div className="space-y-4">
									{visiblePosts.map((p) => (
										<PostItem key={p.id} post={p} currentUid={user?.uid ?? null} />
									))}
								</div>
							)}
						</div>
					</div>

					<aside className="space-y-6">
						<div className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
							<h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Painel</h3>
							<div className="mt-4 grid grid-cols-2 gap-3">
								<div className="rounded-2xl bg-[#edf6ff] p-3">
									<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b8eb8]">Curtidas</p>
									<p className="mt-2 text-2xl font-black text-[#123a5a]">{totalCurtidas}</p>
								</div>
								<div className="rounded-2xl bg-[#eefaf4] p-3">
									<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4e9b75]">Vagas</p>
									<p className="mt-2 text-2xl font-black text-[#123a5a]">{vagasAbertas.length}</p>
								</div>
							</div>
						</div>

						<div className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
							<h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Sobre o feed</h3>
							<p className="mt-3 text-sm leading-6 text-slate-600">Aqui você acompanha publicações, oportunidades e atualizações da comunidade NextGen em um só lugar.</p>
						</div>

						<div className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
							<h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Ações rápidas</h3>
							<div className="mt-4 space-y-2">
								<a href="/vagas" className="block rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-4 py-2 text-center text-sm font-semibold text-[#123a5a] transition hover:bg-[#edf6ff]">Explorar vagas</a>
								{user ? (
									<a href={profile?.tipoConta === "empresa" ? "/perfils/empresa" : "/perfils/estudante"} className="block rounded-full bg-[#123a5a] px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-[#0f2f4d]">Ir para o perfil</a>
								) : (
									<a href="/login" className="block rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-center text-sm font-semibold text-[#123a5a] transition hover:bg-[#f5fbff]">Entrar</a>
								)}
							</div>
						</div>
					</aside>
				</section>
			</div>
		</main>
	);
}
