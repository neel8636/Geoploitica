"use client";

import { useEffect } from "react";
import { markStep, type StepId } from "@/lib/journey";

/* Drop into a page to record that the reader has done that step of the journey. */
export default function JourneyMark({ step }: { step: StepId }) {
  useEffect(() => {
    markStep(step);
  }, [step]);
  return null;
}
