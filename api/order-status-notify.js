import { sendEmail, setCors } from "./_helpers.js";

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { order, newStatus } = req.body;
    if (!order || !newStatus) return res.status(400).json({ ok: false, error: "Hiányzó adatok" });

    const statusMessages = {
      confirmed: {
        subject: "✅ Rendelésedet visszaigazoltuk – AxelSub Shop",
        heading: "Rendelésedet visszaigazoltuk! 🎉",
        body: `Szia <strong>${order.customer_name}</strong>!<br>Örömmel értesítünk, hogy rendelésedet visszaigazoltuk és hamarosan feldolgozzuk.`,
        badge: "Visszaigazolva", badgeColor: "#3b82f6",
      },
      shipped: {
        subject: "🚚 Csomagod úton van – AxelSub Shop",
        heading: "Csomagod úton van! 📦",
        body: `Szia <strong>${order.customer_name}</strong>!<br>Csomagod feladásra került${order.courier ? `, a nyomkövetési szám: <strong>${order.courier}</strong>` : ""}.`,
        badge: "Kiszállítva", badgeColor: "#a855f7",
      },
      done: {
        subject: "🏁 Rendelésedet teljesítettük – AxelSub Shop",
        heading: "Rendelésedet teljesítettük! ✅",
        body: `Szia <strong>${order.customer_name}</strong>!<br>Rendelésedet sikeresen teljesítettük. Reméljük elégedett vagy!`,
        badge: "Teljesítve", badgeColor: "#22c55e",
      },
    };

    const msg = statusMessages[newStatus];
    if (!msg) return res.json({ ok: true, skipped: true });

    const html = `<div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
<h2 style="color:#a78bfa;margin-top:0">${msg.heading}</h2>
<p>${msg.body}</p>
<div style="display:inline-block;background:${msg.badgeColor}22;color:${msg.badgeColor};border:1px solid ${msg.badgeColor}44;border-radius:8px;padding:6px 16px;font-size:14px;font-weight:bold;margin-bottom:24px">
  ${msg.badge}
</div>
<p style="color:#94a3b8;font-size:13px;margin-top:24px;border-top:1px solid #2a2a3a;padding-top:16px">
Ha kérdésed van, keress minket a közösségi oldalainkon.<br>
<strong style="color:#a78bfa">AxelSub</strong> – Magyar anime közösség
</p></div>`;

    await sendEmail({ to: order.customer_email, subject: msg.subject, html, senderName: "AxelSub Shop" });
    res.json({ ok: true });
  } catch (err) {
    console.error("order-status-notify error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
