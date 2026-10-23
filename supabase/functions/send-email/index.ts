// Supabase Edge Function: emails a news article or a new tournament.
//
// Called from the Admin panel (supabase.functions.invoke("send-email")) with
//   { kind: "news" | "tournament", id, audience, userIds? }
// where audience is
//   "everyone"    every registered user + every newsletter subscriber
//   "players"     registered users with the player role
//   "subscribers" newsletter subscribers (footer form)
//   "manual"      the registered users in `userIds`
// Anyone who unsubscribed (email_contacts.opted_out) is always skipped, and
// every email carries a personal unsubscribe link.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  API key from resend.com
//   EMAIL_FROM      e.g. "Padel Federation <news@padelfederation.mk>"
//                   (the domain must be verified in Resend)
//   SITE_URL        e.g. https://padelfederation.mk
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const AUDIENCES = ["everyone", "players", "subscribers", "manual"];
const BATCH_SIZE = 100; // Resend batch limit

const env = (name: string, fallback?: string) => {
  const value = Deno.env.get(name) ?? fallback;
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

// Plain-text preview of article HTML.
const excerpt = (html: string | null, max = 280) => {
  const text = (html || "")
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text;
};

const absoluteUrl = (site: string, url: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${site}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

type Message = {
  subject: string;
  eyebrow: string; // "Нова вест · New article"
  title: string;
  meta?: string;
  text?: string;
  imageUrl?: string | null;
  buttonLabel: string;
  buttonUrl: string;
};

// Email-client-safe HTML (tables + inline styles), in the site's colours.
const renderEmail = (m: Message, site: string, unsubscribeUrl: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(m.subject)}</title></head>
<body style="margin:0;padding:0;background:#eef1f7;font-family:Montserrat,Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
  <tr><td style="background:#081738;padding:22px 28px;">
    <a href="${site}" style="text-decoration:none;"><img src="${site}/images/logo.png" alt="Padel Federation of Macedonia" height="44" style="display:block;height:44px;border:0;"></a>
  </td></tr>
  ${
    m.imageUrl
      ? `<tr><td><a href="${m.buttonUrl}"><img src="${m.imageUrl}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>`
      : ""
  }
  <tr><td style="padding:28px 28px 8px;">
    <p style="margin:0 0 10px;color:#f82428;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(m.eyebrow)}</p>
    <h1 style="margin:0 0 12px;color:#081738;font-size:24px;line-height:1.25;font-weight:800;border-left:6px solid #fde834;padding-left:12px;">${escapeHtml(m.title)}</h1>
    ${m.meta ? `<p style="margin:0 0 14px;color:#5c5c5e;font-size:14px;">${escapeHtml(m.meta)}</p>` : ""}
    ${m.text ? `<p style="margin:0 0 8px;color:#343435;font-size:15px;line-height:1.6;">${escapeHtml(m.text)}</p>` : ""}
  </td></tr>
  <tr><td style="padding:16px 28px 30px;">
    <a href="${m.buttonUrl}" style="display:inline-block;background:#f82428;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:999px;">${escapeHtml(m.buttonLabel)}</a>
  </td></tr>
  <tr><td style="padding:18px 28px;background:#f6f7fb;color:#848487;font-size:12px;line-height:1.6;">
    Padel Federation of Macedonia · Luj Paster 1, Skopje 1000<br>
    <a href="${unsubscribeUrl}" style="color:#848487;">Одјави се · Unsubscribe</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const site = env("SITE_URL", "https://padelfederation.mk").replace(/\/+$/, "");
    const from = env("EMAIL_FROM");
    const resendKey = env("RESEND_API_KEY");
    const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    // ---- caller must be an admin ----
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await db.auth.getUser(jwt);
    if (!auth?.user) return json({ error: "Not signed in" }, 401);
    const { data: me } = await db
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .single();
    if (me?.role !== "admin") return json({ error: "Admins only" }, 403);

    // ---- request ----
    const { kind, id, audience, userIds = [] } = await req.json();
    if (!["news", "tournament"].includes(kind) || !id) {
      return json({ error: "Missing kind / id" }, 400);
    }
    if (!AUDIENCES.includes(audience)) return json({ error: "Unknown audience" }, 400);
    if (audience === "manual" && (!Array.isArray(userIds) || !userIds.length)) {
      return json({ error: "Choose at least one user" }, 400);
    }

    // ---- what to send ----
    let message: Message;
    if (kind === "news") {
      const { data: n, error } = await db.from("news").select("*").eq("id", id).single();
      if (error || !n) return json({ error: "News not found" }, 404);
      if (!n.published) return json({ error: "Drafts aren't emailed — publish it first" }, 400);
      const title = n.title_mk || n.title_en;
      const external = n.external_url?.trim();
      message = {
        subject: title,
        eyebrow: "Нова вест · News",
        title,
        meta: formatDate(n.published_at),
        text: excerpt(n.content_mk || n.content_en),
        imageUrl: absoluteUrl(site, n.cover_url),
        buttonLabel: "Прочитај повеќе · Read more",
        buttonUrl: external ? absoluteUrl(site, external)! : `${site}/all-news/${n.slug}`,
      };
    } else {
      const { data: t, error } = await db.from("tournaments").select("*").eq("id", id).single();
      if (error || !t) return json({ error: "Tournament not found" }, 404);
      const dates = [formatDate(t.start_date), formatDate(t.end_date)]
        .filter(Boolean)
        .filter((d, i, all) => all.indexOf(d) === i)
        .join(" – ");
      message = {
        subject: `Нов турнир: ${t.name}`,
        eyebrow: "Нов турнир · New tournament",
        title: t.name,
        meta: [dates, t.location, t.category].filter(Boolean).join(" · "),
        text: excerpt(t.description),
        imageUrl: absoluteUrl(site, t.image_url),
        buttonLabel: "Детали и пријава · Details & registration",
        buttonUrl: `${site}/tournaments/${t.id}`,
      };
    }

    // ---- who gets it ----
    const emails = new Set<string>();
    const add = (list: { email: string | null }[] | null) =>
      (list || []).forEach(({ email }) => {
        const e = email?.trim().toLowerCase();
        if (e && e.includes("@")) emails.add(e);
      });

    if (audience === "everyone" || audience === "players") {
      let q = db.from("profiles").select("email");
      if (audience === "players") q = q.or("role.is.null,role.eq.player");
      const { data, error } = await q;
      if (error) throw error;
      add(data);
    }
    if (audience === "everyone" || audience === "subscribers") {
      const { data, error } = await db
        .from("email_contacts")
        .select("email")
        .eq("newsletter", true);
      if (error) throw error;
      add(data);
    }
    if (audience === "manual") {
      const { data, error } = await db.from("profiles").select("email").in("id", userIds);
      if (error) throw error;
      add(data);
    }

    // Every recipient needs a contact row (for the unsubscribe token).
    const all = [...emails];
    for (let i = 0; i < all.length; i += 500) {
      const { error } = await db
        .from("email_contacts")
        .upsert(
          all.slice(i, i + 500).map((email) => ({ email })),
          { onConflict: "email", ignoreDuplicates: true }
        );
      if (error) throw error;
    }
    const contacts: { email: string; token: string }[] = [];
    for (let i = 0; i < all.length; i += 500) {
      const { data, error } = await db
        .from("email_contacts")
        .select("email, token")
        .in("email", all.slice(i, i + 500))
        .eq("opted_out", false);
      if (error) throw error;
      contacts.push(...(data || []));
    }

    // ---- send (one email per person, so addresses stay private) ----
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE).map((c) => {
        const unsubscribeUrl = `${site}/unsubscribe?token=${c.token}`;
        return {
          from,
          to: [c.email],
          subject: message.subject,
          html: renderEmail(message, site, unsubscribeUrl),
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
        };
      });
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
      else {
        failed += batch.length;
        console.error("Resend error", res.status, await res.text());
      }
    }

    await db.from("email_sends").insert({
      kind,
      ref_id: id,
      audience,
      sent_count: sent,
      failed_count: failed,
      sent_by: auth.user.id,
    });

    return json({ sent, failed, recipients: contacts.length });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || "Sending failed" }, 500);
  }
});
