const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

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

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
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
    if (!delRes.ok) return res.status(500).send("Hiba a leiratkozás során. Kérjük próbáld újra.");
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
}
