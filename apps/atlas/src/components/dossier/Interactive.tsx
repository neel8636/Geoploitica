"use client";

import { useState } from "react";
import type { PredictPrompt } from "@/content/types";

/* Predict before you read: commit to a guess, then see the answer. Memory and attention both improve. */
export function PredictReveal({ prompt }: { prompt: PredictPrompt }) {
  const [choice, setChoice] = useState<number | null>(null);
  const answered = choice !== null;
  return (
    <div className="rounded-lg border border-teal bg-teal-2/40 p-4 sm:p-5">
      <p className="signpost">Predict, then reveal</p>
      <p className="mt-1 font-serif text-lg">{prompt.question}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {prompt.options.map((o, i) => {
          const isAnswer = i === prompt.answerIndex;
          const picked = choice === i;
          let cls = "border-line bg-paper hover:border-teal";
          if (answered && isAnswer) cls = "border-teal bg-teal-2";
          else if (answered && picked) cls = "border-amber bg-amber-2";
          else if (answered) cls = "border-line-2 bg-paper opacity-70";
          return (
            <button
              key={o}
              type="button"
              disabled={answered}
              onClick={() => setChoice(i)}
              className={`rounded-sm border px-3 py-2 text-left text-[15px] transition-colors ${cls}`}
              aria-pressed={picked}
            >
              {o}
              {answered && isAnswer ? <span className="ml-2 text-sm text-teal">our base case</span> : null}
            </button>
          );
        })}
      </div>
      {answered ? (
        <p className="mt-3 text-[15px] text-ink-2">
          {choice === prompt.answerIndex ? "You matched our base case. " : "A different call from ours. "}
          {prompt.explanation}
        </p>
      ) : null}
    </div>
  );
}

/* Three-question recap at the end of the brief. Recall practice beats re-reading. */
export function Recap({ questions }: { questions: { question: string; options: string[]; answerIndex: number }[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const done = answers.every((a) => a !== null);
  const score = answers.filter((a, i) => a === questions[i].answerIndex).length;
  return (
    <div className="rounded-lg border border-line p-4 sm:p-5">
      <p className="signpost">Three-question recap</p>
      <ol className="mt-2 space-y-4">
        {questions.map((q, qi) => (
          <li key={q.question}>
            <p className="font-medium">{q.question}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {q.options.map((o, oi) => {
                const picked = answers[qi] === oi;
                const revealed = answers[qi] !== null;
                const right = oi === q.answerIndex;
                let cls = "border-line hover:border-teal";
                if (revealed && right) cls = "border-teal bg-teal-2";
                else if (revealed && picked) cls = "border-amber bg-amber-2";
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={revealed}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    className={`rounded-sm border px-3 py-1.5 text-[15px] ${cls}`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {done ? (
        <p className="mt-4 text-[15px] text-ink-2">
          {score} of {questions.length} right. {score === questions.length ? "You have the brief." : "The deep dive below covers what you missed."}
        </p>
      ) : null}
    </div>
  );
}

/* Reader lens: choose a role, the card re-orders what matters. */
export function ForYou({ lines }: { lines: { role: string; line: string }[] }) {
  const [role, setRole] = useState(lines[0]?.role ?? "");
  const current = lines.find((l) => l.role === role) ?? lines[0];
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Who are you?">
        {lines.map((l) => (
          <button
            key={l.role}
            type="button"
            role="tab"
            aria-selected={l.role === role}
            onClick={() => setRole(l.role)}
            className={`rounded-sm border px-3 py-1 text-sm ${
              l.role === role ? "border-teal bg-teal text-paper" : "border-line hover:border-teal"
            }`}
          >
            {l.role}
          </button>
        ))}
      </div>
      <p className="mt-3 font-serif text-lg" role="tabpanel">{current?.line}</p>
    </div>
  );
}
