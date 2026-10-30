"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove("reveal-pending");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.05 });
    const elements = document.querySelectorAll("main section, main .student-card");
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.top >= window.innerHeight && rect.height > 0) {
        element.classList.add("reveal-pending");
        observer.observe(element);
      }
    });
    return () => { observer.disconnect(); elements.forEach(element => element.classList.remove("reveal-pending")); };
  }, [pathname]);
  return null;
}
