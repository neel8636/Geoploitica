import type { Metadata } from "next";
import { Suspense } from "react";
import JoinView from "@/components/auth/JoinView";

export const metadata: Metadata = {
  title: "Join free",
  description: "Create a free Geopolitica account to read and build the full report on every world event on the map.",
};

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinView />
    </Suspense>
  );
}
