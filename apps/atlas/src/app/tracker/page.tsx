import type { Metadata } from "next";
import TrackerView from "@/components/tracker/TrackerView";

export const metadata: Metadata = {
  title: "Your tracker",
  description: "The events and drivers you follow: new headlines since you last looked, what changed, and ripples arriving from connected events.",
};

export default function TrackerPage() {
  return <TrackerView />;
}
