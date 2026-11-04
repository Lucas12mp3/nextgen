"use client";
import { useEffect, useState } from "react";
import { subscribePortfolio } from "@/services/student-portfolio";
import type { Education, Project } from "@/lib/student-portfolio";
export function useStudentPortfolio(userId: string) {
  const [state, setState] = useState<{ projects: Project[]; education: Education[]; loading: boolean; error: string }>({ projects: [], education: [], loading: true, error: "" });
  useEffect(() => subscribePortfolio(userId, data => setState({ ...data, loading: false, error: "" }),
    () => setState(old => ({ ...old, loading: false, error: "Não foi possível carregar projetos e formação. Confira a conexão e a publicação das regras." }))), [userId]);
  return state;
}
