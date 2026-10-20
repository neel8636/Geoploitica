import type { Metadata } from "next";
import Journey from "@/components/journey/Journey";

export const metadata: Metadata = {
  title: "Get started",
  description: "Six steps from a headline to a brief for every department of your company.",
};

export default function GetStartedPage() {
  return <Journey />;
}
