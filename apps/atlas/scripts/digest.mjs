#!/usr/bin/env node
// The email digest: for every reader who turned it on (Tracker → "Email me what changed"),
// one email with what changed on the events and drivers they follow since the last email, the
// connected events moving towards them, and today's ripples. Daily or weekly, their choice.
//
//   npm run digest                     send to everyone who is due
//   npm run digest -- --dry-run        compose and print, send nothing, change nothing
//   npm run digest -- --only a@b.com   just that reader (testing); still marks them sent
//
// Needs: FIREBASE_SERVICE_ACCOUNT (the service account JSON, to read reader profiles),
// SMTP_USER and SMTP_PASS (a Gmail address and its app password, or any SMTP account; set
// SMTP_HOST/SMTP_PORT for another provider), optional MAIL_FROM and SITE_URL.

import { readFile } from "node:fs/promises";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import { DAY, compose, sectionFor } from "./digest-mail.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1]?.toLowerCase() : "";
const SITE = (process.env.SITE_URL || "https://neel8636.github.io/Geopolitica").replace(/\/$/, "");
const SA = process.env.FIREBASE_SERVICE_ACCOUNT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!SA || (!DRY && (!SMTP_USER || !SMTP_PASS))) {
  console.log("digest not configured: set FIREBASE_SERVICE_ACCOUNT, SMTP_USER and SMTP_PASS. Skipping.");
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(SA)) });
const db = getFirestore();

// the cards the site itself shows, as built by the latest pipeline run
async function loadCards() {
  try {
    return JSON.parse(await readFile(new URL("../out/ripples.json", import.meta.url), "utf8"));
  } catch {
    const r = await fetch(`${SITE}/ripples.json?t=${Date.now()}`);
    if (!r.ok) throw new Error(`could not load ${SITE}/ripples.json: ${r.status}`);
    return r.json();
  }
}
const cards = await loadCards();
const live = await fetch(`${SITE}/live.json?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const today = (live?.today ?? Object.keys(cards).slice(0, 3)).map((id) => cards[id]).filter(Boolean).slice(0, 3);

const snap = await db.collection("users").where("digest", "in", ["daily", "weekly"]).get();
const transport = DRY
  ? null
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
const FROM = process.env.MAIL_FROM || `Geopolitica Atlas <${SMTP_USER}>`;

let sent = 0, skipped = 0, failed = 0;
for (const doc of snap.docs) {
  const u = doc.data();
  const email = String(u.email || "").toLowerCase();
  if (!email || (ONLY && email !== ONLY)) continue;
  const gap = u.digest === "weekly" ? 6.5 * DAY : 20 * 3_600_000;
  const last = u.digestSentAt?.toMillis?.() ?? 0;
  if (!ONLY && Date.now() - last < gap) {
    skipped++;
    continue;
  }
  const since = last || Date.now() - (u.digest === "weekly" ? 7 : 1) * DAY;
  const follows = u.tracker?.follows ?? [];
  const eventIds = new Set(follows.filter((f) => !f.startsWith("driver:")));
  // a followed driver brings in its rising events
  for (const f of follows.filter((x) => x.startsWith("driver:"))) {
    const d = f.slice(7);
    for (const c of Object.values(cards)) if (c.pulse.trend === "rising" && (c.drivers ?? []).includes(d)) eventIds.add(c.id);
  }
  const followed = [...eventIds].map((id) => cards[id]).filter(Boolean);
  const sections = followed.map((c) => sectionFor(c, since)).filter(Boolean).sort((a, b) => b.c.pulse.day - a.c.pulse.day);
  const quiet = followed.filter((c) => !sections.some((s) => s.c.id === c.id));
  if (!sections.length && !ONLY && follows.length) {
    skipped++; // nothing new on what they follow: no email rather than an empty one
    continue;
  }
  const mail = compose(u, sections, quiet, u.digest, today, SITE);
  if (DRY) {
    console.log(`--- ${email}: ${mail.subject}\n${mail.text}`);
    continue;
  }
  try {
    await transport.sendMail({
      from: FROM,
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: { "List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>` },
    });
    await doc.ref.set({ digestSentAt: Timestamp.now() }, { merge: true });
    sent++;
    await new Promise((r) => setTimeout(r, 1200));
  } catch (err) {
    failed++;
    console.log(`  ✗ ${email}: ${err.message}`);
  }
}
console.log(`digest: ${sent} sent, ${skipped} not due or nothing new, ${failed} failed (of ${snap.size} subscribed)`);
