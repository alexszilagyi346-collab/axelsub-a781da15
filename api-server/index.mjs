import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  "https://axelsub.eu",
  "https://www.axelsub.eu",
  "https://axelsub.lovable.app",
];

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api", (req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const formatHuf = (n) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

async function sendEmail({ to, subject, html, senderName = "AxelSub" }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY nincs beállítva");
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL nincs beállítva");
  const toList = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
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
    } catch { continue; }
  }
  return results;
}

const NOTIFY_EMAILS = ["alexszilagyi26@gmail.com", "davidbotos1998@gmail.com"];

app.get("/api/health", (req, res) => res.json({ ok: true, service: "AxelSub API" }));

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

app.post("/api/episode-notify", async (req, res) => {
  try {
    const { animeId, animeTitle, episodeNumber, animeSlug } = req.body;
    if (!animeId || !animeTitle || !episodeNumber)
      return res.status(400).json({ ok: false, error: "Hiányzó adatok" });

    const subscribers = await fetchAnimeSubscribers(animeId);
    if (!subscribers.length) return res.json({ ok: true, sent: 0, message: "Nincs feliratkozó" });

    const baseUrl = "https://axelsub.eu";
    const episodeLink = `${baseUrl}/anime/${animeSlug || animeId}`;
    const subject = `🎌 Új epizód: ${animeTitle} – ${episodeNumber}. rész!`;
    let sent = 0;

    for (const subscriber of subscribers) {
      try {
        const token = Buffer.from(JSON.stringify({ userId: subscriber.userId, animeId })).toString("base64url");
        const unsubscribeLink = `${baseUrl}/api/unsubscribe?token=${token}`;
        const html = `<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#13132a;border-radius:16px;overflow:hidden;border:1px solid #2a2a4a;">
<tr><td style="background:linear-gradient(135deg,#1a0a3a,#2d1060,#1a0a3a);padding:36px 40px;text-align:center;">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;">🎌 Új epizód érkezett!</h1>
<p style="margin:10px 0 0;font-size:15px;color:#c4b5fd;">Magyar felirattal, csak neked 🎉</p>
</td></tr>
<tr><td style="padding:36px 40px;">
<p style="margin:0 0 20px;font-size:16px;">Szia, <strong>${subscriber.name}</strong>! 👋</p>
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">${animeTitle}</h2>
<p style="margin:0 0 28px;font-size:15px;color:#a78bfa;font-weight:600;">🎬 &nbsp;${episodeNumber}. epizód</p>
<table width="100%"><tr><td align="center" style="padding-bottom:32px;">
<a href="${episodeLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;">▶&nbsp;&nbsp;Megnézem most!</a>
</td></tr></table>
<p style="margin:0;font-size:13px;color:#475569;text-align:center;">
Leiratkozás: <a href="${unsubscribeLink}" style="color:#7c3aed;">kattints ide</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
        await sendEmail({ to: subscriber.email, subject, html });
        sent++;
      } catch (emailErr) {
        console.warn(`Email hiba (${subscriber.email}):`, emailErr.message);
      }
    }
    res.json({ ok: true, sent, total: subscribers.length });
  } catch (err) {
    console.error("Episode notify error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/order-notify", async (req, res) => {
  try {
    const { order, items } = req.body;
    if (!order) return res.status(400).json({ ok: false, error: "Hiányzó adatok" });

    const itemsHtml = (items || []).map(
      (i) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #2a2a3a">${i.product_name} × ${i.quantity}</td>
               <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a;text-align:right">${formatHuf(i.product_price * i.quantity)}</td></tr>`
    ).join("");

    const shippingLine = order.shipping_method === "post"
      ? `${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
      : "Személyes átvétel";
    const paymentLine = order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz";

    const adminHtml = `<div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px">
<h2 style="color:#a78bfa;margin-top:0">🛍️ Új rendelés – AxelSub Shop</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
<tr><td style="color:#94a3b8;width:140px">Rendelő:</td><td><strong>${order.customer_name}</strong></td></tr>
<tr><td style="color:#94a3b8">Email:</td><td>${order.customer_email}</td></tr>
<tr><td style="color:#94a3b8">Szállítás:</td><td>${shippingLine}</td></tr>
<tr><td style="color:#94a3b8">Fizetés:</td><td>${paymentLine}</td></tr>
${order.note ? `<tr><td style="color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
</table>
<table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden">
${itemsHtml}
<tr style="background:#2a2a3a"><td style="padding:8px 12px;font-weight:bold">Összesen</td>
<td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td></tr>
</table></div>`;

    const customerHtml = `<div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
<h2 style="color:#a78bfa;margin-top:0">Köszönjük a rendelésed! 🎉</h2>
<p>Szia <strong>${order.customer_name}</strong>! Megkaptuk a rendelésedet.</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
<tr><td style="color:#94a3b8;width:140px">Szállítás:</td><td>${shippingLine}</td></tr>
<tr><td style="color:#94a3b8">Fizetési mód:</td><td>${paymentLine}</td></tr>
${order.note ? `<tr><td style="color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
</table>
<table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px">
${itemsHtml}
<tr style="background:#2a2a3a"><td style="padding:8px 12px;font-weight:bold">Összesen</td>
<td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td></tr>
</table>
<p style="color:#94a3b8;font-size:13px;border-top:1px solid #2a2a3a;padding-top:16px"><strong style="color:#a78bfa">AxelSub</strong> – Magyar anime közösség</p>
</div>`;

    await Promise.all([
      sendEmail({ to: NOTIFY_EMAILS, subject: `🛍️ Új rendelés: ${order.customer_name} – ${formatHuf(order.total_price)}`, html: adminHtml, senderName: "AxelSub Shop" }),
      sendEmail({ to: order.customer_email, subject: `✅ Rendelés visszaigazolás – AxelSub Shop`, html: customerHtml, senderName: "AxelSub Shop" }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Order notify error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/order-status-notify", async (req, res) => {
  try {
    const { order, items, newStatus } = req.body;
    if (!order || !newStatus) return res.status(400).json({ ok: false, error: "Hiányzó adatok" });

    const statusMessages = {
      confirmed: { subject: "✅ Rendelésedet visszaigazoltuk – AxelSub Shop", heading: "Rendelésedet visszaigazoltuk! 🎉", body: `Szia <strong>${order.customer_name}</strong>! Rendelésedet visszaigazoltuk.` },
      shipped: { subject: "🚚 Csomagod úton van – AxelSub Shop", heading: "Csomagod úton van! 📦", body: `Szia <strong>${order.customer_name}</strong>! Csomagod feladásra került.` },
      done: { subject: "🏁 Rendelésedet teljesítettük – AxelSub Shop", heading: "Rendelésedet teljesítettük! ✅", body: `Szia <strong>${order.customer_name}</strong>! Rendelésedet sikeresen teljesítettük.` },
    };

    const msg = statusMessages[newStatus];
    if (!msg) return res.json({ ok: true, skipped: true });

    const html = `<div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
<h2 style="color:#a78bfa;margin-top:0">${msg.heading}</h2>
<p>${msg.body}</p>
<p style="color:#94a3b8;font-size:13px;margin-top:24px;border-top:1px solid #2a2a3a;padding-top:16px"><strong style="color:#a78bfa">AxelSub</strong> – Magyar anime közösség</p>
</div>`;

    await sendEmail({ to: order.customer_email, subject: msg.subject, html, senderName: "AxelSub Shop" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Status email error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`AxelSub API szerver fut: http://0.0.0.0:${PORT}`);
});
