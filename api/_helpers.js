export const formatHuf = (n) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

export async function sendEmail({ to, subject, html, senderName = "AxelSub" }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY nincs beállítva");
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL nincs beállítva");
  const toList = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: { name: senderName, email: senderEmail }, to: toList, subject, htmlContent: html }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchAnimeSubscribers(animeId) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

export async function fetchAllRegisteredUsers() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];

  const results = [];
  const seen = new Set();
  let page = 1;
  const perPage = 200;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const users = data.users || [];
    if (!users.length) break;

    const ids = users.map((u) => u.id).filter(Boolean);
    let profilesMap = new Map();
    if (ids.length) {
      const profRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=in.(${ids.join(",")})&select=id,display_name`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      if (profRes.ok) {
        const profiles = await profRes.json();
        profilesMap = new Map(profiles.map((p) => [p.id, p.display_name]));
      }
    }

    for (const u of users) {
      if (!u.email || seen.has(u.id)) continue;
      seen.add(u.id);
      const name = profilesMap.get(u.id) || u.email.split("@")[0];
      results.push({ email: u.email, name, userId: u.id });
    }

    if (users.length < perPage) break;
    page++;
    if (page > 50) break;
  }

  return results;
}

// --- Discord webhook helper (works on Vercel too) ---
async function fetchAnimeMeta(animeId) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY || !animeId) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/animes?id=eq.${encodeURIComponent(animeId)}&select=title,image_url`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function sendDiscordEpisodeNotification({
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
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text || res.statusText };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function setCors(res, req) {
  const ALLOWED = [
    "https://axelsub.eu",
    "https://www.axelsub.eu",
    "https://axelsub.lovable.app",
  ];
  const origin = req.headers.origin || "";
  const isReplit = origin.endsWith(".replit.dev") || origin.endsWith(".repl.co");
  if (isReplit || ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}
