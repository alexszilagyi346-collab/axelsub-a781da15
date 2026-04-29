import { createRequire } from "module";
const require = createRequire(import.meta.url);
try { require("dotenv").config(); } catch {}

import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = 5000;

const BOT_UA = /facebookexternalhit|facebot|twitterbot|discordbot|linkedinbot|whatsapp|telegrambot|slackbot|googlebot|bingbot|applebot|embedly|tumblr|vkshare|w3c_validator|ia_archiver|prerender/i;

function isBot(req) {
  return BOT_UA.test(req.headers["user-agent"] || "");
}

async function supabaseFetch(table, id) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=title,description,image_url`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}

function escape(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function injectOg(html, { title, description, image, url }) {
  const t = escape(title ? `${title} – AxelSub` : "AxelSub - Anime");
  const d = escape(description || "Magyar feliratú animék egy helyen – AxelSub");
  const img = escape(image || "https://axelsub.lovable.app/favicon.png");
  const u = escape(url || "");

  return html
    .replace(/(<title>)[^<]*/i, `$1${t}`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${t}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${d}$2`)
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${img}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${u}$2`)
    .replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/i, `$1video.other$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${t}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${img}$2`);
}

async function createServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  let vite;
  let prodTemplate;

  if (isProd) {
    const distIndex = path.resolve(ROOT, "dist/index.html");
    prodTemplate = fs.readFileSync(distIndex, "utf-8");

    const sirv = (await import("sirv")).default;
    app.use(sirv(path.resolve(ROOT, "dist"), { extensions: [] }));
  } else {
    vite = await createViteServer({
      root: ROOT,
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  async function getTemplate(req) {
    if (isProd) return prodTemplate;
    const raw = fs.readFileSync(path.resolve(ROOT, "index.html"), "utf-8");
    return vite.transformIndexHtml(req.url, raw);
  }

  async function handleBotRequest(req, res, next, { table, id }) {
    if (!isBot(req)) return next();
    try {
      const record = await supabaseFetch(table, id);
      let html = await getTemplate(req);
      if (record) {
        html = injectOg(html, {
          title: record.title,
          description: record.description,
          image: record.image_url,
          url: `https://${req.headers.host}${req.url}`,
        });
      }
      res.setHeader("Content-Type", "text/html");
      return res.end(html);
    } catch (err) {
      next(err);
    }
  }

  app.use(express.json());

  // CORS – engedélyezett domainek (production + dev)
  const ALLOWED_ORIGINS = [
    "https://axelsub.eu",
    "https://www.axelsub.eu",
    "https://axelsub.lovable.app",
  ];
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (ALLOWED_ORIGINS.includes(origin) || !isProd)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // API útvonalak mindig JSON választ adnak, soha HTML-t
  app.use("/api", (req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    next();
  });

  const NOTIFY_EMAILS = ["alexszilagyi26@gmail.com", "davidbotos1998@gmail.com"];

  // --- Discord webhook helper ---
  // Sends a rich embed to the "új rész" channel (the channel is determined
  // by which webhook URL is configured in DISCORD_EPISODE_WEBHOOK_URL).
  async function fetchAnimeMeta(animeId) {
    if (!SUPABASE_URL || !animeId) return null;
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/animes?id=eq.${encodeURIComponent(animeId)}&select=title,image_url`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (!r.ok) return null;
      const rows = await r.json();
      return rows[0] || null;
    } catch (e) {
      console.warn("[fetchAnimeMeta] failed:", e.message);
      return null;
    }
  }

  async function sendDiscordEpisodeNotification({
    animeId,
    animeTitle,
    episodeNumber,
    episodeTitle,
    animeSlug,
    imageUrl,
    siteHost,
  }) {
    const webhookUrl = process.env.DISCORD_EPISODE_WEBHOOK_URL;
    if (!webhookUrl) {
      return { ok: false, skipped: true, reason: "DISCORD_EPISODE_WEBHOOK_URL nincs beállítva" };
    }

    let image = imageUrl;
    let title = animeTitle;
    if (!image || !title) {
      const meta = await fetchAnimeMeta(animeId);
      if (meta) {
        title = title || meta.title;
        image = image || meta.image_url;
      }
    }

    const baseUrl = siteHost ? `https://${siteHost}` : "https://axelsub.eu";
    const link = `${baseUrl}/anime/${animeSlug || animeId}`;
    const safeTitle = title || "Új epizód";
    const epLine = episodeTitle
      ? `**${episodeNumber}. epizód** — ${episodeTitle}`
      : `**${episodeNumber}. epizód** érkezett!`;

    const payload = {
      username: "AxelSub",
      avatar_url: "https://axelsub.eu/favicon.png",
      content: `🎌 **${safeTitle}** – ${episodeNumber}. rész elérhető!`,
      embeds: [
        {
          title: `🎬 ${safeTitle}`,
          description: `${epLine}\n\n[▶ Megnézem most!](${link})`,
          url: link,
          color: 0x7c3aed,
          image: image ? { url: image } : undefined,
          footer: { text: "AxelSub – Magyar feliratú animék" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const res = await axios.post(webhookUrl, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });
      return { ok: true, status: res.status };
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      console.warn(`[discord-webhook] hiba ${status || ""}:`, err.message, data || "");
      return { ok: false, status, error: err.message };
    }
  }

  const formatHuf = (n) =>
    new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

  // --- Episode notification helpers ---
  // Returns { users: [...], error: string | null }
  // Smart fetcher: tries auth.users admin endpoint, falls back to profiles table.
  async function fetchAllRegisteredUsers() {
    if (!SUPABASE_URL) return { users: [], error: "VITE_SUPABASE_URL nincs beállítva" };
    if (!SUPABASE_SERVICE_KEY) {
      return { users: [], error: "SUPABASE_SERVICE_ROLE_KEY nincs beállítva – állítsd be a Replit Secrets-ben, hogy a rendszer minden regisztrált felhasználót lásson." };
    }

    const out = [];
    const seen = new Set();

    // Primary: paginated auth.users admin endpoint (has email + id)
    let usedAuthAdmin = false;
    try {
      let page = 1;
      const perPage = 200;
      while (true) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
          headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        });
        if (!r.ok) {
          console.warn(`[fetchAllRegisteredUsers] auth.users page ${page} -> ${r.status}`);
          break;
        }
        usedAuthAdmin = true;
        const data = await r.json();
        const users = data.users || [];
        if (!users.length) break;
        for (const u of users) {
          if (!u.email || seen.has(u.id)) continue;
          seen.add(u.id);
          out.push({ email: u.email, name: u.email.split("@")[0], userId: u.id });
        }
        if (users.length < perPage) break;
        page++;
        if (page > 100) break;
      }
    } catch (e) {
      console.warn("[fetchAllRegisteredUsers] auth.users failed:", e.message);
    }

    // Fallback / enrichment: profiles table (paginated via Range header)
    // Always read profiles to enrich display names AND to catch users not returned by auth admin.
    try {
      const pageSize = 1000;
      let from = 0;
      const profilesById = new Map();
      while (true) {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=user_id,display_name,email&order=created_at.asc`,
          {
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              Range: `${from}-${from + pageSize - 1}`,
              "Range-Unit": "items",
              Prefer: "count=exact",
            },
          }
        );
        if (!r.ok) {
          console.warn(`[fetchAllRegisteredUsers] profiles range ${from} -> ${r.status}`);
          break;
        }
        const rows = await r.json();
        if (!rows.length) break;
        for (const p of rows) profilesById.set(p.user_id, p);
        if (rows.length < pageSize) break;
        from += pageSize;
        if (from > 100000) break;
      }

      // Enrich existing users with display names
      for (const u of out) {
        const p = profilesById.get(u.userId);
        if (p?.display_name) u.name = p.display_name;
      }

      // Add any profiles that weren't in the auth list (some setups don't expose admin/users)
      for (const [id, p] of profilesById) {
        if (seen.has(id)) continue;
        const email = p.email;
        if (!email) continue;
        seen.add(id);
        out.push({ email, name: p.display_name || email.split("@")[0], userId: id });
      }
    } catch (e) {
      console.warn("[fetchAllRegisteredUsers] profiles fallback failed:", e.message);
    }

    if (!out.length && !usedAuthAdmin) {
      return {
        users: [],
        error: "Nem sikerült lekérni a felhasználókat. Ellenőrizd a SUPABASE_SERVICE_ROLE_KEY-t.",
      };
    }
    return { users: out, error: null };
  }

  // Lightweight count from profiles table (works whenever service key is set)
  async function fetchUserCount() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`, {
        method: "HEAD",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
      });
      const cr = r.headers.get("content-range");
      if (!cr) return null;
      const total = parseInt(cr.split("/")[1], 10);
      return Number.isFinite(total) ? total : null;
    } catch (e) {
      console.warn("[fetchUserCount] failed:", e.message);
      return null;
    }
  }

  async function fetchAnimeSubscribers(animeId) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];

    const subsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/anime_subscriptions?anime_id=eq.${encodeURIComponent(animeId)}&select=user_id`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!subsRes.ok) return [];
    const subs = await subsRes.json();
    if (!subs.length) return [];

    const userIds = subs.map((s) => s.user_id).filter(Boolean);
    if (!userIds.length) return [];

    // Bulk fetch profiles in one request (much faster than per-user calls)
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${userIds.join(",")})&select=user_id,email,display_name`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const profilesById = new Map();
    if (profRes.ok) {
      const rows = await profRes.json();
      for (const p of rows) profilesById.set(p.user_id, p);
    }

    const results = [];
    const missingEmail = [];
    for (const user_id of userIds) {
      const p = profilesById.get(user_id);
      if (p?.email) {
        results.push({
          email: p.email,
          name: p.display_name || p.email.split("@")[0],
          userId: user_id,
        });
      } else {
        missingEmail.push(user_id);
      }
    }

    // For users without email in profiles, fall back to auth.users
    for (const user_id of missingEmail) {
      try {
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
          headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        });
        if (!userRes.ok) continue;
        const user = await userRes.json();
        if (!user.email) continue;
        const p = profilesById.get(user_id);
        results.push({
          email: user.email,
          name: p?.display_name || user.email.split("@")[0],
          userId: user_id,
        });
      } catch {
        continue;
      }
    }
    return results;
  }

  function buildUnsubscribeToken(userId, animeId) {
    return Buffer.from(JSON.stringify({ userId, animeId })).toString("base64url");
  }

  function buildEpisodeEmailHtml({ userName, animeTitle, episodeNumber, episodeLink, unsubscribeLink, isSubscriber = true }) {
    const t = escape(animeTitle);
    const u = escape(userName);
    const ep = Number(episodeNumber);
    return `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#13132a;border-radius:16px;overflow:hidden;border:1px solid #2a2a4a;">
  <tr>
    <td style="background:linear-gradient(135deg,#1a0a3a 0%,#2d1060 50%,#1a0a3a 100%);padding:36px 40px;text-align:center;border-bottom:1px solid #7c3aed44;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#a78bfa;letter-spacing:3px;text-transform:uppercase;">AxelSub</p>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">🎌 Új epizód érkezett!</h1>
      <p style="margin:10px 0 0;font-size:15px;color:#c4b5fd;">Magyar felirattal, csak neked 🎉</p>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px;">
      <p style="margin:0 0 6px;font-size:16px;color:#94a3b8;">Szia, <strong style="color:#e2e8f0;">${u}</strong>! 👋</p>
      <p style="margin:0 0 28px;font-size:15px;color:#94a3b8;line-height:1.6;">Friss epizód landolt az AxelSub-on – és ez pont az, amire vártál!</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e3a;border:1px solid #7c3aed44;border-radius:12px;overflow:hidden;margin-bottom:28px;">
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#7c3aed;letter-spacing:2px;text-transform:uppercase;">Új epizód</p>
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">${t}</h2>
            <p style="margin:0;font-size:15px;color:#a78bfa;font-weight:600;">🎬 &nbsp;${ep}. epizód</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 20px;">
            <div style="height:1px;background:linear-gradient(to right,#7c3aed44,transparent);margin-bottom:16px;"></div>
            <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.7;">A legújabb rész már elérhető magyar felirattal! Ne maradj le róla – kattints, ülj vissza kényelmesen, és élvezd az élményt. 🍿</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <a href="${episodeLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 4px 24px #7c3aed55;">▶&nbsp;&nbsp;Megnézem most!</a>
          </td>
        </tr>
      </table>
      <div style="height:1px;background:linear-gradient(to right,transparent,#7c3aed44,transparent);margin-bottom:28px;"></div>
      <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;text-align:center;">${isSubscriber ? `Ez az értesítés azért érkezett, mert feliratkoztál a(z) <strong style="color:#94a3b8;">${t}</strong> értesítéseire az AxelSub-on.` : `Ezt az értesítőt minden regisztrált AxelSub-tagnak küldjük. Iratkozz fel a(z) <strong style=\"color:#94a3b8;\">${t}</strong> oldalán, hogy közvetlenül értesítsünk a következő részekről!`}</p>
    </td>
  </tr>
  <tr>
    <td style="background:#0d0d1a;padding:24px 40px;border-top:1px solid #1e1e3a;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.6;">Ha nem szeretnél több értesítést kapni az új részekről, kattints ide: <a href="${unsubscribeLink}" style="color:#7c3aed;text-decoration:underline;">Leiratkozás</a></p>
      <p style="margin:8px 0 0;font-size:12px;color:#334155;">© 2025 <strong style="color:#7c3aed;">AxelSub</strong> &nbsp;·&nbsp; Magyar anime közösség</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
  }

  async function sendEmail({ to, subject, html, senderName = "AxelSub" }) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error("BREVO_API_KEY nincs beállítva");
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL nincs beállítva");
    const toList = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: toList,
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    return res.json();
  }

  // Fetch product images + categories and merge into order items.
  // Falls back gracefully if Supabase is unreachable — items just won't have images.
  const CATEGORY_LABEL = {
    polo: "Póló", "póló": "Póló",
    bogre: "Bögre", "bögre": "Bögre",
    matrica: "Matrica", poszter: "Poszter",
    kulcstarto: "Kulcstartó", "kulcstartó": "Kulcstartó",
    manga: "Manga", egyeb: "Egyéb", "egyéb": "Egyéb",
  };
  function formatCategory(c) {
    if (!c) return "Egyéb";
    return CATEGORY_LABEL[String(c).toLowerCase()] || (c.charAt(0).toUpperCase() + c.slice(1));
  }
  async function enrichOrderItems(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const ids = Array.from(new Set(items.map((i) => i && i.product_id).filter(Boolean)));
    if (!ids.length || !SUPABASE_URL || !SUPABASE_KEY) {
      return items.map((i) => ({ ...i, image: null, category: formatCategory(null) }));
    }
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/shop_products?id=in.(${ids.join(",")})&select=id,images,category`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const data = r.ok ? await r.json() : [];
      const map = new Map((data || []).map((p) => [p.id, p]));
      return items.map((i) => {
        const p = map.get(i.product_id) || {};
        return { ...i, image: (p.images && p.images[0]) || null, category: formatCategory(p.category) };
      });
    } catch (err) {
      console.warn("enrichOrderItems failed:", err.message);
      return items.map((i) => ({ ...i, image: null, category: formatCategory(null) }));
    }
  }
  function buildOrderItemsHtml(items) {
    return (items || []).map((i) => {
      const imgCell = i.image
        ? `<td style="width:72px;padding:8px 12px 8px 12px;vertical-align:top;"><img src="${String(i.image).replace(/"/g, "&quot;")}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #2a2a3a;display:block;"/></td>`
        : `<td style="width:72px;padding:8px 12px;vertical-align:top;"><div style="width:64px;height:64px;border-radius:8px;background:#1a1a2e;border:1px solid #2a2a3a;"></div></td>`;
      const cat = i.category ? `<div style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a78bfa;background:#7c3aed22;padding:2px 8px;border-radius:999px;margin-top:4px;">${i.category}</div>` : "";
      const note = i.custom_note ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;">📝 ${String(i.custom_note)}</div>` : "";
      return `<tr style="border-bottom:1px solid #2a2a3a;">
        ${imgCell}
        <td style="padding:8px 12px;vertical-align:top;color:#e2e8f0;">
          <div style="font-weight:600;">${i.product_name}</div>
          ${cat}
          <div style="font-size:13px;color:#94a3b8;margin-top:4px;">Mennyiség: <strong style="color:#e2e8f0;">${i.quantity}</strong> · Egységár: <strong style="color:#e2e8f0;">${formatHuf(i.product_price)}</strong></div>
          ${note}
        </td>
        <td style="padding:8px 12px;vertical-align:top;text-align:right;color:#a78bfa;font-weight:700;white-space:nowrap;">${formatHuf(i.product_price * i.quantity)}</td>
      </tr>`;
    }).join("");
  }

  app.post("/api/order-status-notify", async (req, res) => {
    try {
      const { order, items: rawItems, newStatus } = req.body;
      const items = await enrichOrderItems(rawItems);
      if (!order || !newStatus) return res.status(400).json({ ok: false, error: "Hiányzó adatok" });

      const itemsHtml = buildOrderItemsHtml(items);

      const statusMessages = {
        confirmed: {
          subject: "✅ Rendelésedet visszaigazoltuk – AxelSub Shop",
          heading: "Rendelésedet visszaigazoltuk! 🎉",
          body: `Szia <strong>${order.customer_name}</strong>!<br><br>Örömmel értesítünk, hogy rendelésedet visszaigazoltuk és hamarosan feldolgozzuk.`,
          badge: "Visszaigazolva",
          badgeColor: "#3b82f6",
        },
        shipped: {
          subject: "🚚 Csomagod úton van – AxelSub Shop",
          heading: "Csomagod úton van! 📦",
          body: `Szia <strong>${order.customer_name}</strong>!<br><br>Csomagod feladásra került${order.courier ? `, a nyomkövetési szám: <strong>${order.courier}</strong>` : ""}.`,
          badge: "Kiszállítva",
          badgeColor: "#a855f7",
        },
        done: {
          subject: "🏁 Rendelésedet teljesítettük – AxelSub Shop",
          heading: "Rendelésedet teljesítettük! ✅",
          body: `Szia <strong>${order.customer_name}</strong>!<br><br>Rendelésedet sikeresen teljesítettük. Reméljük elégedett vagy a vásárlással!`,
          badge: "Teljesítve",
          badgeColor: "#22c55e",
        },
      };

      const msg = statusMessages[newStatus];
      if (!msg) return res.json({ ok: true, skipped: true });

      const shippingLine = order.shipping_method === "post"
        ? `${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
        : "Személyes átvétel";

      const html = `
        <div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
          <h2 style="color:#a78bfa;margin-top:0">${msg.heading}</h2>
          <p style="margin-bottom:24px">${msg.body}</p>
          <div style="display:inline-block;background:${msg.badgeColor}22;color:${msg.badgeColor};border:1px solid ${msg.badgeColor}44;border-radius:8px;padding:6px 16px;font-size:14px;font-weight:bold;margin-bottom:24px">
            ${msg.badge}
          </div>
          <h3 style="color:#a78bfa;margin-bottom:8px">Rendelés részletei</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:4px 0;color:#94a3b8;width:140px">Szállítás:</td><td>${shippingLine}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Fizetési mód:</td><td>${order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz"}</td></tr>
            ${order.courier ? `<tr><td style="padding:4px 0;color:#94a3b8">Futár/nyomkövető:</td><td><strong style="color:#a78bfa">${order.courier}</strong></td></tr>` : ""}
            ${order.note ? `<tr><td style="padding:4px 0;color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
          </table>
          ${items?.length ? `
          <h3 style="color:#a78bfa;margin-bottom:8px">Rendelt termékek</h3>
          <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px">
            ${itemsHtml}
            <tr style="background:#2a2a3a">
              <td colspan="2" style="padding:10px 12px;font-weight:bold">Összesen</td>
              <td style="padding:10px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
            </tr>
          </table>` : ""}
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;border-top:1px solid #2a2a3a;padding-top:16px">
            Ha kérdésed van, keress minket Discord-on vagy a közösségi oldalainkon.<br>
            <strong style="color:#a78bfa">AxelSub</strong> – Magyar anime közösség
          </p>
        </div>`;

      await sendEmail({ to: order.customer_email, subject: msg.subject, html, senderName: "AxelSub Shop" });
      res.json({ ok: true });
    } catch (err) {
      console.error("Status email error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/order-notify", async (req, res) => {
    try {
      const { order, items: rawItems } = req.body;
      const items = await enrichOrderItems(rawItems);
      const itemsHtml = buildOrderItemsHtml(items);

      const adminHtml = `
        <div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px">
          <h2 style="color:#a78bfa;margin-top:0">🛍️ Új rendelés érkezett – AxelSub Shop</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:4px 0;color:#94a3b8;width:140px">Rendelő neve:</td><td><strong>${order.customer_name}</strong></td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Email:</td><td><a href="mailto:${order.customer_email}" style="color:#a78bfa">${order.customer_email}</a></td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Telefon:</td><td>${order.customer_phone || "–"}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Szállítás:</td><td>${order.shipping_method === "post" ? `Postai – ${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}` : "Személyes átvétel"}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Fizetés:</td><td>${order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz"}</td></tr>
            ${order.note ? `<tr><td style="padding:4px 0;color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
          </table>
          <h3 style="color:#a78bfa">Rendelt termékek</h3>
          <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden">
            ${itemsHtml}
            <tr style="background:#2a2a3a">
              <td colspan="2" style="padding:10px 12px;font-weight:bold">Összesen</td>
              <td style="padding:10px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
            </tr>
          </table>
        </div>`;

      const shippingLine = order.shipping_method === "post"
        ? `${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
        : "Személyes átvétel";
      const paymentLine = order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz";

      const orderUrl = `https://axelsub.eu/shop/order/${order.id}`;
      const customerHtml = `
        <div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
          <h2 style="color:#a78bfa;margin-top:0">Köszönjük a rendelésed! 🎉</h2>
          <p style="margin-bottom:16px">Szia <strong>${order.customer_name}</strong>!<br>Megkaptuk a rendelésedet, és hamarosan felvesszük veled a kapcsolatot.</p>
          <div style="text-align:center;margin:20px 0">
            <a href="${orderUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:50px">🔍 Rendelés megtekintése az oldalon</a>
          </div>
          <h3 style="color:#a78bfa;margin-bottom:8px">Rendelés részletei</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:4px 0;color:#94a3b8;width:140px">Szállítás:</td><td>${shippingLine}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Fizetési mód:</td><td>${paymentLine}</td></tr>
            ${order.note ? `<tr><td style="padding:4px 0;color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
          </table>
          <h3 style="color:#a78bfa;margin-bottom:8px">Rendelt termékek</h3>
          <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px">
            ${itemsHtml}
            <tr style="background:#2a2a3a">
              <td colspan="2" style="padding:10px 12px;font-weight:bold">Összesen</td>
              <td style="padding:10px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
            </tr>
          </table>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;border-top:1px solid #2a2a3a;padding-top:16px">
            Ha kérdésed van, keress minket Discord-on vagy a közösségi oldalainkon.<br>
            <strong style="color:#a78bfa">AxelSub</strong> – Magyar anime közösség
          </p>
        </div>`;

      await Promise.all([
        sendEmail({ to: NOTIFY_EMAILS, subject: `🛍️ Új rendelés: ${order.customer_name} – ${formatHuf(order.total_price)}`, html: adminHtml, senderName: "AxelSub Shop" }),
        sendEmail({ to: order.customer_email, subject: `✅ Rendelés visszaigazolás – AxelSub Shop`, html: customerHtml, senderName: "AxelSub Shop" }),
      ]);

      res.json({ ok: true });
    } catch (err) {
      console.error("Email error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/download-zip", (req, res) => {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="axelsub.zip"`);

    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("error", (err) => {
      console.error("archiver error:", err.message);
      if (!res.headersSent) res.status(500).send("ZIP létrehozás sikertelen");
    });

    archive.pipe(res);

    archive.glob("**/*", {
      cwd: ROOT,
      ignore: [
        "node_modules/**",
        ".git/**",
        "dist/**",
        ".cache/**",
        "coverage/**",
        "*.log",
        ".env.local",
      ],
      dot: true,
    });

    archive.finalize();
  });

  // --- Episode notification endpoint ---
  app.post("/api/episode-notify", async (req, res) => {
    try {
      const { animeId, animeTitle, episodeNumber, episodeTitle, animeSlug, imageUrl, notifyAllUsers, recipients: clientRecipients } = req.body;
      if (!animeId || !animeTitle || !episodeNumber) {
        return res.status(400).json({ ok: false, error: "Hiányzó adatok" });
      }

      // Fire-and-forget Discord notification to the "új rész" channel.
      // Runs in parallel with the email flow; never blocks the response.
      const discordPromise = sendDiscordEpisodeNotification({
        animeId,
        animeTitle,
        episodeNumber,
        episodeTitle,
        animeSlug,
        imageUrl,
        siteHost: req.headers.host,
      }).then((r) => {
        if (r.ok) {
          console.log(`[discord-webhook] elküldve – ${animeTitle} ${episodeNumber}. rész`);
        } else if (r.skipped) {
          console.log(`[discord-webhook] kihagyva: ${r.reason}`);
        }
        return r;
      });

      let recipients = [];
      let fetchError = null;

      // If the admin client already gathered the user list (via a SECURITY DEFINER
      // RPC, which works without the service role key), trust that list and only
      // merge subscriber flags. This is the path used when SUPABASE_SERVICE_ROLE_KEY
      // is unavailable.
      if (notifyAllUsers && Array.isArray(clientRecipients) && clientRecipients.length > 0) {
        const subs = await fetchAnimeSubscribers(animeId);
        const map = new Map();
        for (const u of clientRecipients) {
          if (!u || !u.email) continue;
          map.set(u.userId || u.user_id || u.email, {
            email: u.email,
            name: u.name || u.display_name || u.email.split("@")[0],
            userId: u.userId || u.user_id,
            isSubscriber: false,
          });
        }
        for (const s of subs) {
          const key = s.userId || s.email;
          map.set(key, { ...(map.get(key) || s), ...s, isSubscriber: true });
        }
        recipients = Array.from(map.values());
      } else if (notifyAllUsers) {
        const [allUsersResult, subs] = await Promise.all([
          fetchAllRegisteredUsers(),
          fetchAnimeSubscribers(animeId),
        ]);
        fetchError = allUsersResult.error;
        const map = new Map();
        for (const u of allUsersResult.users) map.set(u.userId, { ...u, isSubscriber: false });
        for (const s of subs) map.set(s.userId, { ...s, isSubscriber: true });
        recipients = Array.from(map.values());
      } else {
        recipients = (await fetchAnimeSubscribers(animeId)).map((s) => ({ ...s, isSubscriber: true }));
      }

      if (!recipients.length) {
        const discordResult = await discordPromise;
        return res.json({
          ok: true,
          sent: 0,
          total: 0,
          discord: discordResult,
          message: fetchError || (notifyAllUsers ? "Nincs regisztrált felhasználó" : "Nincs feliratkozó"),
          error: fetchError,
        });
      }

      const baseUrl = `https://${req.headers.host}`;
      const episodeLink = `${baseUrl}/anime/${animeSlug || animeId}`;
      const subject = `🎌 Új epizód: ${animeTitle} – ${episodeNumber}. rész!`;

      let sent = 0;
      for (const recipient of recipients) {
        try {
          const token = buildUnsubscribeToken(recipient.userId, animeId);
          const unsubscribeLink = `${baseUrl}/api/unsubscribe?token=${token}`;
          const html = buildEpisodeEmailHtml({
            userName: recipient.name,
            animeTitle,
            episodeNumber,
            episodeLink,
            unsubscribeLink,
            isSubscriber: recipient.isSubscriber,
          });
          await sendEmail({ to: recipient.email, subject, html });
          sent++;
        } catch (emailErr) {
          console.warn(`Email hiba (${recipient.email}):`, emailErr.message);
        }
      }

      console.log(`Episode notify (${notifyAllUsers ? "ALL" : "subs"}): ${sent}/${recipients.length} e-mail elküldve – ${animeTitle} ${episodeNumber}. rész`);
      const discordResult = await discordPromise;
      res.json({ ok: true, sent, total: recipients.length, mode: notifyAllUsers ? "all" : "subscribers", discord: discordResult });
    } catch (err) {
      console.error("Episode notify error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- Discord-only notification endpoint ---
  // Külön végpont, hogy az adminok a Discord-ra független módon küldhessenek
  // értesítőt (az email küldéstől teljesen elválasztva).
  app.post("/api/discord-notify", async (req, res) => {
    try {
      const { animeId, animeTitle, episodeNumber, episodeTitle, animeSlug, imageUrl } = req.body || {};
      if (!animeId || !animeTitle || !episodeNumber) {
        return res.status(400).json({ ok: false, error: "Hiányzó adatok (animeId, animeTitle, episodeNumber kötelező)" });
      }

      const result = await sendDiscordEpisodeNotification({
        animeId,
        animeTitle,
        episodeNumber,
        episodeTitle,
        animeSlug,
        imageUrl,
        siteHost: req.headers.host,
      });

      if (result.ok) {
        console.log(`[discord-notify] manuális küldés OK – ${animeTitle} ${episodeNumber}. rész`);
        return res.json({ ok: true, status: result.status, message: "Discord értesítő elküldve!" });
      }
      if (result.skipped) {
        return res.status(503).json({ ok: false, error: result.reason });
      }
      return res.status(502).json({
        ok: false,
        error: `Discord webhook hiba${result.status ? ` (${result.status})` : ""}: ${result.error || "ismeretlen"}`,
      });
    } catch (err) {
      console.error("[discord-notify] hiba:", err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- User stats (used by Admin dashboard for accurate user count) ---
  app.get("/api/user-stats", async (req, res) => {
    try {
      const total = await fetchUserCount();
      if (total == null) {
        return res.json({
          ok: false,
          total: 0,
          error: SUPABASE_SERVICE_KEY
            ? "Nem sikerült lekérni a felhasználói statisztikát."
            : "SUPABASE_SERVICE_ROLE_KEY nincs beállítva.",
        });
      }
      res.json({ ok: true, total });
    } catch (err) {
      console.error("user-stats error:", err.message);
      res.status(500).json({ ok: false, total: 0, error: err.message });
    }
  });

  // --- Notify a request submitter via email when status changes ---
  app.post("/api/notify-request-status", async (req, res) => {
    try {
      const { email, name, title, status, adminNote } = req.body || {};
      if (!email || !title || !status) {
        return res.status(400).json({ ok: false, error: "Hiányzó adatok" });
      }
      const isApproved = status === "approved";
      const isRejected = status === "rejected";
      const emoji = isApproved ? "✅" : isRejected ? "❌" : "⏳";
      const headline = isApproved
        ? "Elfogadtuk a kérésedet!"
        : isRejected
        ? "Sajnos elutasítottuk a kérésedet"
        : "A kérésed státusza frissült";
      const subject = `${emoji} ${headline} – ${title}`;
      const greetingName = name || (email.includes("@") ? email.split("@")[0] : "Felhasználó");
      const noteHtml = adminNote && String(adminNote).trim().length > 0
        ? `<p style="margin:16px 0;padding:12px 16px;background:#1f2937;border-left:3px solid #f97316;border-radius:6px;color:#e5e7eb;"><strong style="color:#fbbf24;">Admin megjegyzés:</strong><br>${String(adminNote).replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`
        : "";
      const baseUrl = `https://${req.headers.host}`;
      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#0b0f1a;font-family:Arial,sans-serif;color:#e5e7eb;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
<tr><td style="padding:24px 32px;background:linear-gradient(135deg,#7c3aed,#ec4899);">
<h1 style="margin:0;color:white;font-size:22px;">${emoji} AxelSub – Anime kérés</h1>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 12px 0;font-size:16px;">Szia <strong>${greetingName}</strong>!</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">${headline}</p>
<p style="margin:0 0 8px 0;font-size:18px;color:#fbbf24;"><strong>${title}</strong></p>
${noteHtml}
<p style="text-align:center;margin:24px 0;">
<a href="${baseUrl}/requests" style="display:inline-block;background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Kérések megtekintése</a>
</p>
<p style="margin:24px 0 0 0;font-size:13px;color:#9ca3af;text-align:center;">Köszönjük, hogy az AxelSub-ot használod! 🎌</p>
</td></tr>
</table>
</td></tr></table></body></html>`;
      await sendEmail({ to: email, subject, html });
      res.json({ ok: true });
    } catch (err) {
      console.error("notify-request-status error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- Notify admins/moderators about a new anime request ---
  app.post("/api/notify-admins-new-request", async (req, res) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ ok: false, error: "Supabase service key nincs beállítva" });
      }
      const { requestId, title, requesterEmail } = req.body || {};
      if (!title) return res.status(400).json({ ok: false, error: "Hiányzó cím" });

      // Fetch admin + moderator user_ids
      const rolesResp = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?role=in.(admin,moderator)&select=user_id`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      if (!rolesResp.ok) {
        const text = await rolesResp.text();
        return res.status(500).json({ ok: false, error: `user_roles: ${text}` });
      }
      const roles = await rolesResp.json();
      const userIds = [...new Set((roles || []).map((r) => r.user_id).filter(Boolean))];
      if (userIds.length === 0) return res.json({ ok: true, notified: 0 });

      const rows = userIds.map((uid) => ({
        user_id: uid,
        type: "system",
        title: "Új anime kérés",
        message: `${requesterEmail ? requesterEmail + " kért: " : ""}${title}`,
        link: "/requests",
        is_read: false,
      }));

      const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(rows),
      });
      if (!insertResp.ok) {
        const text = await insertResp.text();
        return res.status(500).json({ ok: false, error: `notifications insert: ${text}` });
      }
      res.json({ ok: true, notified: userIds.length });
    } catch (err) {
      console.error("notify-admins-new-request error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- Custom email send (admin) ---
  app.post("/api/send-custom-email", async (req, res) => {
    try {
      const { to, subject, htmlContent } = req.body;
      if (!to || !subject || !htmlContent) return res.status(400).json({ ok: false, error: "Hiányzó adatok" });
      await sendEmail({ to, subject, html: htmlContent });
      res.json({ ok: true });
    } catch (err) {
      console.error("Custom email error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- Unsubscribe endpoint ---
  app.get("/api/unsubscribe", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).send("Érvénytelen leiratkozási link.");

      let payload;
      try {
        payload = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
      } catch {
        return res.status(400).send("Érvénytelen leiratkozási token.");
      }

      const { userId, animeId } = payload;
      if (!userId || !animeId) return res.status(400).send("Hibás token adatok.");

      const delRes = await fetch(
        `${SUPABASE_URL}/rest/v1/anime_subscriptions?user_id=eq.${userId}&anime_id=eq.${animeId}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );

      if (!delRes.ok) {
        return res.status(500).send("Hiba a leiratkozás során. Kérjük próbáld újra.");
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"/>
<title>Leiratkozva – AxelSub</title>
<style>body{margin:0;background:#0d0d1a;font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#13132a;border:1px solid #2a2a4a;border-radius:16px;padding:48px 40px;text-align:center;max-width:480px;}
h1{color:#fff;font-size:24px;margin:0 0 12px;}p{color:#94a3b8;font-size:15px;margin:0 0 24px;}
a{display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:700;font-size:14px;}</style>
</head><body><div class="card">
<p style="font-size:48px;margin:0 0 16px;">✅</p>
<h1>Sikeresen leiratkoztál!</h1>
<p>Nem küldünk több értesítést erről az animéről. Bármikor újra feliratkozhatsz az anime oldalán.</p>
<a href="/">Vissza az oldalra</a>
</div></body></html>`);
    } catch (err) {
      console.error("Unsubscribe error:", err.message);
      res.status(500).send("Belső hiba. Kérjük próbáld újra.");
    }
  });

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const extractId = (slug) => { const m = slug.match(UUID_RE); return m ? m[0] : slug; };

  app.get("/anime/:slug", (req, res, next) =>
    handleBotRequest(req, res, next, { table: "animes", id: extractId(req.params.slug) })
  );

  app.get("/manga/:slug", (req, res, next) =>
    handleBotRequest(req, res, next, { table: "mangas", id: extractId(req.params.slug) })
  );

  if (!isProd) {
    app.use(vite.middlewares);
  } else {
    app.get("*", (req, res) => {
      res.setHeader("Content-Type", "text/html");
      res.end(prodTemplate);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AxelSub SSR server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});
