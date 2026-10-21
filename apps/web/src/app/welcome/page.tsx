import type { Metadata } from "next";
import Welcome from "@/components/intro/Welcome";

export const metadata: Metadata = {
  title: "Welcome",
  description: "What Geopolitica means, how to read the map, and how to take it to your company.",
};

export default function WelcomePage() {
  return <Welcome edition="enterprise" />;
}
