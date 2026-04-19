import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";

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

  const NOTIFY_EMAILS = ["alexszilagyi26@gmail.com", "davidbotos1998@gmail.com"];

  const formatHuf = (n) =>
    new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

  // --- Episode notification helpers ---
  async function fetchAnimeSubscribers(animeId) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];

    const subsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/anime_subscriptions?anime_id=eq.${encodeURIComponent(animeId)}&select=user_id`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!subsRes.ok) return [];
    const subs = await subsRes.json();
    if (!subs.length) return [];

    const results = [];
    for (const { user_id } of subs) {
      try {
        const [userRes, profileRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
            headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=display_name`, {
            headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          }),
        ]);

        if (!userRes.ok) continue;
        const user = await userRes.json();
        if (!user.email) continue;

        let displayName = user.email.split("@")[0];
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          if (profiles[0]?.display_name) displayName = profiles[0].display_name;
        }

        results.push({ email: user.email, name: displayName, userId: user_id });
      } catch {
        continue;
      }
    }
    return results;
  }

  function buildUnsubscribeToken(userId, animeId) {
    return Buffer.from(JSON.stringify({ userId, animeId })).toString("base64url");
  }

  function buildEpisodeEmailHtml({ userName, animeTitle, episodeNumber, episodeLink, unsubscribeLink }) {
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
      <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;text-align:center;">Ez az értesítés azért érkezett, mert feliratkoztál a(z) <strong style="color:#94a3b8;">${t}</strong> értesítéseire az AxelSub-on.</p>
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

  app.post("/api/order-status-notify", async (req, res) => {
    try {
      const { order, items, newStatus } = req.body;
      if (!order || !newStatus) return res.status(400).json({ ok: false, error: "Hiányzó adatok" });

      const itemsHtml = (items || []).map(
        (i) => `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a">${i.product_name} × ${i.quantity}${i.custom_note ? ` <em>(${i.custom_note})</em>` : ""}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a;text-align:right">${formatHuf(i.product_price * i.quantity)}</td>
        </tr>`
      ).join("");

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
              <td style="padding:8px 12px;font-weight:bold">Összesen</td>
              <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
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
      const { order, items } = req.body;

      const itemsHtml = (items || []).map(
        (i) => `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a">${i.product_name} × ${i.quantity}${i.custom_note ? ` <em>(${i.custom_note})</em>` : ""}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a;text-align:right">${formatHuf(i.product_price * i.quantity)}</td>
        </tr>`
      ).join("");

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
              <td style="padding:8px 12px;font-weight:bold">Összesen</td>
              <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
            </tr>
          </table>
        </div>`;

      const shippingLine = order.shipping_method === "post"
        ? `${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
        : "Személyes átvétel";
      const paymentLine = order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz";

      const customerHtml = `
        <div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
          <h2 style="color:#a78bfa;margin-top:0">Köszönjük a rendelésed! 🎉</h2>
          <p style="margin-bottom:24px">Szia <strong>${order.customer_name}</strong>!<br>Megkaptuk a rendelésedet, és hamarosan felvesszük veled a kapcsolatot.</p>
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
              <td style="padding:8px 12px;font-weight:bold">Összesen</td>
              <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
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
      const { animeId, animeTitle, episodeNumber, animeSlug } = req.body;
      if (!animeId || !animeTitle || !episodeNumber) {
        return res.status(400).json({ ok: false, error: "Hiányzó adatok" });
      }

      const subscribers = await fetchAnimeSubscribers(animeId);
      if (!subscribers.length) {
        return res.json({ ok: true, sent: 0, message: "Nincs feliratkozó" });
      }

      const baseUrl = `https://${req.headers.host}`;
      const episodeLink = `${baseUrl}/anime/${animeSlug || animeId}`;
      const subject = `🎌 Új epizód: ${animeTitle} – ${episodeNumber}. rész!`;

      let sent = 0;
      for (const subscriber of subscribers) {
        try {
          const token = buildUnsubscribeToken(subscriber.userId, animeId);
          const unsubscribeLink = `${baseUrl}/api/unsubscribe?token=${token}`;
          const html = buildEpisodeEmailHtml({
            userName: subscriber.name,
            animeTitle,
            episodeNumber,
            episodeLink,
            unsubscribeLink,
          });
          await sendEmail({ to: subscriber.email, subject, html });
          sent++;
        } catch (emailErr) {
          console.warn(`Email hiba (${subscriber.email}):`, emailErr.message);
        }
      }

      console.log(`Episode notify: ${sent}/${subscribers.length} e-mail elküldve – ${animeTitle} ${episodeNumber}. rész`);
      res.json({ ok: true, sent, total: subscribers.length });
    } catch (err) {
      console.error("Episode notify error:", err.message);
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
