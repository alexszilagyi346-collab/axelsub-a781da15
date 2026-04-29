import { sendDiscordEpisodeNotification, setCors } from "./_helpers.js";

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

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
    console.error("discord-notify error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
