"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { INTRO_KEY } from "@/components/intro/Welcome";

// First visit to the home page: show the introduction first. Links straight to an event skip it.
export default function IntroGate() {
  const router = useRouter();
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(INTRO_KEY) === "done" || new URLSearchParams(location.search).has("skipintro");
    } catch {}
    if (!seen) router.replace("/welcome");
  }, [router]);
  return null;
}
