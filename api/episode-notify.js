import { sendEmail, fetchAnimeSubscribers, setCors } from "./_helpers.js";

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

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
    console.error("episode-notify error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
