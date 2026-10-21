// The digest email: pure functions, so it can be previewed without Firebase or SMTP.
export const DAY = 86_400_000;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const mk = (SITE) => (path, campaign) => `${SITE}${path}${path.includes("?") ? "&" : "?"}utm_source=digest&utm_medium=email&utm_campaign=${campaign}`;
const TREND = { rising: "Rising", steady: "Steady", cooling: "Cooling", quiet: "Quiet" };

export function sectionFor(c, since) {
  const fresh = c.recent.filter((h) => Date.parse(h.published) > since).slice(0, 3);
  const changed = c.update && Date.parse(c.update.at) > since ? c.update : null;
  const incoming = (c.incoming ?? []).slice(0, 2);
  const fuel = c.fuel && Date.parse(c.fuel.at) > since ? c.fuel.items.slice(0, 3) : [];
  if (!fresh.length && !changed && !incoming.length && !fuel.length) return null;
  return { c, fresh, changed, incoming, fuel };
}

export function compose(reader, sections, quiet, freq, today, SITE) {
  const link = mk(SITE);
  const name = (reader.name || "").split(" ")[0];
  const subject = sections.length
    ? `${sections[0].c.title}${sections.length > 1 ? ` and ${sections.length - 1} more` : ""}: what changed`
    : `Today's ripples: ${today[0]?.title ?? "the world, connected"}`;
  const p = (t, style = "") => `<p style="margin:0 0 10px;${style}">${t}</p>`;
  let html = `<div style="background:#f7f2e8;padding:24px 0"><div style="max-width:600px;margin:0 auto;background:#fffdf8;border:1px solid #ddd2bd;border-radius:10px;padding:24px;font-family:Georgia,serif;color:#0f1a2b;font-size:16px;line-height:1.5">`;
  html += `<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1px;color:#b8862f;font-weight:bold">GEOPOLITICA ATLAS · YOUR ${freq.toUpperCase()} DIGEST</p>`;
  html += p(`${name ? `Hi ${esc(name)}, here` : "Here"} is what moved on what you follow.`, "font-size:18px");
  let text = `GEOPOLITICA ATLAS · YOUR ${freq.toUpperCase()} DIGEST\n\n`;
  for (const s of sections) {
    const c = s.c;
    html += `<div style="border-top:1px solid #ddd2bd;padding-top:14px;margin-top:14px">`;
    html += `<p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#46536a">${esc(c.kicker)} · ${TREND[c.pulse.trend]} · ${c.pulse.day} headlines today</p>`;
    html += `<p style="margin:2px 0 8px;font-size:21px"><a href="${link(`/events/${c.id}/`, "event")}" style="color:#0f1a2b">${esc(c.title)}</a></p>`;
    text += `${c.title}\n`;
    if (s.changed) {
      html += p(`<b>What changed.</b> ${esc(s.changed.text)} <span style="color:#6f7889;font-size:13px">(AI summary of ${s.changed.sources.length} headline${s.changed.sources.length === 1 ? "" : "s"})</span>`, "background:#efe7d6;padding:8px 10px;border-radius:6px");
      text += `What changed: ${s.changed.text}\n`;
    }
    for (const x of s.incoming) {
      html += p(`<span style="color:#b5651d">&#9679;</span> <b>Ripple incoming:</b> ${esc(x.title)} is rising (${x.day} headlines today)${x.via ? ` and reaches this via ${esc(x.via)}` : ""}.`, "font-size:15px");
      text += `Ripple incoming: ${x.title} is rising${x.via ? `, via ${x.via}` : ""}\n`;
    }
    if (s.fuel.length) {
      html += p(`<b>Fueling it:</b> ${s.fuel.map((f) => `${esc(f.title)} (${esc(f.via)})`).join("; ")}.`, "font-size:15px");
      text += `Fueling it: ${s.fuel.map((f) => f.title).join("; ")}\n`;
    }
    if (s.fresh.length) {
      html += `<ul style="margin:0 0 6px;padding-left:18px;font-family:Arial,sans-serif;font-size:14px">${s.fresh
        .map((h) => `<li style="margin-bottom:4px"><a href="${esc(h.url)}" style="color:#0f1a2b">${esc(h.title)}</a> <span style="color:#6f7889">· ${esc(h.publisher)}</span></li>`)
        .join("")}</ul>`;
      for (const h of s.fresh) text += `- ${h.title} (${h.publisher}) ${h.url}\n`;
    }
    html += `</div>`;
    text += "\n";
  }
  if (quiet.length) {
    html += p(`<span style="color:#46536a;font-size:14px">Quiet since your last digest: ${quiet.map((c) => esc(c.title)).join(", ")}.</span>`, "margin-top:14px");
  }
  if (today.length) {
    html += `<div style="border-top:2px solid #b8862f;padding-top:14px;margin-top:18px"><p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1px;color:#b8862f;font-weight:bold">TODAY'S RIPPLES</p>`;
    for (const c of today) {
      html += p(`<a href="${link(`/events/${c.id}/`, "today")}" style="color:#0f1a2b"><b>${esc(c.title)}</b></a><br><span style="font-size:15px;color:#46536a">${esc(c.headline)}</span>`);
      text += `Today: ${c.title} ${link(`/events/${c.id}/`, "today")}\n`;
    }
    html += `</div>`;
  }
  html += `<p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#6f7889">You get this because you turned on the ${freq} digest in Geopolitica Atlas. <a href="${link("/tracker/#digest", "settings")}" style="color:#46536a">Change or stop it in your tracker</a>, or reply with "unsubscribe".</p>`;
  html += `</div></div>`;
  text += `\nChange or stop this digest: ${link("/tracker/#digest", "settings")}\n`;
  return { subject, html, text };
}

