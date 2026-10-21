import type { Metadata } from "next";
import Welcome from "@/components/intro/Welcome";

export const metadata: Metadata = {
  title: "Welcome",
  description: "What Geopolitica means, and how to follow one world event to everything it touches.",
};

export default function WelcomePage() {
  return <Welcome />;
}
